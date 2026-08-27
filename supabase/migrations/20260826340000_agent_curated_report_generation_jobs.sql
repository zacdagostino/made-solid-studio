-- Report generation is a durable worker job. GPT-5.6 Sol chooses the strongest design story from
-- verified candidate pairs; database and worker code retain exact evidence, viewport and release
-- gates. The browser can observe, retry and cooperatively cancel without owning model credentials.

create table public.report_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  audit_id uuid not null references public.audits on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs on delete cascade,
  release_attestation_id uuid not null references public.source_release_attestations on delete restrict,
  requested_by uuid references auth.users on delete set null,
  generator_contract_version text not null default 'client-value-report-agent-v1',
  model text not null default 'gpt-5.6-sol',
  reasoning_effort text not null default 'max',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'cancelled')),
  progress_phase text not null default 'queued',
  progress_detail text not null default 'Waiting for the protected report generation worker.',
  total_items integer not null default 5 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  result_report_version_id uuid references public.decision_report_versions on delete set null,
  error_code text,
  error_summary text,
  error_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id, audit_id, release_attestation_id, generator_contract_version)
);

create index report_generation_jobs_queue_idx
  on public.report_generation_jobs(status, lease_expires_at, created_at);
create index report_generation_jobs_business_idx
  on public.report_generation_jobs(business_id, created_at desc);

alter table public.report_generation_jobs enable row level security;
create policy "Members can view report generation jobs"
  on public.report_generation_jobs for select to authenticated
  using (public.is_organization_member(organization_id));

alter table public.worker_runtime_heartbeats
  drop constraint if exists worker_runtime_heartbeats_worker_kind_check;
alter table public.worker_runtime_heartbeats
  add constraint worker_runtime_heartbeats_worker_kind_check
  check (worker_kind in (
    'builder', 'github_workspace', 'made_solid_handoff', 'report_preview', 'report_generation'
  ));

create or replace function public.report_generation_worker_available()
returns boolean language plpgsql security definer set search_path = public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  return exists (
    select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'report_generation' and heartbeat_at >= now() - interval '45 seconds'
  );
end;
$$;

create or replace function public.request_report_generation(
  target_business_id uuid,
  target_audit_id uuid
)
returns setof public.report_generation_jobs
language plpgsql security definer set search_path = public as $$
declare
  target_business public.businesses;
  target_audit public.audits;
  target_release public.source_release_attestations;
  existing_job public.report_generation_jobs;
