-- A tested package can be accepted as the next production release without
-- becoming the active package. This retains its evidence, keeps it out of new
-- test choices, and makes publishing a separate explicit decision.
alter table public.agent_packages
  drop constraint if exists agent_packages_status_check;

alter table public.agent_packages
  add constraint agent_packages_status_check
  check (status in ('draft', 'test_ready', 'production_ready', 'published', 'superseded'));

alter table public.agent_packages
  add column if not exists staged_behaviour_ids jsonb not null default '[]'::jsonb
  check (jsonb_typeof(staged_behaviour_ids) = 'array');

create or replace function public.stage_agent_package_behaviours(
  target_package_id uuid,
  requested_staged_behaviour_ids jsonb
)
returns public.agent_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  target_package public.agent_packages;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if jsonb_typeof(requested_staged_behaviour_ids) <> 'array' or exists (
    select 1 from jsonb_array_elements(requested_staged_behaviour_ids) as value
    where jsonb_typeof(value) <> 'string' or char_length(value #>> '{}') > 120
  ) then
    raise exception 'Choose valid behaviour identifiers to stage.';
  end if;

  select * into target_package from public.agent_packages where id = target_package_id for update;
  if target_package.id is null
    or not public.is_organization_member(target_package.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_package.status <> 'test_ready' then
    raise exception 'Only a test-ready package can stage behaviours for production.';
  end if;

  update public.agent_packages
  set staged_behaviour_ids = requested_staged_behaviour_ids
  where id = target_package.id
  returning * into target_package;
  return target_package;
end;
$$;

create or replace function public.approve_agent_package_for_production(target_package_id uuid)
returns public.agent_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  target_package public.agent_packages;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  select * into target_package
  from public.agent_packages
  where id = target_package_id
  for update;

  if target_package.id is null
    or not public.is_organization_member(target_package.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_package.status <> 'test_ready' then
    raise exception 'Only a test-ready package can be saved as a production draft.';
  end if;
  if not exists (
    select 1 from public.builder_runs
    where organization_id = target_package.organization_id
      and agent_package_id = target_package.id
      and build_mode = 'homepage_test'
      and status in ('ready', 'review_required')
  ) then
    raise exception 'Complete and review a private homepage test before saving this production draft.';
  end if;

  update public.agent_packages
  set status = 'production_ready'
  where id = target_package.id
  returning * into target_package;

  return target_package;
end;
$$;

create or replace function public.promote_agent_package(target_package_id uuid)
returns public.agent_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  target_package public.agent_packages;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into target_package from public.agent_packages where id = target_package_id for update;
  if target_package.id is null
    or not public.is_organization_member(target_package.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_package.status <> 'production_ready' then
    raise exception 'Save this tested package as a production draft before publishing it.';
  end if;
  if not exists (
    select 1 from public.builder_runs
    where organization_id = target_package.organization_id
      and agent_package_id = target_package.id
      and build_mode = 'homepage_test'
      and status in ('ready', 'review_required')
  ) then
    raise exception 'Complete and review a homepage test using this package before publishing.';
  end if;

  update public.agent_packages
  set status = 'superseded'
  where organization_id = target_package.organization_id and status = 'published';

  update public.agent_packages
  set status = 'published', published_at = now()
  where id = target_package.id
  returning * into target_package;

  return target_package;
end;
$$;

grant execute on function public.approve_agent_package_for_production(uuid) to authenticated;
grant execute on function public.stage_agent_package_behaviours(uuid, jsonb) to authenticated;
grant execute on function public.promote_agent_package(uuid) to authenticated;
