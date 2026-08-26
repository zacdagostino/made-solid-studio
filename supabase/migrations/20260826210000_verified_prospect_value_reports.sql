-- New client reports sell the value of the exact edited website that has already passed release
-- verification. Earlier report versions remain immutable history and cannot be previewed or
-- handed off as though they describe the current website.

create or replace function public.curate_ux_first_report_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The report RPC now freezes the complete versioned value-report contract itself. Retain this
  -- trigger name for migration compatibility without rewriting new reports back to schema v3.
  return new;
end;
$$;

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
  target_organization_id uuid;
  target_business_name text;
  target_audit public.audits;
  latest_capture_id uuid;
  release_record public.source_release_attestations;
  next_version integer;
  report_id uuid;
  eligible_count integer;
  task_count integer;
  ready_task_count integer;
  theme_count integer := 0;
  themes jsonb := '[]'::jsonb;
  theme_items jsonb;
  representative jsonb;
  combined_sources jsonb;
  combined_artifact_ids jsonb;
  combined_observation_ids jsonb;
  evidence_reference jsonb;
  strengths jsonb := '[]'::jsonb;
  delivered_work jsonb := '[]'::jsonb;
  report_data jsonb;
  has_approved_identity boolean := false;
  group_record record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select organization_id, name
    into target_organization_id, target_business_name
  from public.businesses
  where id = target_business_id
  for update;
  if target_organization_id is null
     or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select * into target_audit
  from public.audits
  where id = target_audit_id
    and business_id = target_business_id
    and status = 'ready';
  if target_audit.id is null then
    raise exception 'A completed specialist audit is required.';
  end if;

  select runs.id into latest_capture_id
  from public.crawl_runs runs
  join public.websites websites on websites.id = runs.website_id
  where websites.business_id = target_business_id
    and runs.status = 'ready'
  order by runs.completed_at desc nulls last, runs.requested_at desc
  limit 1;
  if latest_capture_id is null
     or target_audit.crawl_run_id is distinct from latest_capture_id then
    raise exception 'The specialist audit must reference the latest completed website capture.';
  end if;

  select * into release_record
  from public.source_release_attestations attestations
  where attestations.organization_id = target_organization_id
    and attestations.business_id = target_business_id
    and public.release_attestation_checks_passed(attestations.checks)
  order by attestations.verified_at desc, attestations.created_at desc
  limit 1;
  if release_record.id is null then
    raise exception 'Verify the exact current edited website before creating its value report.';
  end if;
  if not exists (
    select 1
    from public.builder_runs runs
    where runs.id = release_record.source_builder_run_id
      and runs.business_id = target_business_id
      and runs.organization_id = target_organization_id
      and runs.build_mode = 'full_site'
      and runs.build_manifest_id = release_record.source_manifest_id
  ) then
    raise exception 'The verified edited website does not have complete full-site build lineage.';
  end if;

  select count(*), count(*) filter (
    where status = 'ready'
      and crawl_run_id = target_audit.crawl_run_id
      and business_id = target_business_id
      and organization_id = target_organization_id
  )
  into task_count, ready_task_count
  from public.audit_specialist_tasks
  where audit_id = target_audit_id;
  if task_count <> 6 or ready_task_count <> 6 then
    raise exception 'All six required specialist sections must complete against the report capture.';
  end if;

  -- The business row lock serializes this lookup with report creation. Repeating a request for the
  -- same immutable audit and exact verified edit returns the existing version.
  select versions.id into report_id
  from public.decision_report_versions versions
  where versions.business_id = target_business_id
    and versions.organization_id = target_organization_id
    and versions.audit_id = target_audit_id
    and versions.crawl_run_id = target_audit.crawl_run_id
    and versions.schema_version = 5
    and versions.data->>'reportKind' = 'verified_redesign_value'
    and versions.data#>>'{redesign,attestationRowId}' = release_record.id::text
  order by versions.version desc
  limit 1;
  if report_id is not null then
    return report_id;
  end if;

  perform 1 from public.audit_observations where audit_id = target_audit_id for update;
  -- Report curation is automatic. A reviewer may still explicitly block an observation, but a
  -- newly generated high/medium-confidence observation does not need a separate approval click.
  -- Unsupported, stale and low-confidence rows are ignored instead of blocking the whole report.
  select count(*) into eligible_count
  from public.audit_observations observations
  where observations.audit_id = target_audit_id
    and observations.business_id = target_business_id
    and observations.organization_id = target_organization_id
    and observations.crawl_run_id = target_audit.crawl_run_id
    and observations.confidence in ('high', 'medium')
    and observations.review_state <> 'blocked'
    and observations.area <> 'Platform'
    and nullif(btrim(observations.observation), '') is not null
    and nullif(btrim(observations.recommendation), '') is not null
    and nullif(btrim(observations.customer_impact), '') is not null
    and exists (
      select 1
      from public.audit_specialist_tasks tasks
      where tasks.id = observations.specialist_task_id
        and tasks.audit_id = target_audit_id
        and tasks.business_id = target_business_id
        and tasks.organization_id = target_organization_id
        and tasks.crawl_run_id = target_audit.crawl_run_id
        and tasks.specialist_kind = observations.specialist_kind
        and tasks.status = 'ready'
    )
    and (
      exists (
        select 1
        from public.evidence_facts facts
        where facts.id = any(observations.evidence_fact_ids)
          and facts.organization_id = target_organization_id
          and facts.business_id = target_business_id
          and facts.crawl_run_id = target_audit.crawl_run_id
      )
      or exists (
        select 1
        from public.artifacts artifacts
        where artifacts.id = any(observations.evidence_artifact_ids)
          and artifacts.organization_id = target_organization_id
          and artifacts.business_id = target_business_id
          and artifacts.crawl_run_id = target_audit.crawl_run_id
      )
    );
  if eligible_count = 0 then
    raise exception 'The current audit has no evidence-backed, client-safe observations to report.';
  end if;

  -- Eligible cases are consolidated by visitor-experience area. This prevents repeated route and
  -- viewport variants from becoming eight near-identical sales points while retaining every source
  -- observation and URL in the immutable report data.
  for group_record in
    select
      observations.area,
      jsonb_agg(
        jsonb_build_object(
          'id', observations.id,
          'title', observations.title,
          'observation', observations.observation,
          'customerImpact', observations.customer_impact,
          'recommendation', observations.recommendation,
          'sourceUrls', observations.source_urls,
          'evidenceArtifactIds', observations.evidence_artifact_ids,
          'viewport', observations.viewport,
          'severity', observations.severity,
          'measurement', observations.measurement
        )
        order by
          case observations.severity when 'high' then 1 when 'medium' then 2 else 3 end,
          case
            when jsonb_typeof(observations.measurement->'priorityScore') = 'number'
              then (observations.measurement->>'priorityScore')::numeric
            else 0
          end desc,
          observations.created_at,
          observations.id
      ) as items,
      min(case observations.severity when 'high' then 1 when 'medium' then 2 else 3 end) as rank
    from public.audit_observations observations
    where observations.audit_id = target_audit_id
      and observations.business_id = target_business_id
      and observations.organization_id = target_organization_id
      and observations.crawl_run_id = target_audit.crawl_run_id
      and observations.confidence in ('high', 'medium')
      and observations.review_state <> 'blocked'
      and observations.area <> 'Platform'
      and nullif(btrim(observations.observation), '') is not null
      and nullif(btrim(observations.recommendation), '') is not null
      and nullif(btrim(observations.customer_impact), '') is not null
      and exists (
        select 1
        from public.audit_specialist_tasks tasks
        where tasks.id = observations.specialist_task_id
          and tasks.audit_id = target_audit_id
          and tasks.business_id = target_business_id
          and tasks.organization_id = target_organization_id
          and tasks.crawl_run_id = target_audit.crawl_run_id
          and tasks.specialist_kind = observations.specialist_kind
          and tasks.status = 'ready'
      )
      and (
        exists (
          select 1
          from public.evidence_facts facts
          where facts.id = any(observations.evidence_fact_ids)
            and facts.organization_id = target_organization_id
            and facts.business_id = target_business_id
            and facts.crawl_run_id = target_audit.crawl_run_id
        )
        or exists (
          select 1
          from public.artifacts artifacts
          where artifacts.id = any(observations.evidence_artifact_ids)
            and artifacts.organization_id = target_organization_id
            and artifacts.business_id = target_business_id
            and artifacts.crawl_run_id = target_audit.crawl_run_id
        )
      )
    group by observations.area
    order by rank, count(*) desc, observations.area
    limit 5
  loop
    theme_count := theme_count + 1;
    theme_items := group_record.items;
    representative := theme_items->0;

    select coalesce(jsonb_agg(distinct source_url order by source_url), '[]'::jsonb)
      into combined_sources
    from jsonb_array_elements(theme_items) item
    cross join lateral jsonb_array_elements_text(coalesce(item->'sourceUrls', '[]'::jsonb)) urls(source_url);
    select coalesce(jsonb_agg(distinct artifact_id order by artifact_id), '[]'::jsonb)
      into combined_artifact_ids
    from jsonb_array_elements(theme_items) item
    cross join lateral jsonb_array_elements_text(coalesce(item->'evidenceArtifactIds', '[]'::jsonb)) ids(artifact_id);
    select coalesce(jsonb_agg(item->>'id' order by item_ordinality), '[]'::jsonb)
      into combined_observation_ids
    from jsonb_array_elements(theme_items) with ordinality items(item, item_ordinality);

    select jsonb_build_object(
      'artifactId', artifacts.id,
      'storageBucket', artifacts.storage_bucket,
      'storagePath', artifacts.storage_path,
      'caption', artifacts.label,
      'viewport', artifacts.metadata->'viewport',
      'sourceUrl', artifacts.metadata->>'sourceUrl'
    ) into evidence_reference
    from public.artifacts artifacts
    where artifacts.organization_id = target_organization_id
      and artifacts.business_id = target_business_id
      and artifacts.crawl_run_id = target_audit.crawl_run_id
      and artifacts.kind = 'screenshot'
      and exists (
        select 1
        from jsonb_array_elements_text(combined_artifact_ids) evidence_ids(evidence_id)
        where evidence_id = artifacts.id::text
      )
    order by
      case when artifacts.id::text = representative->'evidenceArtifactIds'->>0 then 0 else 1 end,
      artifacts.created_at,
      artifacts.id
    limit 1;

    themes := themes || jsonb_build_array(jsonb_build_object(
      'id', format('theme-%s-%s', theme_count, lower(group_record.area)),
      'area', group_record.area,
      'title', case group_record.area
        when 'UI' then 'A clearer, more polished interface'
        when 'UX' then 'A more direct path through the website'
        when 'Mobile' then 'A dependable experience on every screen'
        when 'Accessibility' then 'A more inclusive, usable website'
        when 'SEO' then 'Content that is easier to find and understand'
        when 'Performance' then 'A faster, more dependable first impression'
        when 'Content' then 'A clearer explanation of the business and its services'
        when 'Trust' then 'Stronger confidence at the point of decision'
        when 'Conversion' then 'Clearer paths from interest to enquiry'
        else representative->>'title'
      end,
      'before', representative->>'observation',
      'redesignResponse', representative->>'recommendation',
      'value', representative->>'customerImpact',
      'occurrenceCount', jsonb_array_length(theme_items),
      'sourceObservationIds', combined_observation_ids,
      'sourceUrls', combined_sources,
      'evidenceArtifactIds', combined_artifact_ids,
      'evidence', evidence_reference
    ));
  end loop;

  if theme_count = 0 then
    raise exception 'The current audit has no evidence-backed, client-safe observations to report.';
  end if;

  select exists (
    select 1 from public.brand_kits kits
    where kits.business_id = target_business_id
      and kits.status = 'approved'
      and kits.primary_logo_artifact_id is not null
  ) into has_approved_identity;
  if has_approved_identity then
    strengths := strengths || jsonb_build_array(jsonb_build_object(
      'id', 'approved-identity',
      'title', 'An established identity worth carrying forward',
      'detail', 'The redesign uses the reviewed organisation logo and brand direction rather than replacing the business with a generic identity.'
    ));
  end if;
  strengths := strengths || jsonb_build_array(
    jsonb_build_object(
      'id', 'evidence-led-foundation',
      'title', 'The useful parts of the existing website were treated as evidence',
      'detail', 'Captured source content, business facts and approved assets informed the new website, so the redesign builds on what the organisation already knows.'
    ),
    jsonb_build_object(
      'id', 'working-redesign',
      'title', 'There is already a complete website to review',
      'detail', format('The proposed solution is a working edited website, verified at commit %s—not a mock-up or a list of future recommendations.', left(release_record.source_commit, 8))
    )
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', checks.value->>'id',
    'label', case checks.value->>'id'
      when 'source-verification' then 'The complete website source passed verification'
      when 'responsive-layout' then 'Every generated route was checked across required screen sizes'
      when 'responsive-navigation' then 'Mobile and tablet navigation interactions were checked'
      when 'accessibility' then 'Automated accessibility checks passed across responsive views'
      else checks.value->>'label'
    end,
    'detail', left(checks.value->>'detail', 600),
    'status', 'passed'
  ) order by checks.ordinality), '[]'::jsonb)
  into delivered_work
  from jsonb_array_elements(release_record.checks) with ordinality checks(value, ordinality);

  select coalesce(max(version), 0) + 1 into next_version
  from public.decision_report_versions
  where business_id = target_business_id;

  report_data := jsonb_build_object(
    'schemaVersion', 5,
    'reportKind', 'verified_redesign_value',
    'auditId', target_audit.id,
    'crawlRunId', target_audit.crawl_run_id,
    'generatedAt', now(),
    'version', next_version,
    'title', format('A stronger digital foundation for %s', target_business_name),
    'summary', format('%s now has a complete, verified website redesign grounded in evidence from the original site. This report shows what changed, why it matters to visitors, and the value of the work already delivered.', target_business_name),
    'strengths', strengths,
    'valueThemes', themes,
    'deliveredWork', delivered_work,
    'redesign', jsonb_build_object(
      'status', 'passed',
      'attestationRowId', release_record.id,
      'attestationId', release_record.attestation_id,
      'sourceBuilderRunId', release_record.source_builder_run_id,
      'sourceManifestId', release_record.source_manifest_id,
      'sourceCommit', release_record.source_commit,
      'sourceTree', release_record.source_tree,
      'sourceBranch', release_record.source_branch,
      'sourceEditVersion', release_record.source_edit_version,
      'verificationProfile', release_record.verification_profile,
      'verifiedAt', release_record.verified_at,
      'checks', release_record.checks
    ),
    'methodology', jsonb_build_array(
      'The original website themes are curated automatically from current-capture observations with resolvable evidence and high or medium confidence.',
      'Explicitly blocked, low-confidence, unsupported and stale observations are excluded automatically.',
      'Repeated page and viewport cases are consolidated into visitor-focused themes while their source observation IDs and URLs remain frozen in this version.',
      'The delivered-work claims come from the release attestation for the exact edited Git commit named in this report.'
    ),
    'limitations', jsonb_build_array(
      'The report does not claim guaranteed traffic, rankings, enquiries or revenue. Those outcomes depend on launch, ongoing content, marketing and customer behaviour.',
      'Automated verification supports release confidence but does not replace client review of business accuracy and fit.'
    ),
    'nextStep', format('Review the completed %s website together, confirm it represents the business accurately, and choose the right path to launch.', target_business_name)
  );

  insert into public.decision_report_versions (
    organization_id, business_id, audit_id, crawl_run_id, version, schema_version,
    review_state, summary, data, created_by
  ) values (
    target_organization_id, target_business_id, target_audit.id, target_audit.crawl_run_id,
    next_version, 5, 'approved',
    format('%s evidence-backed cases automatically consolidated into %s value themes and tied to verified edit v%s.', eligible_count, theme_count, release_record.source_edit_version),
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
  select * into target_report
  from public.decision_report_versions
  where id = target_report_version_id;
  if target_report.id is null
     or not public.is_organization_member(target_report.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_report.review_state <> 'approved' then
    raise exception 'An approved frozen report version is required.';
  end if;
  if target_report.schema_version <> 5
     or target_report.data->>'reportKind' <> 'verified_redesign_value' then
    raise exception 'This earlier report format must be regenerated before Clientspace preview.';
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
    where newer.business_id = target_report.business_id
      and newer.version > target_report.version
  ) then
    raise exception 'Only the latest frozen report version can be previewed.';
  end if;

  select * into existing_job
  from public.report_preview_jobs
  where report_version_id = target_report.id
  for update;
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
      preview_expires_at = null, error_summary = null, completed_at = null,
      updated_at = now()
    where id = existing_job.id
    returning *;
    return;
  end if;
  return query insert into public.report_preview_jobs (
    organization_id, business_id, report_version_id, requested_by
  ) values (
    target_report.organization_id, target_report.business_id, target_report.id, auth.uid()
  ) returning *;
end;
$$;

revoke all on function public.create_audit_report_version(uuid, uuid) from public;
revoke all on function public.request_report_preview(uuid) from public;
grant execute on function public.create_audit_report_version(uuid, uuid) to authenticated;
grant execute on function public.request_report_preview(uuid) to authenticated;
