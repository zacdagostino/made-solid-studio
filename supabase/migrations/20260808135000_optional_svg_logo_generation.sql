alter table public.asset_analysis_jobs
  add column if not exists editable_logo_generation_enabled boolean not null default false;

create or replace function public.keep_svg_generation_explicit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.editable_logo_retry_asset_id is null then
    new.editable_logo_generation_enabled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_svg_generation_explicit on public.asset_analysis_jobs;
create trigger keep_svg_generation_explicit
before insert or update on public.asset_analysis_jobs
for each row execute function public.keep_svg_generation_explicit();

drop function if exists public.prospect_generated_logo_deletion_paths(uuid);
create function public.prospect_generated_logo_deletion_paths(
  p_asset_id uuid,
  include_editable_svg boolean default false
)
returns table (storage_bucket text, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  source_asset public.artifacts%rowtype;
begin
  select * into source_asset
  from public.artifacts
  where id = p_asset_id and kind = 'asset';

  if not found then raise exception 'The organisation logo could not be found.'; end if;
  if not public.is_organization_member(source_asset.organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  return query
  select artifacts.storage_bucket, artifacts.storage_path
  from public.artifacts
  where artifacts.business_id = source_asset.business_id
    and artifacts.kind = 'asset'
    and artifacts.metadata ->> 'derivedFromAssetId' = source_asset.id::text
    and (
      coalesce(artifacts.metadata ->> 'logoVariant', '') in ('ai_enhanced', 'alpha_matte', 'appearance')
      or (
        include_editable_svg
        and coalesce(artifacts.metadata ->> 'logoVariant', '') = 'editable'
      )
    );
end;
$$;

drop function if exists public.request_editable_logo_retry(uuid, boolean, text);
create function public.request_editable_logo_retry(
  target_asset_id uuid,
  simplify_geometry boolean default false,
  vectorizer_provider text default 'vtracer',
  create_editable_svg boolean default false
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
  select organization_id, business_id, crawl_run_id
  into target_organization_id, target_business_id, target_crawl_run_id
  from public.artifacts
  where id = target_asset_id and kind = 'asset';
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_crawl_run_id is null or not exists (
    select 1 from public.crawl_runs where id = target_crawl_run_id and status = 'ready'
  ) then
    raise exception 'A completed website capture is required before creating logo versions.';
  end if;

  delete from public.artifacts
  where business_id = target_business_id
    and kind = 'asset'
    and metadata ->> 'derivedFromAssetId' = target_asset_id::text
    and (
      coalesce(metadata ->> 'logoVariant', '') in ('ai_enhanced', 'alpha_matte', 'appearance')
      or (create_editable_svg and coalesce(metadata ->> 'logoVariant', '') = 'editable')
    );

  insert into public.asset_analysis_jobs (
    organization_id, business_id, crawl_run_id, status, run_token,
    editable_logo_retry_asset_id, editable_logo_retry_token,
    editable_logo_generation_enabled, editable_logo_simplification_enabled,
    editable_logo_vectorizer_provider
  ) values (
    target_organization_id, target_business_id, target_crawl_run_id, 'queued', gen_random_uuid(),
    target_asset_id, gen_random_uuid(), create_editable_svg, simplify_geometry, requested_provider
  )
  on conflict (crawl_run_id) do update set
    status = 'queued', run_token = gen_random_uuid(), worker_id = null,
    lease_expires_at = null, heartbeat_at = null, attempt_count = 0,
    cancel_requested_at = null, progress_phase = 'queued',
    progress_detail = case
      when create_editable_svg then 'Logo versions and an editable SVG requested. Waiting for the protected conversion worker.'
      else 'Logo versions requested with SVG creation off. Waiting for the protected conversion worker.'
    end,
    current_asset_id = null, total_items = 0, completed_items = 0, error_summary = null,
    editable_logo_retry_asset_id = excluded.editable_logo_retry_asset_id,
    editable_logo_retry_token = excluded.editable_logo_retry_token,
    editable_logo_generation_enabled = excluded.editable_logo_generation_enabled,
    editable_logo_simplification_enabled = excluded.editable_logo_simplification_enabled,
    editable_logo_vectorizer_provider = excluded.editable_logo_vectorizer_provider
  returning id into requested_job_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id,
    target_business_id,
    'note',
    case
      when create_editable_svg then 'Fresh transparent logo versions and an editable SVG were requested.'
      else 'Fresh transparent logo versions were requested with SVG creation off.'
    end
  );
  return requested_job_id;
end;
$$;

revoke all on function public.prospect_generated_logo_deletion_paths(uuid, boolean) from public;
grant execute on function public.prospect_generated_logo_deletion_paths(uuid, boolean) to authenticated;
revoke all on function public.request_editable_logo_retry(uuid, boolean, text, boolean) from public;
grant execute on function public.request_editable_logo_retry(uuid, boolean, text, boolean) to authenticated;
