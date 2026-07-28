alter table public.asset_analysis_jobs
  add column if not exists editable_logo_vectorizer_provider text not null default 'vtracer'
  check (editable_logo_vectorizer_provider in ('vtracer', 'vectorizer_ai'));

drop function if exists public.request_editable_logo_retry(uuid, boolean);

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
  insert into public.asset_analysis_jobs (organization_id, business_id, crawl_run_id, status, editable_logo_retry_asset_id, editable_logo_retry_token, editable_logo_simplification_enabled, editable_logo_vectorizer_provider)
  values (target_organization_id, target_business_id, target_crawl_run_id, 'queued', target_asset_id, gen_random_uuid(), simplify_geometry, requested_provider)
  on conflict (crawl_run_id) do update set
    status = 'queued', worker_id = null, lease_expires_at = null, attempt_count = 0, cancel_requested_at = null,
    progress_phase = 'queued', progress_detail = 'Editable SVG retry requested. Waiting for the protected worker.', current_asset_id = null, total_items = 0, completed_items = 0, error_summary = null,
    editable_logo_retry_asset_id = excluded.editable_logo_retry_asset_id, editable_logo_retry_token = excluded.editable_logo_retry_token,
    editable_logo_simplification_enabled = excluded.editable_logo_simplification_enabled,
    editable_logo_vectorizer_provider = excluded.editable_logo_vectorizer_provider
  returning id into requested_job_id;
  insert into public.activities (organization_id, business_id, type, message) values (target_organization_id, target_business_id, 'note', 'Editable SVG retry requested. Earlier private SVG variants remain available for comparison.');
  return requested_job_id;
end;
$$;

grant execute on function public.request_editable_logo_retry(uuid, boolean, text) to authenticated;
