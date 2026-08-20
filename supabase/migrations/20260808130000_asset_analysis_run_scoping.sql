alter table public.asset_analysis_jobs
  add column if not exists run_token uuid not null default gen_random_uuid();

alter table public.asset_annotations
  add column if not exists analysis_run_token uuid;

update public.asset_annotations annotations
set analysis_run_token = jobs.run_token
from public.asset_analysis_jobs jobs
where annotations.analysis_job_id = jobs.id
  and annotations.analysis_run_token is null;

create index if not exists asset_annotations_analysis_run_idx
  on public.asset_annotations (analysis_run_token, analyzed_at);

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
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

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
    raise exception 'A completed website capture is required before assets can be analysed.';
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
    organization_id,
    business_id,
    crawl_run_id,
    status,
    run_token
  )
  values (
    target_organization_id,
    target_business_id,
    latest_capture_id,
    'queued',
    gen_random_uuid()
  )
  on conflict (crawl_run_id) do update set
    status = 'queued',
    run_token = gen_random_uuid(),
    worker_id = null,
    lease_expires_at = null,
    heartbeat_at = null,
    attempt_count = 0,
    cancel_requested_at = null,
    progress_phase = 'queued',
    progress_detail = 'Private visual-asset analysis requested. Waiting for the protected worker.',
    current_asset_id = null,
    total_items = 0,
    completed_items = 0,
    error_summary = null,
    editable_logo_retry_asset_id = null,
    editable_logo_retry_token = null,
    editable_logo_simplification_enabled = false,
    editable_logo_vectorizer_provider = 'vtracer'
  returning id into requested_job_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id,
    target_business_id,
    'note',
    'Private visual-asset analysis requested. Suggestions require human review before reuse.'
  );
  return requested_job_id;
end;
$$;

create or replace function public.request_editable_logo_retry(
  target_asset_id uuid,
  simplify_geometry boolean default false,
  vectorizer_provider text default 'vtracer'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_business_id uuid;
  target_crawl_run_id uuid;
  requested_job_id uuid;
  requested_provider text := case when vectorizer_provider = 'vectorizer_ai' then 'vectorizer_ai' else 'vtracer' end;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select organization_id, business_id, crawl_run_id into target_organization_id, target_business_id, target_crawl_run_id
  from public.artifacts where id = target_asset_id and kind = 'asset';
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then raise exception 'Organization membership is required.'; end if;
  if target_crawl_run_id is null or not exists (select 1 from public.crawl_runs where id = target_crawl_run_id and status = 'ready') then raise exception 'A completed website capture is required before retrying SVG conversion.'; end if;

  delete from public.artifacts
  where business_id = target_business_id
    and kind = 'asset'
    and metadata ->> 'derivedFromAssetId' = target_asset_id::text
    and coalesce(metadata ->> 'logoVariant', '') in ('ai_enhanced', 'alpha_matte', 'appearance', 'editable');

  insert into public.asset_analysis_jobs (organization_id, business_id, crawl_run_id, status, run_token, editable_logo_retry_asset_id, editable_logo_retry_token, editable_logo_simplification_enabled, editable_logo_vectorizer_provider)
  values (target_organization_id, target_business_id, target_crawl_run_id, 'queued', gen_random_uuid(), target_asset_id, gen_random_uuid(), simplify_geometry, requested_provider)
  on conflict (crawl_run_id) do update set
    status = 'queued', run_token = gen_random_uuid(), worker_id = null, lease_expires_at = null, heartbeat_at = null, attempt_count = 0, cancel_requested_at = null,
    progress_phase = 'queued', progress_detail = 'Logo versions cleared. Waiting for the protected conversion worker.', current_asset_id = null, total_items = 0, completed_items = 0, error_summary = null,
    editable_logo_retry_asset_id = excluded.editable_logo_retry_asset_id, editable_logo_retry_token = excluded.editable_logo_retry_token,
    editable_logo_simplification_enabled = excluded.editable_logo_simplification_enabled,
    editable_logo_vectorizer_provider = excluded.editable_logo_vectorizer_provider
  returning id into requested_job_id;
  insert into public.activities (organization_id, business_id, type, message) values (target_organization_id, target_business_id, 'note', 'Generated logo versions cleared. A fresh private conversion was requested.');
  return requested_job_id;
end;
$$;

grant execute on function public.request_asset_analysis(uuid) to authenticated;
grant execute on function public.request_editable_logo_retry(uuid, boolean, text) to authenticated;
