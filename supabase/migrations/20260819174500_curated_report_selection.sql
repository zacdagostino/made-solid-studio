-- A reviewed report is an intentional shortlist. Unselected observations remain private source
-- material and do not need a review decision before the approved shortlist can be frozen.
create or replace function public.create_audit_report_version(target_business_id uuid, target_audit_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_organization_id uuid; target_audit public.audits; next_version integer;
  report_id uuid; approved_count integer; task_count integer; ready_task_count integer;
  low_confidence_count integer; unsupported_count integer; report_data jsonb;
  target_business_name text; latest_capture_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select organization_id, name into target_organization_id, target_business_name
    from public.businesses where id = target_business_id for update;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  select * into target_audit from public.audits where id = target_audit_id
    and business_id = target_business_id and status = 'ready';
  if target_audit.id is null then raise exception 'A completed specialist audit is required.'; end if;
  select runs.id into latest_capture_id from public.crawl_runs runs
    join public.websites websites on websites.id = runs.website_id
    where websites.business_id = target_business_id and runs.status = 'ready'
    order by runs.completed_at desc nulls last, runs.requested_at desc limit 1;
  if latest_capture_id is null or target_audit.crawl_run_id is distinct from latest_capture_id then
    raise exception 'The specialist audit must reference the latest completed website capture.';
  end if;
  select count(*), count(*) filter (
    where status = 'ready' and crawl_run_id = target_audit.crawl_run_id
      and business_id = target_business_id and organization_id = target_organization_id
  ) into task_count, ready_task_count from public.audit_specialist_tasks
    where audit_id = target_audit_id;
  if task_count <> 6 or ready_task_count <> 6 then
    raise exception 'All six required specialist sections must complete against the report capture.';
  end if;
  perform 1 from public.audit_observations where audit_id = target_audit_id for update;
  select count(*) into approved_count from public.audit_observations
    where audit_id = target_audit_id and review_state = 'approved';
  if approved_count = 0 then
    raise exception 'Approve at least one evidence-linked observation before freezing a report version.';
  end if;
  select count(*) into low_confidence_count from public.audit_observations
    where audit_id = target_audit_id and review_state = 'approved' and confidence = 'low';
  if low_confidence_count > 0 then
    raise exception 'Low-confidence observations must be excluded or strengthened before freezing a report.';
  end if;
  select count(*) into unsupported_count from public.audit_observations observations
    where observations.audit_id = target_audit_id
      and observations.review_state = 'approved'
      and (
        observations.business_id <> target_business_id
        or observations.organization_id <> target_organization_id
        or observations.crawl_run_id <> target_audit.crawl_run_id
        or not exists (
          select 1 from public.audit_specialist_tasks tasks
          where tasks.id = observations.specialist_task_id
            and tasks.audit_id = target_audit_id
            and tasks.business_id = target_business_id
            and tasks.organization_id = target_organization_id
            and tasks.crawl_run_id = target_audit.crawl_run_id
            and tasks.specialist_kind = observations.specialist_kind
            and tasks.status = 'ready'
        )
        or (not exists (
          select 1 from public.evidence_facts facts
          where facts.id = any(observations.evidence_fact_ids)
            and facts.business_id = target_business_id
            and facts.crawl_run_id = target_audit.crawl_run_id
        )
        and not exists (
          select 1 from public.artifacts artifacts
          where artifacts.id = any(observations.evidence_artifact_ids)
            and artifacts.business_id = target_business_id
            and artifacts.crawl_run_id = target_audit.crawl_run_id
        )));
  if unsupported_count > 0 then
    raise exception 'Every approved observation needs resolvable evidence from the report capture.';
  end if;
  select coalesce(max(version), 0) + 1 into next_version from public.decision_report_versions
    where business_id = target_business_id;
  select jsonb_build_object(
    'schemaVersion', 1, 'auditId', target_audit.id, 'crawlRunId', target_audit.crawl_run_id,
    'generatedAt', now(), 'version', next_version,
    'title', format('%s website report', target_business_name),
    'summary', 'A practical, evidence-led review of the current website experience and the improvements worth prioritising.',
    'scope', jsonb_build_array(
      'Responsive UI at 375 x 812, 768 x 1024, and 1440 x 900',
      'Accessibility and keyboard-relevant structure',
      'Performance engineering and page delivery',
      'Technical SEO and content structure',
      'Conversion journeys and visible trust',
      'Platform and integration signals'
    ),
    'findings', coalesce(jsonb_agg(jsonb_build_object(
      'id', observations.id, 'specialistKind', observations.specialist_kind,
      'area', observations.area, 'findingClass', observations.finding_class,
      'priority', observations.severity, 'severity', observations.severity,
      'title', observations.title, 'observation', observations.observation,
      'finding', observations.observation, 'impact', observations.customer_impact,
      'customerImpact', observations.customer_impact,
      'recommendation', observations.recommendation, 'sourceUrls', observations.source_urls,
      'evidenceFactIds', observations.evidence_fact_ids,
      'evidenceArtifactIds', observations.evidence_artifact_ids,
      'viewport', observations.viewport, 'measurement', observations.measurement,
      'confidence', observations.confidence
    ) order by case observations.severity when 'high' then 1 when 'medium' then 2 else 3 end,
      coalesce((observations.measurement->>'priorityScore')::integer, 0) desc,
      observations.created_at), '[]'::jsonb),
    'methodology', jsonb_build_array(
      'One bounded public-site capture supplied the immutable source evidence used by independent specialist workers.',
      'Every finding in this version was approved by a human reviewer before the report was frozen.',
      'Unselected observations remain private audit material and are not presented to the client.',
      'Measurements describe the tested page, viewport, and capture conditions rather than guaranteeing a business outcome.'
    ),
    'limitations', jsonb_build_array(
      'The review does not include private analytics, authenticated pages, submitted forms, or claims about future traffic, rankings, or revenue.'
    ),
    'nextStep', 'Talk through which improvements best match the business and its customers.'
  ) into report_data from public.audit_observations observations
    where observations.audit_id = target_audit_id and observations.review_state = 'approved';
  insert into public.decision_report_versions (organization_id, business_id, audit_id, crawl_run_id,
    version, schema_version, review_state, summary, data, created_by)
  values (target_organization_id, target_business_id, target_audit.id, target_audit.crawl_run_id,
    next_version, 1, 'approved', format('%s approved website observations frozen in this reviewed report.', approved_count),
    report_data, auth.uid()) returning id into report_id;
  return report_id;
end; $$;

revoke all on function public.create_audit_report_version(uuid, uuid) from public;
grant execute on function public.create_audit_report_version(uuid, uuid) to authenticated;
