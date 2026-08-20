-- One public-site capture fans out into independent, durable specialist audit tasks. Specialists
-- consume the exact saved capture and preserve their observations for human review.
create table public.audit_specialist_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  audit_id uuid not null references public.audits on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs on delete cascade,
  specialist_kind text not null check (specialist_kind in (
    'responsive_ui', 'accessibility', 'performance_engineering', 'technical_seo',
    'conversion_journey', 'platform_integrations'
  )),
  status public.job_status not null default 'queued',
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  progress_phase text not null default 'queued',
  progress_detail text,
  total_items integer not null default 0 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id, specialist_kind)
);

create index audit_specialist_tasks_claim_idx
  on public.audit_specialist_tasks (status, lease_expires_at, created_at);
create index audit_specialist_tasks_business_idx
  on public.audit_specialist_tasks (business_id, created_at desc);

create table public.audit_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  audit_id uuid not null references public.audits on delete cascade,
  specialist_task_id uuid not null references public.audit_specialist_tasks on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs on delete cascade,
  specialist_kind text not null check (specialist_kind in (
    'responsive_ui', 'accessibility', 'performance_engineering', 'technical_seo',
    'conversion_journey', 'platform_integrations'
  )),
  area text not null check (area in (
    'UI', 'UX', 'Mobile', 'Accessibility', 'SEO', 'Performance', 'Platform',
    'Content', 'Trust', 'Conversion'
  )),
  finding_class text not null check (finding_class in (
    'observed_defect', 'observed_condition', 'usability_concern', 'design_judgement'
  )),
  severity text not null check (severity in ('high', 'medium', 'low')),
  title text not null,
  observation text not null,
  customer_impact text not null default '',
  recommendation text not null,
  source_urls text[] not null default '{}',
  evidence_fact_ids uuid[] not null default '{}',
  evidence_artifact_ids uuid[] not null default '{}',
  viewport jsonb,
  interaction_state text,
  selector text,
  measurement jsonb not null default '{}'::jsonb,
  confidence text not null default 'high' check (confidence in ('high', 'medium', 'low')),
  review_state public.review_state not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(source_urls) > 0),
  unique (specialist_task_id, title)
);

create index audit_observations_audit_idx
  on public.audit_observations (audit_id, specialist_kind, severity);

alter table public.audit_findings
  drop constraint if exists audit_findings_area_check;
alter table public.audit_findings
  add constraint audit_findings_area_check check (area in (
    'UI', 'UX', 'Mobile', 'Accessibility', 'SEO', 'Performance', 'Platform',
    'Content', 'Trust', 'Conversion'
  )),
  add column if not exists specialist_task_id uuid references public.audit_specialist_tasks on delete cascade,
  add column if not exists specialist_kind text,
  add column if not exists finding_class text,
  add column if not exists customer_impact text not null default '',
  add column if not exists confidence text not null default 'high',
  add column if not exists evidence_artifact_ids uuid[] not null default '{}';

-- Frozen report snapshots are created only through the reviewed RPC below. A later approval or
-- edit creates another version; an earlier version is never updated in place.
create table public.decision_report_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  audit_id uuid not null references public.audits on delete restrict,
  crawl_run_id uuid not null references public.crawl_runs on delete restrict,
  version integer not null check (version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  review_state public.review_state not null default 'needs_review',
  summary text not null default '',
  data jsonb not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, version)
);

create index decision_report_versions_business_idx
  on public.decision_report_versions (business_id, version desc);

alter table public.audit_specialist_tasks enable row level security;
alter table public.audit_observations enable row level security;
alter table public.decision_report_versions enable row level security;

create policy "Members can read specialist audit tasks" on public.audit_specialist_tasks
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "Members can read specialist audit observations" on public.audit_observations
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "Members can review specialist audit observations" on public.audit_observations
  for update to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy "Members can read frozen decision reports" on public.decision_report_versions
  for select to authenticated using (public.is_organization_member(organization_id));

create trigger set_audit_specialist_tasks_updated_at
  before update on public.audit_specialist_tasks
  for each row execute procedure public.set_updated_at();
create trigger set_audit_observations_updated_at
  before update on public.audit_observations
  for each row execute procedure public.set_updated_at();

