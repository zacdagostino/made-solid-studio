-- Responsive evidence now uses real browser profiles and top/middle/bottom page states. The
-- design-report agent may select a persistent-interface obstruction only from that trusted
-- evidence, and every redesign comparison must reproduce the original page position.

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
      and redesigned.metadata->>'originalEvidenceKind' = original.metadata->>'evidenceKind'
      and coalesce(redesigned.metadata#>>'{scrollState,scrollProgress}', '0') =
        coalesce(original.metadata#>>'{scrollState,scrollProgress}', '0')
      and redesigned.metadata#>'{technologyFoundation,technologies}' @>
        '[{"id":"nextjs"}]'::jsonb
      and redesigned.metadata#>'{technologyFoundation,technologies}' @>
        '[{"id":"typescript"}]'::jsonb
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
      and original.metadata->>'captureContract' = 'real-device-responsive-audit-v1'
      and original.metadata#>>'{viewportIntegrity,status}' = 'passed'
  ) then
    raise exception 'No trusted, position-matched before-and-after comparison candidates are available. Run the responsive audit and release verification again.';
  end if;
  if not exists (select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'report_generation' and heartbeat_at >= now() - interval '45 seconds') then
    raise exception 'Report generation is not connected. Start the protected report worker and try again.';
  end if;

  perform 1 from public.businesses where id = target_business_id for update;
  select * into existing_job from public.report_generation_jobs
  where business_id = target_business_id and audit_id = target_audit.id
    and release_attestation_id = target_release.id
    and generator_contract_version = 'client-value-report-agent-v3'
  for update;
  if existing_job.id is not null and existing_job.status in ('queued', 'running', 'ready') then
    return next existing_job; return;
  end if;
  if existing_job.id is not null then
    return query update public.report_generation_jobs set
      status = 'queued', progress_phase = 'queued',
      progress_detail = 'Waiting for the protected dynamic design report worker.',
      completed_items = 0, cancel_requested_at = null, worker_id = null,
      lease_expires_at = null, attempt_count = 0, result_report_version_id = null,
      error_code = null, error_summary = null, error_context = '{}'::jsonb,
      started_at = null, completed_at = null, updated_at = now()
    where id = existing_job.id returning *;
    return;
  end if;
  return query insert into public.report_generation_jobs (
    organization_id, business_id, audit_id, crawl_run_id, release_attestation_id, requested_by,
    generator_contract_version, model, reasoning_effort, progress_detail
  ) values (
    target_business.organization_id, target_business_id, target_audit.id,
    target_audit.crawl_run_id, target_release.id, auth.uid(),
    'client-value-report-agent-v3', 'gpt-5.6-sol', 'max',
    'Waiting for the protected dynamic design report worker.'
  ) returning *;
end;
$$;

revoke all on function public.request_report_generation(uuid, uuid) from public, anon;
grant execute on function public.request_report_generation(uuid, uuid) to authenticated;

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
  if target_report.review_state <> 'approved' or target_report.schema_version <> 10
     or target_report.data->>'reportKind' <> 'verified_redesign_value'
     or target_report.data->>'generatorRevision' <> 'gpt-5.6-sol-dynamic-design-showcase-v3' then
    raise exception 'This earlier report format must be regenerated before Clientspace preview.';
  end if;
  if jsonb_array_length(coalesce(target_report.data->'majorFindings', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(target_report.data->'majorFindings', '[]'::jsonb)) > 6
     or jsonb_array_length(coalesce(target_report.data->'designDecisions', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) = 0
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
         or theme#>>'{afterEvidence,verification,sameScrollState}' <> 'true'
         or coalesce(theme#>>'{afterEvidence,verification,redesignedHorizontalOverflowPx}', '') !~ '^[0-9]+$'
         or (theme#>>'{afterEvidence,verification,redesignedHorizontalOverflowPx}')::integer > 1
     ) then
    raise exception 'The client report must contain verified design findings and position-matched before-and-after themes.';
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