begin
  select * into target_business from public.businesses where id = target_business_id;
  if target_business.id is null or not public.is_organization_member(target_business.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  select * into target_audit from public.audits
  where id = target_audit_id and business_id = target_business_id and status = 'ready';
  if target_audit.id is null then raise exception 'A completed current audit is required.'; end if;
  if target_audit.crawl_run_id is distinct from (
    select runs.id from public.crawl_runs runs
    join public.websites websites on websites.id = runs.website_id
    where websites.business_id = target_business_id and runs.status = 'ready'
    order by runs.completed_at desc nulls last, runs.requested_at desc limit 1
  ) then raise exception 'The report audit must use the latest completed website capture.'; end if;
  if (select count(*) from public.audit_specialist_tasks tasks
      where tasks.audit_id = target_audit.id and tasks.crawl_run_id = target_audit.crawl_run_id
        and tasks.status = 'ready') <> 6 then
    raise exception 'All six report evidence specialists must finish first.';
  end if;
  select * into target_release from public.source_release_attestations attestations
  where attestations.organization_id = target_business.organization_id
    and attestations.business_id = target_business_id
    and public.release_attestation_checks_passed(attestations.checks)
  order by attestations.verified_at desc limit 1;
  if target_release.id is null then
    raise exception 'The exact current edited website must pass release verification first.';
  end if;
  if not exists (
    select 1 from public.audit_observations observations
    join public.artifacts original on original.id = any(observations.evidence_artifact_ids)
    join public.artifacts redesigned on redesigned.business_id = target_business_id
      and redesigned.crawl_run_id = target_audit.crawl_run_id
      and redesigned.kind = 'screenshot'
      and redesigned.metadata->>'evidenceKind' = 'edited-site-comparison'
      and redesigned.metadata->>'releaseAttestationId' = target_release.id::text
      and redesigned.metadata->>'originalArtifactId' = original.id::text
      and redesigned.metadata->>'captureContract' = 'verified-comparison-page-ready-v1'
      and redesigned.metadata->>'captureStatus' = 'passed'
      and redesigned.metadata->>'pageReady' = 'true'
      and redesigned.metadata->>'loaderVisible' = 'false'
      and coalesce(redesigned.metadata->>'horizontalOverflowPx', '') ~ '^[0-9]+$'
      and (redesigned.metadata->>'horizontalOverflowPx')::integer <= 1
    where observations.audit_id = target_audit.id
      and observations.crawl_run_id = target_audit.crawl_run_id
      and observations.area <> 'Platform'
      and observations.confidence in ('high', 'medium')
      and observations.review_state <> 'blocked'
      and original.business_id = target_business_id
      and original.crawl_run_id = target_audit.crawl_run_id
      and original.kind = 'screenshot'
  ) then
    raise exception 'No verified before-and-after comparison candidates are available. Run release verification again.';
  end if;
  if not exists (select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'report_generation' and heartbeat_at >= now() - interval '45 seconds') then
    raise exception 'Report generation is not connected. Start the protected report worker and try again.';
  end if;

  -- Serialize equivalent browser effects, refreshes and tabs before checking the immutable job key.
  perform 1 from public.businesses where id = target_business_id for update;

  select * into existing_job from public.report_generation_jobs
  where business_id = target_business_id and audit_id = target_audit.id
    and release_attestation_id = target_release.id
    and generator_contract_version = 'client-value-report-agent-v1'
  for update;
  if existing_job.id is not null and existing_job.status in ('queued', 'running', 'ready') then
    return next existing_job; return;
  end if;
  if existing_job.id is not null then
    return query update public.report_generation_jobs set
      status = 'queued', progress_phase = 'queued',
      progress_detail = 'Waiting for the protected report generation worker.',
      completed_items = 0, cancel_requested_at = null, worker_id = null,
      lease_expires_at = null, attempt_count = 0, result_report_version_id = null,
      error_code = null, error_summary = null, error_context = '{}'::jsonb,
      started_at = null, completed_at = null, updated_at = now()
    where id = existing_job.id returning *;
    return;
  end if;
  return query insert into public.report_generation_jobs (
    organization_id, business_id, audit_id, crawl_run_id, release_attestation_id, requested_by
  ) values (
    target_business.organization_id, target_business_id, target_audit.id,
    target_audit.crawl_run_id, target_release.id, auth.uid()
  ) returning *;
end;
$$;

create or replace function public.cancel_report_generation(target_job_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_job public.report_generation_jobs;
begin
  select * into target_job from public.report_generation_jobs where id = target_job_id;
  if target_job.id is null or not public.is_organization_member(target_job.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_job.status not in ('queued', 'running') then return; end if;
  update public.report_generation_jobs set
    cancel_requested_at = now(),
    status = case when status = 'queued' then 'cancelled' else status end,
    progress_phase = case when status = 'queued' then 'cancelled' else progress_phase end,
    progress_detail = 'Cancellation requested. Generation will stop at its next safe checkpoint.',
    completed_at = case when status = 'queued' then now() else completed_at end,
    updated_at = now()
  where id = target_job.id;
end;
$$;

create or replace function public.claim_next_report_generation(worker_identity text)
returns setof public.report_generation_jobs
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  update public.report_generation_jobs set status = 'cancelled', progress_phase = 'cancelled',
    progress_detail = 'Generation stopped after its worker lease ended.', completed_at = now(),
    worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is not null and lease_expires_at < now();
  update public.report_generation_jobs set status = 'failed', progress_phase = 'failed',
    progress_detail = 'Generation stopped after three worker attempts.', error_code = 'worker_retries_exhausted',
    error_summary = 'The protected report worker did not complete after three attempts.',
    completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is null
    and lease_expires_at < now() and attempt_count >= 3;
  return query with candidate as (
    select id from public.report_generation_jobs
    where (status = 'queued' or (status = 'running' and lease_expires_at < now()))
      and cancel_requested_at is null and attempt_count < 3
    order by created_at for update skip locked limit 1
  ) update public.report_generation_jobs jobs set
    status = 'running', started_at = coalesce(started_at, now()), worker_id = trim(worker_identity),
    lease_expires_at = now() + interval '8 minutes', attempt_count = attempt_count + 1,
    progress_phase = 'loading_evidence', progress_detail = 'Loading verified comparison candidates.',
    error_code = null, error_summary = null, error_context = '{}'::jsonb, updated_at = now()
  from candidate where jobs.id = candidate.id returning jobs.*;
end;
$$;

create or replace function public.heartbeat_report_generation_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  insert into public.worker_runtime_heartbeats (worker_kind, worker_id, started_at, heartbeat_at)
  values ('report_generation', trim(worker_identity), now(), now())
  on conflict (worker_kind) do update set worker_id = excluded.worker_id,
    started_at = case when worker_runtime_heartbeats.worker_id = excluded.worker_id
      then worker_runtime_heartbeats.started_at else now() end, heartbeat_at = now();
end;
$$;

create or replace function public.release_report_generation_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  delete from public.worker_runtime_heartbeats
  where worker_kind = 'report_generation' and worker_id = trim(worker_identity);
end;
$$;

revoke all on function public.request_report_generation(uuid, uuid) from public, anon;
revoke all on function public.cancel_report_generation(uuid) from public, anon;
revoke all on function public.claim_next_report_generation(text) from public, anon, authenticated;
revoke all on function public.heartbeat_report_generation_worker(text) from public, anon, authenticated;
revoke all on function public.release_report_generation_worker(text) from public, anon, authenticated;
revoke all on function public.report_generation_worker_available() from public, anon;
grant execute on function public.request_report_generation(uuid, uuid) to authenticated;
grant execute on function public.cancel_report_generation(uuid) to authenticated;
grant execute on function public.claim_next_report_generation(text) to service_role;
grant execute on function public.heartbeat_report_generation_worker(text) to service_role;
grant execute on function public.release_report_generation_worker(text) to service_role;
grant execute on function public.report_generation_worker_available() to authenticated;

-- Only the new evidence-bound, agent-curated report can enter the separate Clientspace renderer.
create or replace function public.request_report_preview(target_report_version_id uuid)
returns setof public.report_preview_jobs
language plpgsql security definer set search_path = public as $$
declare
  target_report public.decision_report_versions;
  target_attestation public.source_release_attestations;
  existing_job public.report_preview_jobs;
begin
  select * into target_report from public.decision_report_versions where id = target_report_version_id;
  if target_report.id is null or not public.is_organization_member(target_report.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_report.review_state <> 'approved' or target_report.schema_version <> 9
     or target_report.data->>'reportKind' <> 'verified_redesign_value'
     or target_report.data->>'generatorRevision' <> 'gpt-5.6-sol-design-curation-v1' then
    raise exception 'This earlier report format must be regenerated before Clientspace preview.';
  end if;
  if jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) > 4
     or exists (
       select 1 from jsonb_array_elements(target_report.data->'valueThemes') theme
       where coalesce(theme#>>'{evidence,artifactId}', '') = ''
         or coalesce(theme#>>'{afterEvidence,artifactId}', '') = ''
         or theme#>>'{afterEvidence,verification,status}' <> 'passed'
         or theme#>>'{afterEvidence,verification,captureContract}' <>
           'verified-comparison-page-ready-v1'
         or theme#>>'{afterEvidence,verification,pageReady}' <> 'true'
         or theme#>>'{afterEvidence,verification,loaderVisible}' <> 'false'
         or theme#>>'{afterEvidence,verification,sameViewport}' <> 'true'
         or coalesce(theme#>>'{afterEvidence,verification,redesignedHorizontalOverflowPx}', '') !~ '^[0-9]+$'
         or (theme#>>'{afterEvidence,verification,redesignedHorizontalOverflowPx}')::integer > 1
     ) then
    raise exception 'The client report must contain verified, finished before-and-after themes.';
  end if;
  select * into target_attestation
  from public.source_release_attestations attestations
  where attestations.id = (target_report.data#>>'{redesign,attestationRowId}')::uuid
    and attestations.organization_id = target_report.organization_id
    and attestations.business_id = target_report.business_id
    and attestations.attestation_id = target_report.data#>>'{redesign,attestationId}'
    and attestations.source_commit = target_report.data#>>'{redesign,sourceCommit}'
    and public.release_attestation_checks_passed(attestations.checks);
  if target_attestation.id is null then
    raise exception 'The report does not match a passed release attestation for the exact edited website.';
  end if;
  if target_report.crawl_run_id is distinct from (
    select runs.id from public.crawl_runs runs
    join public.websites websites on websites.id = runs.website_id
    where websites.business_id = target_report.business_id and runs.status = 'ready'
    order by runs.completed_at desc nulls last, runs.requested_at desc limit 1
  ) then raise exception 'Create a new report from the latest completed website capture before previewing.'; end if;
  if exists (
    select 1 from public.decision_report_versions newer
    where newer.business_id = target_report.business_id and newer.version > target_report.version
  ) then raise exception 'Only the latest frozen report version can be previewed.'; end if;

  select * into existing_job from public.report_preview_jobs
  where report_version_id = target_report.id for update;
  if existing_job.id is not null and (existing_job.status in ('queued', 'running') or
    (existing_job.status = 'ready' and existing_job.preview_expires_at > now())) then
    return next existing_job; return;
  end if;
  if existing_job.id is not null then
    return query update public.report_preview_jobs set
      status = 'queued', progress_phase = 'queued',
      progress_detail = 'Waiting for the protected report preview worker.', completed_items = 0,
      cancel_requested_at = null, worker_id = null, lease_expires_at = null,
      remote_preview_id = null, preview_url = null, preview_expires_at = null,
      error_summary = null, completed_at = null, updated_at = now()
    where id = existing_job.id returning *;
    return;
  end if;
  return query insert into public.report_preview_jobs (
    organization_id, business_id, report_version_id, requested_by
  ) values (
    target_report.organization_id, target_report.business_id, target_report.id, auth.uid()
  ) returning *;
end;
$$;

revoke all on function public.request_report_preview(uuid) from public, anon;
grant execute on function public.request_report_preview(uuid) to authenticated;
