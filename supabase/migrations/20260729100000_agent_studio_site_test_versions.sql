-- Completed private builds can be promoted into Agent Studio as immutable,
-- multi-page test sources. Each focused site test keeps the full source checkpoint
-- and records an explicit parent so the Studio can render a version lineage.
alter table public.builder_runs
  drop constraint if exists builder_runs_build_mode_check;

alter table public.builder_runs
  add constraint builder_runs_build_mode_check
  check (build_mode in ('homepage_test', 'page_test', 'site_test', 'full_site'));

alter table public.builder_runs
  add column if not exists agent_studio_source_at timestamptz,
  add column if not exists agent_studio_feature_id text;

create index if not exists builder_runs_agent_studio_source_idx
  on public.builder_runs (organization_id, business_id, agent_studio_source_at desc)
  where agent_studio_source_at is not null;

create or replace function public.move_builder_run_to_agent_studio(
  target_builder_run_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_run public.builder_runs;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  select * into target_run
  from public.builder_runs
  where id = target_builder_run_id;

  if target_run.id is null
    or not public.is_organization_member(target_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_run.status not in ('ready', 'review_required') then
    raise exception 'Only a completed private build can move into Agent Studio.';
  end if;
  if target_run.build_mode not in ('homepage_test', 'page_test', 'site_test', 'full_site') then
    raise exception 'This build cannot be used as an Agent Studio source.';
  end if;
  if not exists (
    select 1
    from public.builder_artifacts
    where builder_run_id = target_run.id and kind = 'checkpoint'
  ) then
    raise exception 'This build has no saved source checkpoint for Agent Studio.';
  end if;

  update public.builder_runs
  set agent_studio_source_at = coalesce(agent_studio_source_at, now()),
      updated_at = now()
  where id = target_run.id;

  if target_run.agent_studio_source_at is null then
    insert into public.activities (organization_id, business_id, type, message)
    values (
      target_run.organization_id,
      target_run.business_id,
      'note',
      'Completed private build moved into Agent Studio as a versioned test source.'
    );
  end if;

  return target_run.id;
end;
$$;

grant execute on function public.move_builder_run_to_agent_studio(uuid) to authenticated;

create or replace function public.request_agent_studio_site_test(
  target_source_builder_run_id uuid,
  requested_build_instruction text,
  requested_agent_package_id uuid,
  requested_feature_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_run public.builder_runs;
  selected_package public.agent_packages;
  requested_run_id uuid;
  requested_instruction text := nullif(trim(coalesce(requested_build_instruction, '')), '');
  feature_id text := nullif(trim(coalesce(requested_feature_id, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  select * into source_run
  from public.builder_runs
  where id = target_source_builder_run_id;

  if source_run.id is null
    or not public.is_organization_member(source_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if source_run.agent_studio_source_at is null then
    raise exception 'Move this completed build into Agent Studio before creating a test version.';
  end if;
  if source_run.status not in ('ready', 'review_required')
    or source_run.build_mode not in ('homepage_test', 'page_test', 'site_test', 'full_site') then
    raise exception 'Choose a completed Agent Studio source version.';
  end if;
  if not exists (
    select 1
    from public.builder_artifacts
    where builder_run_id = source_run.id and kind = 'checkpoint'
  ) then
    raise exception 'The selected source version has no saved source checkpoint.';
  end if;
  if requested_instruction is null then
    raise exception 'Describe the feature behaviour this test should implement.';
  end if;
  if char_length(requested_instruction) > 4000 then
    raise exception 'Feature direction must be 4,000 characters or fewer.';
  end if;
  if feature_id is null or feature_id !~ '^[a-z0-9][a-z0-9-]{1,79}$' then
    raise exception 'A valid Agent Studio feature identifier is required.';
  end if;

  select * into selected_package
  from public.agent_packages
  where id = requested_agent_package_id
    and organization_id = source_run.organization_id
    and status in ('published', 'test_ready');
  if selected_package.id is null then
    raise exception 'Choose a published package or a draft package approved for testing.';
  end if;

  select id into requested_run_id
  from public.builder_runs
  where parent_builder_run_id = source_run.id
    and build_mode = 'site_test'
    and agent_package_id = selected_package.id
    and agent_studio_feature_id = feature_id
    and coalesce(build_instruction, '') = requested_instruction
    and status in ('queued', 'running', 'paused')
  order by created_at desc
  limit 1;
  if requested_run_id is not null then return requested_run_id; end if;

  insert into public.builder_runs (
    organization_id,
    business_id,
    build_manifest_id,
    parent_builder_run_id,
    build_mode,
    build_instruction,
    agent_package_id,
    agent_studio_source_at,
    agent_studio_feature_id,
    status,
    template_version,
    progress_phase,
    progress_detail
  ) values (
    source_run.organization_id,
    source_run.business_id,
    source_run.build_manifest_id,
    source_run.id,
    'site_test',
    requested_instruction,
    selected_package.id,
    now(),
    feature_id,
    'queued',
    selected_package.foundation_version,
    'queued',
    'Waiting to create a feature-only multi-page Agent Studio test version.'
  ) returning id into requested_run_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    source_run.organization_id,
    source_run.business_id,
    'note',
    'Agent Studio queued a linked multi-page test version for feature "' || feature_id || '".'
  );

  return requested_run_id;
end;
$$;

grant execute on function public.request_agent_studio_site_test(uuid, text, uuid, text)
  to authenticated;