create or replace function public.refresh_specialist_audit(target_audit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_audit public.audits; task_total integer; ready_total integer; active_total integer; failed_total integer;
begin
  select * into target_audit from public.audits where id = target_audit_id for update;
  if target_audit.id is null then return; end if;
  select count(*), count(*) filter (where status = 'ready'),
    count(*) filter (where status in ('queued', 'running')),
    count(*) filter (where status = 'failed')
  into task_total, ready_total, active_total, failed_total
  from public.audit_specialist_tasks where audit_id = target_audit_id;
  if target_audit.cancel_requested_at is not null then
    update public.audits set status = 'failed', worker_id = null, lease_expires_at = null,
      total_items = task_total, completed_items = ready_total + failed_total,
      progress_phase = 'cancelled', progress_detail = 'Specialist audit cancelled. Saved observations remain private.',
      error_summary = 'Website audit cancelled by a workspace user.' where id = target_audit_id;
  elsif active_total > 0 then
    update public.audits set status = 'running', total_items = task_total,
      completed_items = ready_total + failed_total, progress_phase = 'specialist_analysis',
      progress_detail = format('%s of %s specialist sections finished.', ready_total + failed_total, task_total)
    where id = target_audit_id;
  elsif task_total = 6 and ready_total = 6 then
    update public.audits set status = 'ready', worker_id = null, lease_expires_at = null,
      total_items = task_total, completed_items = task_total,
      progress_phase = 'complete',
      progress_detail = 'All six specialist audit sections are ready for human review.',
      error_summary = null
    where id = target_audit_id;
    update public.businesses set stage = 'audit_ready'
      where id = target_audit.business_id and stage in ('identified', 'researching');
  elsif task_total > 0 then
    update public.audits set status = 'failed', worker_id = null, lease_expires_at = null,
      total_items = task_total, completed_items = task_total, progress_phase = 'failed',
      progress_detail = case
        when failed_total > 0 then format('%s of 6 specialist sections failed. Saved observations remain private.', failed_total)
        else format('The audit finished with %s of 6 required specialist sections.', ready_total)
      end,
      error_summary = case
        when failed_total > 0 then format('%s specialist sections failed.', failed_total)
        else 'The audit did not produce all six required specialist sections.'
      end where id = target_audit_id;
  end if;
end; $$;

create or replace function public.refresh_specialist_audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.refresh_specialist_audit(new.audit_id); return new; end; $$;
create trigger refresh_parent_specialist_audit
  after insert or update of status on public.audit_specialist_tasks
  for each row execute procedure public.refresh_specialist_audit_trigger();

create or replace function public.request_website_audit(target_business_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_organization_id uuid; latest_capture_id uuid; active_audit_id uuid;
  requested_audit_id uuid; next_version integer; specialist text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select organization_id into target_organization_id from public.businesses where id = target_business_id;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  select runs.id into latest_capture_id from public.crawl_runs runs
    join public.websites websites on websites.id = runs.website_id
    where websites.business_id = target_business_id and runs.status = 'ready'
    order by runs.completed_at desc nulls last, runs.requested_at desc limit 1;
  if latest_capture_id is null then raise exception 'A completed website capture is required before an audit can be generated.'; end if;
  select id into active_audit_id from public.audits where business_id = target_business_id
    and crawl_run_id = latest_capture_id and status in ('queued', 'running')
    order by version desc limit 1;
  if active_audit_id is not null then return active_audit_id; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.audits where business_id = target_business_id;
  insert into public.audits (organization_id, business_id, crawl_run_id, status, version,
    progress_phase, progress_detail, total_items, completed_items)
  values (target_organization_id, target_business_id, latest_capture_id, 'queued', next_version,
    'queued', 'Specialist website audit queued from the completed private capture.', 6, 0)
  returning id into requested_audit_id;
  foreach specialist in array array['responsive_ui','accessibility','performance_engineering',
    'technical_seo','conversion_journey','platform_integrations'] loop
    insert into public.audit_specialist_tasks (organization_id, business_id, audit_id, crawl_run_id,
      specialist_kind, status, progress_phase, progress_detail)
    values (target_organization_id, target_business_id, requested_audit_id, latest_capture_id,
      specialist, 'queued', 'queued', 'Waiting for the protected specialist worker.');
  end loop;
  insert into public.activities (organization_id, business_id, type, message) values
    (target_organization_id, target_business_id, 'note',
     'Specialist website audit requested from one immutable capture. Six private sections were queued.');
  return requested_audit_id;
end; $$;

create or replace function public.claim_next_audit_specialist_task(worker_identity text)
returns setof public.audit_specialist_tasks language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  if char_length(trim(worker_identity)) = 0 or char_length(trim(worker_identity)) > 120 then
    raise exception 'A valid worker identity is required.';
  end if;
  update public.audit_specialist_tasks set status = 'failed', worker_id = null, lease_expires_at = null,
    progress_phase = 'failed', progress_detail = 'The specialist worker lease expired after repeated attempts.',
    error_summary = 'Specialist worker lease expired after repeated attempts.'
  where status = 'running' and lease_expires_at < now() and attempt_count >= 3;
  return query with candidate as (
    select tasks.id from public.audit_specialist_tasks tasks join public.audits audits on audits.id = tasks.audit_id
    where (tasks.status = 'queued' or (tasks.status = 'running' and tasks.lease_expires_at < now()))
      and tasks.cancel_requested_at is null and audits.cancel_requested_at is null and tasks.attempt_count < 3
    order by tasks.created_at, tasks.specialist_kind for update of tasks skip locked limit 1
  ) update public.audit_specialist_tasks tasks set status = 'running', worker_id = trim(worker_identity),
    lease_expires_at = now() + interval '15 minutes', attempt_count = tasks.attempt_count + 1,
    progress_phase = 'reading_evidence', progress_detail = 'Loading evidence from the task''s immutable capture.',
    error_summary = null from candidate where tasks.id = candidate.id returning tasks.*;
end; $$;

create or replace function public.cancel_website_audit(target_business_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_organization_id uuid; target_audit public.audits; cancelled_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select organization_id into target_organization_id from public.businesses where id = target_business_id;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  select * into target_audit from public.audits where business_id = target_business_id
    and status in ('queued','running') order by version desc limit 1 for update;
  if target_audit.id is null then raise exception 'There is no active website audit to cancel.'; end if;
  update public.audits set cancel_requested_at = cancelled_at where id = target_audit.id;
  update public.audit_specialist_tasks set cancel_requested_at = cancelled_at,
    status = case when status = 'queued' then 'failed' else status end,
    progress_phase = 'cancelled',
    progress_detail = 'Cancellation requested. The worker will stop at its next safe checkpoint.',
    error_summary = 'Specialist audit cancelled by a workspace user.'
    where audit_id = target_audit.id and status in ('queued','running');
  perform public.refresh_specialist_audit(target_audit.id);
  return target_audit.id;
end; $$;

create or replace function public.create_audit_report_version(target_business_id uuid, target_audit_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_organization_id uuid; target_audit public.audits; next_version integer;
  report_id uuid; approved_count integer; task_count integer; ready_task_count integer;
  low_confidence_count integer; review_pending_count integer; unsupported_count integer; report_data jsonb;
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
  if approved_count = 0 then raise exception 'Approve at least one evidence-linked observation before freezing a report version.'; end if;
  select count(*) into review_pending_count from public.audit_observations
    where audit_id = target_audit_id and review_state = 'needs_review';
  if review_pending_count > 0 then
    raise exception 'Every specialist observation must be approved or excluded before freezing a report.';
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
      observations.created_at), '[]'::jsonb),
    'methodology', jsonb_build_array(
      'One bounded public-site capture supplied the immutable source evidence used by independent specialist workers.',
      'Every finding in this version was approved by a human reviewer before the report was frozen.',
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

revoke all on table public.audit_specialist_tasks from anon;
revoke all on table public.audit_observations from anon;
revoke all on table public.decision_report_versions from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.audit_specialist_tasks from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.audit_observations from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.decision_report_versions from authenticated;
grant select on table public.audit_specialist_tasks to authenticated;
grant select on table public.audit_observations to authenticated;
grant update (review_state) on table public.audit_observations to authenticated;
grant select on table public.decision_report_versions to authenticated;

revoke all on function public.refresh_specialist_audit(uuid) from public, anon, authenticated;
revoke all on function public.refresh_specialist_audit_trigger() from public, anon, authenticated;
revoke all on function public.claim_next_audit_specialist_task(text) from public, anon, authenticated;
grant execute on function public.claim_next_audit_specialist_task(text) to service_role;
revoke all on function public.request_website_audit(uuid) from public, anon;
revoke all on function public.cancel_website_audit(uuid) from public, anon;
revoke all on function public.create_audit_report_version(uuid, uuid) from public, anon;
grant execute on function public.request_website_audit(uuid) to authenticated;
grant execute on function public.cancel_website_audit(uuid) to authenticated;
grant execute on function public.create_audit_report_version(uuid, uuid) to authenticated;
