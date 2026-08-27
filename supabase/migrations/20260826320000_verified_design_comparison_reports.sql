-- Client reports compare the immutable original-site evidence with screenshots captured from the
-- exact verified edited commit. A theme is omitted unless page provenance and viewport match.

alter function public.create_audit_report_version(uuid, uuid)
  rename to create_audit_report_version_v6_high_priority;
revoke all on function public.create_audit_report_version_v6_high_priority(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.create_audit_report_version(
  target_business_id uuid,
  target_audit_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_id uuid;
  source_report public.decision_report_versions;
  report_id uuid;
  next_version integer;
  comparison_themes jsonb;
  revised_data jsonb;
  attestation_row_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  source_id := public.create_audit_report_version_v6_high_priority(
    target_business_id,
    target_audit_id
  );
  select * into source_report from public.decision_report_versions where id = source_id;
  attestation_row_id := (source_report.data#>>'{redesign,attestationRowId}')::uuid;

  select versions.id into report_id
  from public.decision_report_versions versions
  where versions.business_id = target_business_id
    and versions.audit_id = target_audit_id
    and versions.crawl_run_id = source_report.crawl_run_id
    and versions.schema_version = 7
    and versions.data->>'generatorRevision' = 'verified-design-comparison-v1'
    and versions.data#>>'{redesign,attestationRowId}' = attestation_row_id::text
  order by versions.version desc limit 1;
  if report_id is not null then return report_id; end if;

  select coalesce(jsonb_agg(
    theme || jsonb_build_object(
      'afterEvidence', jsonb_build_object(
        'artifactId', after_artifact.id,
        'storageBucket', after_artifact.storage_bucket,
        'storagePath', after_artifact.storage_path,
        'sourceUrl', after_artifact.metadata->>'sourceUrl',
        'generatedRoute', after_artifact.metadata->>'generatedRoute',
        'viewport', after_artifact.metadata->'viewport',
        'caption', 'The verified redesigned website at the same page provenance and viewport.'
      ),
      'comparison', jsonb_build_object(
        'whatChanged', case theme->>'area'
          when 'Mobile' then 'The redesigned page gives the content a deliberate mobile hierarchy and keeps the important message inside the usable screen.'
          when 'Conversion' then 'The redesigned page groups the decision-making content and next action into a clearer customer journey.'
          when 'UX' then 'The redesigned page creates a clearer reading order and a more direct path to the next useful action.'
          when 'Content' then 'The redesigned page presents the same supported information with clearer structure, spacing and emphasis.'
          when 'Trust' then 'The redesigned page gives important proof and business information a more consistent, credible presentation.'
          else 'The redesigned page replaces the original presentation with clearer hierarchy, spacing and responsive behaviour.'
        end,
        'whyBetter', case theme->>'area'
          when 'Mobile' then 'Customers can understand the page without cropped content or unnecessary visual friction.'
          when 'Conversion' then 'Customers can recognise the next step sooner and move through the enquiry journey with less hesitation.'
          when 'UX' then 'Customers can scan, understand and navigate the page with less effort.'
          when 'Content' then 'Customers can find and understand the most useful information more quickly.'
          when 'Trust' then 'Customers receive a more coherent and confident first impression of the business.'
          else 'Customers receive a calmer, clearer and more dependable experience across screen sizes.'
        end,
        'customerValue', theme->>'businessOpportunity',
        'evidenceBasis', 'Matched source-page provenance, matched viewport and the passed exact-commit release verification.'
      )
    ) order by ordinality
  ), '[]'::jsonb)
  into comparison_themes
  from jsonb_array_elements(source_report.data->'valueThemes')
    with ordinality themes(theme, ordinality)
  join lateral (
    select artifacts.*
    from public.artifacts artifacts
    where artifacts.organization_id = source_report.organization_id
      and artifacts.business_id = target_business_id
      and artifacts.crawl_run_id = source_report.crawl_run_id
      and artifacts.kind = 'screenshot'
      and artifacts.metadata->>'evidenceKind' = 'edited-site-comparison'
      and artifacts.metadata->>'releaseAttestationId' = attestation_row_id::text
      and artifacts.metadata->>'sourceUrl' = theme#>>'{evidence,sourceUrl}'
      and (artifacts.metadata#>>'{viewport,width}')::integer =
        (theme#>>'{evidence,viewport,width}')::integer
      and (artifacts.metadata#>>'{viewport,height}')::integer =
        (theme#>>'{evidence,viewport,height}')::integer
    order by artifacts.created_at desc, artifacts.id
    limit 1
  ) after_artifact on true;

  if jsonb_array_length(comparison_themes) = 0 then
    raise exception 'The verified edited website has no matched comparison screenshots. Run release verification for the current commit again.';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.decision_report_versions where business_id = target_business_id;

  revised_data := source_report.data || jsonb_build_object(
    'schemaVersion', 7,
    'generatorRevision', 'verified-design-comparison-v1',
    'generatedAt', now(),
    'version', next_version,
    'title', format('See the difference for %s',
      (select name from public.businesses where id = target_business_id)),
    'summary', 'Compare the original website with the verified redesign, then see why each design decision creates a clearer customer experience.',
    'valueThemes', comparison_themes,
    'comparisonMethod', jsonb_build_object(
      'kind', 'matched_before_after',
      'maximumThemes', 3,
      'requiresSameSourcePage', true,
      'requiresSameViewport', true,
      'requiresExactVerifiedCommit', true
    )
  );

  insert into public.decision_report_versions (
    organization_id, business_id, audit_id, crawl_run_id, version, schema_version,
    review_state, summary, data, created_by
  ) values (
    source_report.organization_id, target_business_id, source_report.audit_id,
    source_report.crawl_run_id, next_version, 7, 'approved',
    format('%s matched design comparisons generated from the verified edited website.',
      jsonb_array_length(comparison_themes)),
    revised_data, auth.uid()
  ) returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.request_report_preview(target_report_version_id uuid)
returns setof public.report_preview_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_report public.decision_report_versions;
  target_attestation public.source_release_attestations;
  existing_job public.report_preview_jobs;
begin
  select * into target_report from public.decision_report_versions where id = target_report_version_id;
  if target_report.id is null or not public.is_organization_member(target_report.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_report.review_state <> 'approved' or target_report.schema_version <> 7
     or target_report.data->>'reportKind' <> 'verified_redesign_value'
     or target_report.data->>'generatorRevision' <> 'verified-design-comparison-v1' then
    raise exception 'This earlier report format must be regenerated before Clientspace preview.';
  end if;
  if jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) > 3
     or exists (
       select 1 from jsonb_array_elements(target_report.data->'valueThemes') theme
       where coalesce(theme#>>'{evidence,artifactId}', '') = ''
         or coalesce(theme#>>'{afterEvidence,artifactId}', '') = ''
     ) then
    raise exception 'The client report must contain between one and three matched before-and-after themes.';
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

revoke all on function public.create_audit_report_version(uuid, uuid) from public, anon;
revoke all on function public.request_report_preview(uuid) from public, anon;
grant execute on function public.create_audit_report_version(uuid, uuid) to authenticated;
grant execute on function public.request_report_preview(uuid) to authenticated;
