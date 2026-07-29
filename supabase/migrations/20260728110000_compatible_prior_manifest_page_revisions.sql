-- A completed page may be used as a design baseline after a Brand Kit/Brief
-- revision when both manifests still point at the same immutable capture and
-- Research Packet. The new run remains pinned to the current manifest and its
-- approved assets; this does not permit evidence from another capture.
create or replace function public.request_website_build(
  target_business_id uuid,
  requested_mode text default 'homepage_test',
  requested_target_source_url text default null,
  requested_build_instruction text default null,
  requested_agent_package_id uuid default null,
  requested_source_builder_run_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_manifest public.build_manifests;
  existing_run public.builder_runs;
  source_run public.builder_runs;
  source_manifest public.build_manifests;
  selected_package public.agent_packages;
  requested_run_id uuid;
  requested_instruction text := nullif(trim(coalesce(requested_build_instruction, '')), '');
  source_is_selected boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if requested_mode not in ('homepage_test', 'page_test', 'full_site') then
    raise exception 'A valid website build mode is required.';
  end if;
  if requested_instruction is not null and char_length(requested_instruction) > 4000 then
    raise exception 'Build direction must be 4,000 characters or fewer.';
  end if;

  select organization_id into target_organization_id
  from public.businesses
  where id = target_business_id;
  if target_organization_id is null
    or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select * into target_manifest
  from public.build_manifests
  where business_id = target_business_id
    and organization_id = target_organization_id
    and status = 'ready'
  order by generated_at desc
  limit 1;
  if target_manifest.id is null then
    raise exception 'An approved Build Manifest is required before a private preview can be generated.';
  end if;

  if requested_mode = 'full_site' then
    select * into selected_package
    from public.agent_packages
    where organization_id = target_organization_id and status = 'published'
    order by version desc
    limit 1;
    if requested_agent_package_id is not null
      and requested_agent_package_id <> selected_package.id then
      raise exception 'Complete prospect builds always use the current published agent package.';
    end if;
    if requested_source_builder_run_id is not null then
      raise exception 'Complete prospect builds cannot revise a private test page.';
    end if;
  else
    select * into selected_package
    from public.agent_packages
    where id = coalesce(
      requested_agent_package_id,
      (
        select id
        from public.agent_packages
        where organization_id = target_organization_id and status = 'published'
        order by version desc
        limit 1
      )
    )
      and organization_id = target_organization_id;
    if selected_package.id is null
      or selected_package.status not in ('published', 'test_ready') then
      raise exception 'Choose a published package or a draft package approved for testing.';
    end if;
  end if;
  if selected_package.id is null then
    raise exception 'No published agent package is available.';
  end if;

  if requested_mode = 'page_test' then
    if requested_target_source_url is null
      or trim(requested_target_source_url) = '' then
      raise exception 'Choose a selected source page to build.';
    end if;
    select exists (
      select 1
      from jsonb_array_elements(
        coalesce(target_manifest.data -> 'selectedPages', '[]'::jsonb)
      ) as page
      where page ->> 'url' = requested_target_source_url
        and coalesce(nullif(trim(page ->> 'url'), ''), '') <> ''
    ) into source_is_selected;
    if not source_is_selected then
      raise exception 'The selected page is not part of this Build Manifest.';
    end if;
  elsif requested_target_source_url is not null then
    raise exception 'Only a page build may target a single source page.';
  end if;

  if requested_source_builder_run_id is not null then
    select * into source_run
    from public.builder_runs as candidate
    where candidate.id = requested_source_builder_run_id
      and candidate.organization_id = target_organization_id
      and candidate.business_id = target_business_id
      and candidate.build_mode in ('homepage_test', 'page_test')
      and candidate.status in ('ready', 'review_required')
      and exists (
        select 1
        from public.builder_artifacts
        where builder_run_id = candidate.id and kind = 'checkpoint'
      );
    if source_run.id is null then
      raise exception 'Choose a completed private test page with saved source before revising it.';
    end if;

    select * into source_manifest
    from public.build_manifests
    where id = source_run.build_manifest_id
      and organization_id = target_organization_id
      and business_id = target_business_id;
    if source_manifest.id is null
      or source_manifest.crawl_run_id <> target_manifest.crawl_run_id
      or source_manifest.research_packet_id <> target_manifest.research_packet_id then
      raise exception 'The selected private page is based on different research and cannot be rebased onto this manifest.';
    end if;
    if source_run.target_source_url is distinct from requested_target_source_url then
      raise exception 'A revision must keep the selected private page target.';
    end if;
  end if;

  select * into existing_run
  from public.builder_runs
  where business_id = target_business_id
    and build_manifest_id = target_manifest.id
    and build_mode = requested_mode
    and agent_package_id = selected_package.id
    and coalesce(target_source_url, '') = coalesce(requested_target_source_url, '')
    and coalesce(build_instruction, '') = coalesce(requested_instruction, '')
    and parent_builder_run_id is not distinct from requested_source_builder_run_id
    and status in ('queued', 'running', 'paused')
  order by created_at desc
  limit 1;
  if existing_run.id is not null then return existing_run.id; end if;

  -- Only page tests and complete prospect builds infer a prerequisite source.
  -- A homepage test with no explicit source is a fresh build by contract.
  if source_run.id is null and requested_mode in ('page_test', 'full_site') then
    select * into source_run
    from public.builder_runs as candidate
    where candidate.business_id = target_business_id
      and candidate.build_manifest_id = target_manifest.id
      and candidate.build_mode in ('homepage_test', 'page_test')
      and candidate.agent_package_id = selected_package.id
      and candidate.status in ('ready', 'review_required')
      and exists (
        select 1
        from public.builder_artifacts
        where builder_run_id = candidate.id and kind = 'checkpoint'
      )
    order by created_at desc
    limit 1;
  end if;
  if requested_mode in ('page_test', 'full_site') and source_run.id is null then
    raise exception 'Complete a homepage test using this agent package before building another page or the full website.';
  end if;

  insert into public.builder_runs (
    organization_id,
    business_id,
    build_manifest_id,
    parent_builder_run_id,
    build_mode,
    target_source_url,
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
    source_run.id,
    requested_mode,
    requested_target_source_url,
    requested_instruction,
    selected_package.id,
    'queued',
    selected_package.foundation_version,
    'queued',
    case
      when requested_source_builder_run_id is not null and requested_mode = 'homepage_test'
        then 'Waiting to rebase the homepage test onto the current approved assets.'
      when requested_source_builder_run_id is not null and requested_mode = 'page_test'
        then 'Waiting to rebase the selected page test onto the current approved assets.'
      when requested_mode = 'homepage_test'
        then 'Waiting to build the homepage test preview.'
      when requested_mode = 'page_test'
        then 'Waiting to build the selected page test preview.'
      else 'Waiting to build the full website preview.'
    end
  ) returning id into requested_run_id;
  return requested_run_id;
end;
$$;

grant execute on function public.request_website_build(uuid, text, text, text, uuid, uuid)
  to authenticated;
