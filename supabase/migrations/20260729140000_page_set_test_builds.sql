-- Agent Studio may build an exact set of approved pages together from the
-- clean locked foundation. Historic single-page tests and revisions continue
-- through the existing six-argument request function.
alter table public.builder_runs
  add column if not exists target_source_urls text[] not null default '{}'::text[];

create index if not exists builder_runs_target_source_urls_idx
  on public.builder_runs using gin (target_source_urls);

create or replace function public.request_website_build(
  target_business_id uuid,
  requested_mode text,
  requested_target_source_url text,
  requested_build_instruction text,
  requested_agent_package_id uuid,
  requested_source_builder_run_id uuid,
  requested_target_source_urls text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_manifest public.build_manifests;
  selected_package public.agent_packages;
  existing_run public.builder_runs;
  requested_run_id uuid;
  requested_instruction text := nullif(trim(coalesce(requested_build_instruction, '')), '');
  selected_url_count integer;
  manifest_url_count integer;
begin
  if coalesce(cardinality(requested_target_source_urls), 0) = 0 then
    return public.request_website_build(
      target_business_id,
      requested_mode,
      requested_target_source_url,
      requested_build_instruction,
      requested_agent_package_id,
      requested_source_builder_run_id
    );
  end if;

  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if requested_mode <> 'page_test' then
    raise exception 'A page-set build must use page test mode.';
  end if;
  if requested_target_source_url is not null then
    raise exception 'Choose either one legacy page target or a page set, not both.';
  end if;
  if requested_source_builder_run_id is not null then
    raise exception 'A page-set test starts from the clean builder foundation.';
  end if;
  if requested_instruction is not null and char_length(requested_instruction) > 4000 then
    raise exception 'Build direction must be 4,000 characters or fewer.';
  end if;
  if exists (
    select 1
    from unnest(requested_target_source_urls) as requested_url
    where requested_url is null or trim(requested_url) = ''
  ) then
    raise exception 'Every selected page must have a valid source URL.';
  end if;

  select count(distinct requested_url)
  into selected_url_count
  from unnest(requested_target_source_urls) as requested_url;
  if selected_url_count <> cardinality(requested_target_source_urls) then
    raise exception 'The selected page set contains a duplicate source URL.';
  end if;

  select organization_id
  into target_organization_id
  from public.businesses
  where id = target_business_id;
  if target_organization_id is null
    or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select *
  into target_manifest
  from public.build_manifests
  where business_id = target_business_id
    and organization_id = target_organization_id
    and status = 'ready'
  order by generated_at desc
  limit 1;
  if target_manifest.id is null then
    raise exception 'An approved Build Manifest is required before a private preview can be generated.';
  end if;

  select count(distinct page ->> 'url')
  into manifest_url_count
  from jsonb_array_elements(
    coalesce(target_manifest.data -> 'selectedPages', '[]'::jsonb)
  ) as page
  where page ->> 'url' = any(requested_target_source_urls);
  if manifest_url_count <> selected_url_count then
    raise exception 'Every page in the selected set must belong to the current Build Manifest.';
  end if;

  select *
  into selected_package
  from public.agent_packages
  where id = coalesce(
    requested_agent_package_id,
    (
      select id
      from public.agent_packages
      where organization_id = target_organization_id
        and status = 'published'
      order by version desc
      limit 1
    )
  )
    and organization_id = target_organization_id;
  if selected_package.id is null
    or selected_package.status not in ('published', 'test_ready') then
    raise exception 'Choose a published package or a draft package approved for testing.';
  end if;

  select *
  into existing_run
  from public.builder_runs
  where business_id = target_business_id
    and build_manifest_id = target_manifest.id
    and build_mode = 'page_test'
    and agent_package_id = selected_package.id
    and target_source_url is null
    and target_source_urls = requested_target_source_urls
    and coalesce(build_instruction, '') = coalesce(requested_instruction, '')
    and parent_builder_run_id is null
    and status in ('queued', 'running', 'paused')
  order by created_at desc
  limit 1;
  if existing_run.id is not null then
    return existing_run.id;
  end if;

  insert into public.builder_runs (
    organization_id,
    business_id,
    build_manifest_id,
    parent_builder_run_id,
    build_mode,
    target_source_url,
    target_source_urls,
    build_instruction,
    agent_package_id,
    status,
    template_version,
    progress_phase,
    progress_detail
  ) values (
    target_organization_id,
    target_business_id,
    target_manifest.id,
    null,
    'page_test',
    null,
    requested_target_source_urls,
    requested_instruction,
    selected_package.id,
    'queued',
    selected_package.foundation_version,
    'queued',
    'Waiting to build the selected page set from the clean foundation.'
  )
  returning id into requested_run_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id,
    target_business_id,
    'note',
    'Agent Studio queued a clean page-set test for '
      || selected_url_count
      || case when selected_url_count = 1 then ' selected page.' else ' selected pages.' end
  );

  return requested_run_id;
end;
$$;

grant execute on function public.request_website_build(
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  text[]
) to authenticated;
