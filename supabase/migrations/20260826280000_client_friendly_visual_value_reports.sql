-- Preserve schema v5 reports as immutable history. Schema v6 is a client-language contract:
-- at most three themes, each backed by an exact old-site screenshot match. Raw audit wording and
-- release metadata remain internal evidence and are never promoted into client copy.

alter function public.create_audit_report_version(uuid, uuid)
  rename to create_audit_report_version_v5;
revoke all on function public.create_audit_report_version_v5(uuid, uuid) from public, anon, authenticated;

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
  v5_id uuid;
  v5_report public.decision_report_versions;
  report_id uuid;
  next_version integer;
  target_name text;
  themes jsonb;
  delivered_work jsonb;
  report_data jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  -- Reuse the complete v5 lineage and eligibility gate, then create a new immutable presentation
  -- contract. Calling this helper never changes an existing v5 report.
  v5_id := public.create_audit_report_version_v5(target_business_id, target_audit_id);
  select * into v5_report from public.decision_report_versions where id = v5_id;

  select versions.id into report_id
  from public.decision_report_versions versions
  where versions.business_id = target_business_id
    and versions.audit_id = target_audit_id
    and versions.crawl_run_id = v5_report.crawl_run_id
    and versions.schema_version = 6
    and versions.data->>'reportKind' = 'verified_redesign_value'
    and versions.data#>>'{redesign,attestationRowId}' = v5_report.data#>>'{redesign,attestationRowId}'
  order by versions.version desc limit 1;
  if report_id is not null then return report_id; end if;

  select name into target_name from public.businesses where id = target_business_id;

  with eligible as (
    select
      observations.*,
      case
        when observations.area in ('Content', 'SEO', 'Trust') then 'understand'
        when observations.area in ('UX', 'Conversion') then 'enquire'
        else 'impression'
      end as client_area,
      screenshots.id as screenshot_id,
      screenshots.storage_bucket,
      screenshots.storage_path,
      screenshots.metadata as screenshot_metadata,
      row_number() over (
        partition by case
          when observations.area in ('Content', 'SEO', 'Trust') then 'understand'
          when observations.area in ('UX', 'Conversion') then 'enquire'
          else 'impression'
        end
        order by
          case observations.severity when 'high' then 1 when 'medium' then 2 else 3 end,
          observations.created_at,
          observations.id,
          screenshots.created_at,
          screenshots.id
      ) as client_rank
    from public.audit_observations observations
    join lateral (
      select artifacts.*
      from public.artifacts artifacts
      where artifacts.id = any(observations.evidence_artifact_ids)
        and artifacts.organization_id = v5_report.organization_id
        and artifacts.business_id = target_business_id
        and artifacts.crawl_run_id = v5_report.crawl_run_id
        and artifacts.kind = 'screenshot'
        and nullif(artifacts.metadata->>'sourceUrl', '') is not null
        and artifacts.metadata->>'sourceUrl' = any(observations.source_urls)
        and observations.viewport is not null
        and artifacts.metadata#>>'{viewport,width}' ~ '^[0-9]+$'
        and artifacts.metadata#>>'{viewport,height}' ~ '^[0-9]+$'
        and (artifacts.metadata#>>'{viewport,width}')::integer = (observations.viewport->>'width')::integer
        and (artifacts.metadata#>>'{viewport,height}')::integer = (observations.viewport->>'height')::integer
      order by artifacts.created_at, artifacts.id
      limit 1
    ) screenshots on true
    where observations.audit_id = target_audit_id
      and observations.business_id = target_business_id
      and observations.crawl_run_id = v5_report.crawl_run_id
      and observations.area <> 'Platform'
      and observations.confidence in ('high', 'medium')
      and observations.review_state <> 'blocked'
      and nullif(btrim(observations.observation), '') is not null
      and nullif(btrim(observations.customer_impact), '') is not null
  ), selected as (
    select * from eligible where client_rank = 1
    order by case severity when 'high' then 1 when 'medium' then 2 else 3 end, client_area
    limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', format('theme-%s-%s', row_number, client_area),
    'area', case client_area
      when 'understand' then 'Clarity' when 'enquire' then 'Enquiries' else 'First impression' end,
    'title', case client_area
      when 'understand' then format('Help customers understand %s faster', target_name)
      when 'enquire' then 'Make it easier to take the next step'
      else 'Make a stronger first impression' end,
    'before', case client_area
      when 'understand' then 'The existing website does not always make the business, its services and the next useful detail immediately clear.'
      when 'enquire' then 'The existing journey can make it harder than necessary for an interested visitor to know what to do next.'
      else 'Important information on the existing website can be difficult to take in on the screen shown below.' end,
    'businessOpportunity', case client_area
      when 'understand' then 'Clearer information helps suitable customers recognise the value of the business sooner.'
      when 'enquire' then 'A direct path to contact reduces friction between customer interest and a genuine enquiry.'
      else 'A clearer first impression helps visitors feel confident that they have found the right business.' end,
    'value', case client_area
      when 'understand' then 'Clearer information helps suitable customers recognise the value of the business sooner.'
      when 'enquire' then 'A direct path to contact reduces friction between customer interest and a genuine enquiry.'
      else 'A clearer first impression helps visitors feel confident that they have found the right business.' end,
    'whatToNotice', case client_area
      when 'understand' then 'Notice how much work a visitor must do to understand the important message.'
      when 'enquire' then 'Notice whether the next action is obvious without searching around the page.'
      else 'Notice how the page makes key information harder to scan at a glance.' end,
    'designPriority', case client_area
      when 'understand' then 'Organise services and supporting information so visitors can understand the offer sooner.'
      when 'enquire' then 'Keep the next action visible and reduce the steps between customer interest and contact.'
      else 'Keep essential messages and contact details clear and readable across screen sizes.' end,
    'editedSiteProof', null,
    'occurrenceCount', 1,
    'sourceUrls', jsonb_build_array(screenshot_metadata->>'sourceUrl'),
    'evidenceArtifactIds', jsonb_build_array(screenshot_id),
    'evidence', jsonb_build_object(
      'artifactId', screenshot_id, 'storageBucket', storage_bucket,
      'storagePath', storage_path,
      'caption', case client_area
        when 'understand' then 'Notice how much work a visitor must do to understand the important message.'
        when 'enquire' then 'Notice whether the next action is obvious without searching around the page.'
        else 'Notice how the page makes key information harder to scan at a glance.' end,
      'viewport', screenshot_metadata->'viewport', 'sourceUrl', screenshot_metadata->>'sourceUrl'
    ),
    'internalEvidence', jsonb_build_object(
      'observationIds', jsonb_build_array(id),
      'observations', jsonb_build_array(observation),
      'recommendations', jsonb_build_array(recommendation),
      'customerImpacts', jsonb_build_array(customer_impact)
    )
  ) order by row_number), '[]'::jsonb) into themes
  from (select selected.*, row_number() over () from selected) numbered;

  if jsonb_array_length(themes) = 0 then
    raise exception 'The current audit has no observations with an exact old-site screenshot, source URL and viewport match.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', check_item->>'id',
    'label', case check_item->>'id'
      when 'source-verification' then 'Complete website prepared for review'
      when 'responsive-layout' then 'Pages reviewed across mobile, tablet and desktop'
      when 'responsive-navigation' then 'Navigation and customer journeys tested'
      when 'accessibility' then 'Accessibility checks completed'
      else 'Website quality check completed' end,
    'detail', case check_item->>'id'
      when 'source-verification' then 'The full working website is available for review.'
      when 'responsive-layout' then 'The website was checked at the screen sizes customers commonly use.'
      when 'responsive-navigation' then 'Menus and important paths through the website were tested.'
      when 'accessibility' then 'Automated checks support a more inclusive browsing experience.'
      else 'This part of the website passed its release check.' end,
    'status', 'passed'
  ) order by ordinality), '[]'::jsonb) into delivered_work
  from jsonb_array_elements(v5_report.data#>'{redesign,checks}') with ordinality checks(check_item, ordinality);

  select coalesce(max(version), 0) + 1 into next_version
  from public.decision_report_versions where business_id = target_business_id;

  report_data := jsonb_build_object(
    'schemaVersion', 6,
    'reportKind', 'verified_redesign_value',
    'auditId', v5_report.audit_id,
    'crawlRunId', v5_report.crawl_run_id,
    'generatedAt', now(),
    'version', next_version,
    'title', format('A stronger website for %s', target_name),
    'summary', format('A complete new website for %s is ready to review. This report highlights the strongest screenshot-backed opportunities found on the original website and the customer value each opportunity represents.', target_name),
    'strengths', jsonb_build_array(
      jsonb_build_object('id', 'evidence-led', 'title', 'Built around the real business', 'detail', 'The work uses captured business information and reviewed assets from the existing website.'),
      jsonb_build_object('id', 'working-website', 'title', 'A complete website is ready to review', 'detail', 'This is a working website rather than a mock-up or a list of future recommendations.')
    ),
    'valueThemes', themes,
    'deliveredWork', delivered_work,
    'redesign', v5_report.data->'redesign',
    'internalTechnicalEvidence', jsonb_build_object(
      'sourceReportVersionId', v5_report.id,
      'sourceSchemaVersion', v5_report.schema_version,
      'methodology', v5_report.data->'methodology',
      'release', v5_report.data->'redesign'
    ),
    'methodology', jsonb_build_array(
      'Each client theme has a screenshot from the same source capture, page and viewport as its audit observation.',
      'Raw technical findings remain in the internal evidence record rather than client-facing copy.',
      'A specific redesign fix is not claimed unless exact edited-site proof is attached to that theme.'
    ),
    'limitations', jsonb_build_array(
      'The report does not promise traffic, rankings, enquiries or revenue.',
      'The client should confirm that the business information is accurate before launch.'
    ),
    'nextStep', format('Review the completed %s website together, confirm the business information, and agree on any final refinements before launch.', target_name)
  );

  insert into public.decision_report_versions (
    organization_id, business_id, audit_id, crawl_run_id, version, schema_version,
    review_state, summary, data, created_by
  ) values (
    v5_report.organization_id, target_business_id, v5_report.audit_id, v5_report.crawl_run_id,
    next_version, 6, 'approved',
    format('%s screenshot-backed client themes generated from the verified website lineage.', jsonb_array_length(themes)),
    report_data, auth.uid()
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
  if target_report.review_state <> 'approved' or target_report.schema_version <> 6
     or target_report.data->>'reportKind' <> 'verified_redesign_value' then
    raise exception 'This earlier report format must be regenerated before Clientspace preview.';
  end if;
  if jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) = 0
     or jsonb_array_length(coalesce(target_report.data->'valueThemes', '[]'::jsonb)) > 3 then
    raise exception 'The client report must contain between one and three screenshot-backed themes.';
  end if;
  select * into target_attestation
  from public.source_release_attestations attestations
  where attestations.id = (target_report.data#>>'{redesign,attestationRowId}')::uuid
    and attestations.organization_id = target_report.organization_id
    and attestations.business_id = target_report.business_id
    and attestations.attestation_id = target_report.data#>>'{redesign,attestationId}'
    and attestations.source_builder_run_id::text = target_report.data#>>'{redesign,sourceBuilderRunId}'
    and attestations.source_manifest_id::text = target_report.data#>>'{redesign,sourceManifestId}'
    and attestations.source_commit = target_report.data#>>'{redesign,sourceCommit}'
    and attestations.source_edit_version::text = target_report.data#>>'{redesign,sourceEditVersion}'
    and public.release_attestation_checks_passed(attestations.checks);
  if target_attestation.id is null then
    raise exception 'The report does not match a passed release attestation for the exact edited website.';
  end if;
  if not exists (
    select 1 from public.audits audits
    where audits.id = target_report.audit_id
      and audits.business_id = target_report.business_id
      and audits.crawl_run_id = target_report.crawl_run_id
      and audits.status = 'ready'
  ) then raise exception 'The frozen report must reference a completed audit with matching lineage.'; end if;
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
