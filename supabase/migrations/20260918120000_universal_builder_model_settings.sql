-- Persist one organization-wide website-builder profile and snapshot it onto
-- every new run before the worker can claim it.
create table if not exists public.website_builder_preferences (
  organization_id uuid primary key references public.organizations on delete cascade,
  page_test_model text,
  page_test_reasoning_effort text,
  site_test_model text,
  site_test_reasoning_effort text,
  full_site_model text,
  full_site_reasoning_effort text,
  updated_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_builder_page_profile_complete check (
    (page_test_model is null and page_test_reasoning_effort is null)
    or (nullif(trim(page_test_model), '') is not null and nullif(trim(page_test_reasoning_effort), '') is not null)
  ),
  constraint website_builder_site_profile_complete check (
    (site_test_model is null and site_test_reasoning_effort is null)
    or (nullif(trim(site_test_model), '') is not null and nullif(trim(site_test_reasoning_effort), '') is not null)
  ),
  constraint website_builder_full_profile_complete check (
    (full_site_model is null and full_site_reasoning_effort is null)
    or (nullif(trim(full_site_model), '') is not null and nullif(trim(full_site_reasoning_effort), '') is not null)
  ),
  constraint website_builder_model_lengths check (
    char_length(coalesce(page_test_model, '')) <= 100
    and char_length(coalesce(site_test_model, '')) <= 100
    and char_length(coalesce(full_site_model, '')) <= 100
  ),
  constraint website_builder_effort_lengths check (
    char_length(coalesce(page_test_reasoning_effort, '')) <= 40
    and char_length(coalesce(site_test_reasoning_effort, '')) <= 40
    and char_length(coalesce(full_site_reasoning_effort, '')) <= 40
  )
);

alter table public.website_builder_preferences enable row level security;

grant select, insert, update on table public.website_builder_preferences to authenticated;
grant all on table public.website_builder_preferences to service_role;

create policy "Members can read website builder preferences"
  on public.website_builder_preferences for select to authenticated
  using (public.is_organization_member(organization_id));

create policy "Members can insert website builder preferences"
  on public.website_builder_preferences for insert to authenticated
  with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

create policy "Members can update website builder preferences"
  on public.website_builder_preferences for update to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id) and updated_by = auth.uid());

create trigger set_website_builder_preferences_updated_at
  before update on public.website_builder_preferences
  for each row execute procedure public.set_updated_at();

alter table public.builder_runs
  add column if not exists reasoning_effort text,
  add column if not exists codex_runtime_version text,
  add column if not exists execution_profile_source text
    check (execution_profile_source in ('recommended', 'custom', 'environment'));

create or replace function public.snapshot_website_builder_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferences public.website_builder_preferences;
begin
  select * into preferences
  from public.website_builder_preferences
  where organization_id = new.organization_id;

  if new.build_mode in ('homepage_test', 'page_test') then
    new.model := coalesce(new.model, preferences.page_test_model, 'gpt-5.6-terra');
    new.reasoning_effort := coalesce(
      new.reasoning_effort,
      preferences.page_test_reasoning_effort,
      'medium'
    );
    new.execution_profile_source := coalesce(
      new.execution_profile_source,
      case when preferences.page_test_model is null then 'recommended' else 'custom' end
    );
  elsif new.build_mode = 'site_test' then
    new.model := coalesce(new.model, preferences.site_test_model, 'gpt-5.6-sol');
    new.reasoning_effort := coalesce(
      new.reasoning_effort,
      preferences.site_test_reasoning_effort,
      'high'
    );
    new.execution_profile_source := coalesce(
      new.execution_profile_source,
      case when preferences.site_test_model is null then 'recommended' else 'custom' end
    );
  else
    new.model := coalesce(new.model, preferences.full_site_model, 'gpt-5.6-sol');
    new.reasoning_effort := coalesce(
      new.reasoning_effort,
      preferences.full_site_reasoning_effort,
      'high'
    );
    new.execution_profile_source := coalesce(
      new.execution_profile_source,
      case when preferences.full_site_model is null then 'recommended' else 'custom' end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_website_builder_profile on public.builder_runs;
create trigger snapshot_website_builder_profile
  before insert on public.builder_runs
  for each row execute procedure public.snapshot_website_builder_profile();

-- Register the package-visible builder behaviour without changing production.
insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, contract_addendum, instructions_addendum, summary,
  capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select
  base.organization_id, 27.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.2', base.foundation_version,
  'Every website build and Agent Studio test snapshots the effective organization-wide Codex model, reasoning effort, runtime version, and agent package. Page tests, whole-site tests, and full builds retain separate recommended or custom profiles.',
  'Discover selectable models and reasoning levels from the authenticated Codex runtime catalogue. Persist one owner-visible builder preference per workflow class, apply it to every build entry point, and copy the resolved profile onto each queued run before a worker can claim it. Never rewrite an earlier run when settings change.',
  'Universal builder model settings test package: adds one editable Settings source for every website build and test with immutable per-run execution details.',
  'foundation_change_required',
  'Makes model selection consistent and auditable across prospect builds and Agent Studio tests while retaining economical page-test and quality-first full-site defaults.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.1'
  and not exists (
    select 1 from public.agent_packages existing
    where existing.organization_id = base.organization_id
      and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.2'
  );
