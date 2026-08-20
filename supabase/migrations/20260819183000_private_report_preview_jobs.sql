-- Durable, Studio-only publication of an already frozen decision report to the Clientspace
-- report renderer. The browser can request and observe a job, but only the service-role worker
-- can read the private handoff secret or send report evidence to the renderer.
create table public.report_preview_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  report_version_id uuid not null references public.decision_report_versions on delete cascade,
  requested_by uuid references auth.users on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'cancelled')),
  progress_phase text not null default 'queued',
  progress_detail text not null default 'Waiting for the protected report preview worker.',
  total_items integer not null default 3 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  remote_preview_id text,
  preview_url text,
  preview_expires_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (report_version_id)
);

create index report_preview_jobs_queue_idx
  on public.report_preview_jobs(status, lease_expires_at, created_at);
create index report_preview_jobs_business_idx
  on public.report_preview_jobs(business_id, created_at desc);

alter table public.worker_runtime_heartbeats
  drop constraint if exists worker_runtime_heartbeats_worker_kind_check;
alter table public.worker_runtime_heartbeats
  add constraint worker_runtime_heartbeats_worker_kind_check
  check (worker_kind in ('builder', 'github_workspace', 'made_solid_handoff', 'report_preview'));

alter table public.report_preview_jobs enable row level security;
create policy "Members can view private report preview jobs"
  on public.report_preview_jobs for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.request_report_preview(target_report_version_id uuid)
returns setof public.report_preview_jobs
language plpgsql security definer set search_path = public as $$
declare target_report public.decision_report_versions;
  existing_job public.report_preview_jobs;
begin
  select * into target_report from public.decision_report_versions
  where id = target_report_version_id;
  if target_report.id is null
    or not public.is_organization_member(target_report.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_report.review_state <> 'approved' then
    raise exception 'An approved frozen report version is required.';
  end if;
  if not exists (
    select 1 from public.audits audits
    where audits.id = target_report.audit_id
      and audits.business_id = target_report.business_id
      and audits.crawl_run_id = target_report.crawl_run_id
      and audits.status = 'ready'
  ) then
    raise exception 'The frozen report must reference a completed audit with matching lineage.';
  end if;
  if target_report.crawl_run_id is distinct from (
    select runs.id from public.crawl_runs runs
    join public.websites websites on websites.id = runs.website_id
    where websites.business_id = target_report.business_id and runs.status = 'ready'
    order by runs.completed_at desc nulls last, runs.requested_at desc limit 1
  ) then
    raise exception 'Create a new report from the latest completed website capture before previewing.';
  end if;
  if exists (
    select 1 from public.decision_report_versions newer
    where newer.business_id = target_report.business_id and newer.version > target_report.version
  ) then
    raise exception 'Only the latest frozen report version can be previewed.';
  end if;

  select * into existing_job from public.report_preview_jobs
  where report_version_id = target_report.id for update;
  if existing_job.id is not null and (
    existing_job.status in ('queued', 'running')
    or (existing_job.status = 'ready' and existing_job.preview_expires_at > now())
  ) then
    return next existing_job;
    return;
  end if;
  if existing_job.id is not null then
    return query update public.report_preview_jobs
    set status = 'queued', progress_phase = 'queued',
      progress_detail = 'Waiting for the protected report preview worker.',
      completed_items = 0, cancel_requested_at = null, worker_id = null,
      lease_expires_at = null, remote_preview_id = null, preview_url = null,
      preview_expires_at = null,
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

create or replace function public.cancel_report_preview(target_job_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_job public.report_preview_jobs;
begin
  select * into target_job from public.report_preview_jobs where id = target_job_id;
  if target_job.id is null or not public.is_organization_member(target_job.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_job.status not in ('queued', 'running') then return; end if;
  update public.report_preview_jobs set
    cancel_requested_at = now(),
    status = case when status = 'queued' then 'cancelled' else status end,
    progress_phase = case when status = 'queued' then 'cancelled' else progress_phase end,
    progress_detail = 'Cancellation requested. The worker will stop at its next safe checkpoint.',
    completed_at = case when status = 'queued' then now() else completed_at end,
    updated_at = now()
  where id = target_job.id;
end;
$$;

create or replace function public.claim_next_report_preview(worker_identity text)
returns setof public.report_preview_jobs
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  update public.report_preview_jobs set status = 'cancelled', progress_phase = 'cancelled',
    progress_detail = 'The preview was cancelled after its worker lease ended.',
    completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is not null and lease_expires_at < now();
  update public.report_preview_jobs set status = 'failed', progress_phase = 'failed',
    progress_detail = 'The report preview stopped after three worker attempts.',
    error_summary = 'The protected preview worker did not complete after three attempts.',
    completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is null
    and lease_expires_at < now() and attempt_count >= 3;

  return query with candidate as (
    select id from public.report_preview_jobs
    where (status = 'queued' or (status = 'running' and lease_expires_at < now()))
      and cancel_requested_at is null and attempt_count < 3
    order by created_at for update skip locked limit 1
  ) update public.report_preview_jobs as jobs
  set status = 'running', started_at = coalesce(started_at, now()),
    worker_id = trim(worker_identity), lease_expires_at = now() + interval '5 minutes',
    attempt_count = attempt_count + 1, progress_phase = 'loading_report',
    progress_detail = 'Loading the exact frozen report and its reviewed screenshots.',
    error_summary = null, updated_at = now()
  from candidate where jobs.id = candidate.id returning jobs.*;
end;
$$;

create or replace function public.heartbeat_report_preview_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  insert into public.worker_runtime_heartbeats (worker_kind, worker_id, started_at, heartbeat_at)
  values ('report_preview', trim(worker_identity), now(), now())
  on conflict (worker_kind) do update set worker_id = excluded.worker_id,
    started_at = case when worker_runtime_heartbeats.worker_id = excluded.worker_id
      then worker_runtime_heartbeats.started_at else now() end,
    heartbeat_at = now();
end;
$$;

create or replace function public.release_report_preview_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  delete from public.worker_runtime_heartbeats
  where worker_kind = 'report_preview' and worker_id = trim(worker_identity);
end;
$$;

create or replace function public.report_preview_worker_available()
returns boolean language plpgsql security definer set search_path = public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  return exists (select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'report_preview' and heartbeat_at >= now() - interval '45 seconds');
end;
$$;

create or replace function public.guard_report_preview_queue_liveness()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'queued' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'queued' then return new; end if;
  if not exists (select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'report_preview' and heartbeat_at >= now() - interval '45 seconds') then
    raise exception using message = 'Report preview is not connected. Start the protected preview worker and try again; no preview was queued.', errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger guard_report_preview_queue_liveness
before insert or update of status on public.report_preview_jobs
for each row execute function public.guard_report_preview_queue_liveness();

revoke all on function public.request_report_preview(uuid) from public;
revoke all on function public.cancel_report_preview(uuid) from public;
revoke all on function public.claim_next_report_preview(text) from public;
revoke all on function public.heartbeat_report_preview_worker(text) from public;
revoke all on function public.release_report_preview_worker(text) from public;
revoke all on function public.report_preview_worker_available() from public, anon;
grant execute on function public.request_report_preview(uuid) to authenticated;
grant execute on function public.cancel_report_preview(uuid) to authenticated;
grant execute on function public.claim_next_report_preview(text) to service_role;
grant execute on function public.heartbeat_report_preview_worker(text) to service_role;
grant execute on function public.release_report_preview_worker(text) to service_role;
grant execute on function public.report_preview_worker_available() to authenticated;
