alter table public.asset_analysis_jobs
  add column if not exists analysis_scope text not null default 'full'
  check (analysis_scope in ('full', 'logo_versions', 'brand_colours'));

create or replace function public.request_asset_analysis(target_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  latest_capture_id uuid;
  existing_job public.asset_analysis_jobs;
  requested_job_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select organization_id into target_organization_id from public.businesses where id = target_business_id;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  select runs.id into latest_capture_id
  from public.crawl_runs runs
  join public.websites websites on websites.id = runs.website_id
  where websites.business_id = target_business_id and runs.status = 'ready'
  order by runs.completed_at desc nulls last, runs.requested_at desc
  limit 1;
  if latest_capture_id is null then
    raise exception 'A completed website capture is required before assets can be analysed.';
  end if;
  select * into existing_job from public.asset_analysis_jobs where crawl_run_id = latest_capture_id;
  if existing_job.id is not null and existing_job.status in ('queued', 'running')
    and existing_job.cancel_requested_at is null then return existing_job.id; end if;

  insert into public.asset_analysis_jobs (
    organization_id, business_id, crawl_run_id, status, run_token, analysis_scope,
    worker_contract_version
  ) values (
    target_organization_id, target_business_id, latest_capture_id, 'queued', gen_random_uuid(),
    'full', 2
  )
  on conflict (crawl_run_id) do update set
    status = 'queued', run_token = gen_random_uuid(), analysis_scope = 'full',
    worker_contract_version = 2, worker_id = null, lease_expires_at = null,
    heartbeat_at = null, attempt_count = 0, cancel_requested_at = null,
    progress_phase = 'queued',
    progress_detail = 'Private visual-asset analysis requested. Waiting for the protected worker.',
    current_asset_id = null, total_items = 0, completed_items = 0, error_summary = null,
    editable_logo_retry_asset_id = null, editable_logo_retry_token = null,
    editable_logo_simplification_enabled = false,
    editable_logo_vectorizer_provider = 'vtracer'
  returning id into requested_job_id;
  insert into public.activities (organization_id, business_id, type, message)
  values (target_organization_id, target_business_id, 'note',
    'Private visual-asset analysis requested. Suggestions require human review before reuse.');
  return requested_job_id;
end;
$$;

create or replace function public.request_brand_colour_refresh(target_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  latest_capture_id uuid;
  selected_logo_id uuid;
  existing_job public.asset_analysis_jobs;
  requested_job_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  select organization_id into target_organization_id
  from public.businesses
  where id = target_business_id;
  if target_organization_id is null
    or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select runs.id into latest_capture_id
  from public.crawl_runs runs
  join public.websites websites on websites.id = runs.website_id
  where websites.business_id = target_business_id
    and runs.status = 'ready'
  order by runs.completed_at desc nulls last, runs.requested_at desc
  limit 1;
  if latest_capture_id is null then
    raise exception 'A completed website capture is required before logo colours can be refreshed.';
  end if;

  select primary_logo_artifact_id into selected_logo_id
  from public.brand_kits
  where business_id = target_business_id
  order by version desc
  limit 1;
  if selected_logo_id is null or not exists (
    select 1 from public.artifacts
    where id = selected_logo_id
      and business_id = target_business_id
      and crawl_run_id = latest_capture_id
      and kind = 'asset'
  ) then
    raise exception 'Choose an original primary logo in the Brand Kit before redoing its colours.';
  end if;

  select * into existing_job
  from public.asset_analysis_jobs
  where crawl_run_id = latest_capture_id;
  if existing_job.id is not null
    and existing_job.status in ('queued', 'running')
    and existing_job.cancel_requested_at is null then
    return existing_job.id;
  end if;

  insert into public.asset_analysis_jobs (
    organization_id, business_id, crawl_run_id, status, run_token, analysis_scope,
    worker_contract_version
  ) values (
    target_organization_id, target_business_id, latest_capture_id, 'queued', gen_random_uuid(),
    'brand_colours', 2
  )
  on conflict (crawl_run_id) do update set
    status = 'queued', run_token = gen_random_uuid(), analysis_scope = 'brand_colours',
    worker_contract_version = 2, worker_id = null, lease_expires_at = null,
    heartbeat_at = null, attempt_count = 0, cancel_requested_at = null,
    progress_phase = 'queued',
    progress_detail = 'Original-logo colour refresh requested. Waiting for the protected worker.',
    current_asset_id = null, total_items = 0, completed_items = 0, error_summary = null,
    editable_logo_retry_asset_id = null, editable_logo_retry_token = null,
    editable_logo_simplification_enabled = false,
    editable_logo_vectorizer_provider = 'vtracer'
  returning id into requested_job_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id, target_business_id, 'note',
    'Original-logo colours queued for a private evidence refresh. Other assets will not be reanalysed.'
  );
  return requested_job_id;
end;
$$;

-- Keep each entry point explicit about its job scope so a previous targeted run can never leak
-- into a later full analysis or logo-version retry.
create or replace function public.set_asset_analysis_scope_on_request()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.editable_logo_retry_asset_id is not null then
    new.analysis_scope := 'logo_versions';
  elsif new.analysis_scope <> 'brand_colours' then
    new.analysis_scope := 'full';
  end if;
  return new;
end;
$$;

drop trigger if exists set_asset_analysis_scope_on_request on public.asset_analysis_jobs;
create trigger set_asset_analysis_scope_on_request
before insert or update of editable_logo_retry_asset_id, analysis_scope
on public.asset_analysis_jobs
for each row execute function public.set_asset_analysis_scope_on_request();

grant execute on function public.request_brand_colour_refresh(uuid) to authenticated;
grant execute on function public.request_asset_analysis(uuid) to authenticated;
