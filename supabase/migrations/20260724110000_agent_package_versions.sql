create table public.agent_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'test_ready', 'published', 'superseded')),
  base_package_id uuid references public.agent_packages on delete restrict,
  builder_contract_version text not null check (char_length(trim(builder_contract_version)) > 0),
  foundation_version text not null check (char_length(trim(foundation_version)) > 0),
  foundation_checksum text,
  contract_addendum text not null default '' check (char_length(contract_addendum) <= 12000),
  instructions_addendum text not null default '' check (char_length(instructions_addendum) <= 12000),
  summary text not null default '' check (char_length(summary) <= 2000),
  capability_assessment text not null default 'policy_only'
    check (capability_assessment in ('policy_only', 'foundation_change_required')),
  capability_proposal text,
  created_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, version)
);

create unique index agent_packages_one_published_per_organization_idx
  on public.agent_packages (organization_id)
  where status = 'published';

create index agent_packages_organization_version_idx
  on public.agent_packages (organization_id, version desc);

create table public.agent_package_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  base_package_id uuid not null references public.agent_packages on delete restrict,
  draft_package_id uuid references public.agent_packages on delete set null,
  direction text not null check (char_length(direction) between 1 and 4000),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'accepted', 'rejected')),
  summary text,
  contract_addendum text,
  instructions_addendum text,
  capability_assessment text
    check (capability_assessment in ('policy_only', 'foundation_change_required')),
  capability_proposal text,
  model text,
  worker_id text,
  lease_expires_at timestamptz,
  error_summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_package_proposals_organization_created_idx
  on public.agent_package_proposals (organization_id, created_at desc);
create index agent_package_proposals_worker_lease_idx
  on public.agent_package_proposals (status, lease_expires_at);

alter table public.agent_packages enable row level security;
alter table public.agent_package_proposals enable row level security;

create policy "Members can read agent packages" on public.agent_packages
  for select to authenticated
  using (public.is_organization_member(organization_id));

create policy "Members can read agent package proposals" on public.agent_package_proposals
  for select to authenticated
  using (public.is_organization_member(organization_id));

create trigger set_agent_packages_updated_at before update on public.agent_packages
  for each row execute procedure public.set_updated_at();
create trigger set_agent_package_proposals_updated_at before update on public.agent_package_proposals
  for each row execute procedure public.set_updated_at();

insert into public.agent_packages (
  organization_id,
  version,
  status,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  summary,
  published_at
)
select
  organizations.id,
  4,
  'published',
  'siteforge-codex-builder-v4',
  'siteforge-static-builder-v1',
  'legacy-source-controlled-foundation',
  'Current source-controlled production builder package. This legacy baseline predates immutable package snapshots.',
  now()
from public.organizations as organizations
on conflict (organization_id, version) do nothing;

alter table public.builder_runs
  add column if not exists agent_package_id uuid references public.agent_packages on delete restrict;

update public.builder_runs as runs
set agent_package_id = packages.id
from public.agent_packages as packages
where packages.organization_id = runs.organization_id
  and packages.status = 'published'
  and runs.agent_package_id is null;

create index builder_runs_agent_package_idx
  on public.builder_runs (agent_package_id, created_at desc);

create or replace function public.request_agent_package_proposal(
  target_base_package_id uuid,
  requested_direction text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_package public.agent_packages;
  proposal_id uuid;
  clean_direction text := nullif(trim(coalesce(requested_direction, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if clean_direction is null or char_length(clean_direction) > 4000 then
    raise exception 'A package direction between 1 and 4,000 characters is required.';
  end if;

  select * into target_package
  from public.agent_packages
  where id = target_base_package_id
  for update;
  if target_package.id is null
    or target_package.status <> 'published'
    or not public.is_organization_member(target_package.organization_id) then
    raise exception 'Choose the current published agent package as the base for a proposal.';
  end if;

  insert into public.agent_package_proposals (
    organization_id, base_package_id, direction, status, created_by
  ) values (
    target_package.organization_id, target_package.id, clean_direction, 'queued', auth.uid()
  ) returning id into proposal_id;

  return proposal_id;
end;
$$;

create or replace function public.claim_next_agent_package_proposal(worker_identity text)
returns setof public.agent_package_proposals
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select id
    from public.agent_package_proposals
    where status = 'queued'
       or (status = 'running' and lease_expires_at < now())
    order by created_at
    for update skip locked
    limit 1
  )
  update public.agent_package_proposals as proposals
  set
    status = 'running',
    worker_id = worker_identity,
    lease_expires_at = now() + interval '5 minutes',
    error_summary = null
  from candidate
  where proposals.id = candidate.id
  returning proposals.*;
end;
$$;

create or replace function public.complete_agent_package_proposal(
  target_proposal_id uuid,
  worker_identity text,
  proposal_summary text,
  proposal_contract_addendum text,
  proposal_instructions_addendum text,
  proposal_capability_assessment text,
  proposal_capability_proposal text,
  proposal_model text
)
returns public.agent_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal public.agent_package_proposals;
  base_package public.agent_packages;
  draft_package public.agent_packages;
  next_version integer;
begin
  select * into proposal from public.agent_package_proposals
  where id = target_proposal_id and worker_id = worker_identity
  for update;
  if proposal.id is null or proposal.status <> 'running' then
    raise exception 'The package proposal is no longer leased by this worker.';
  end if;
  if proposal_capability_assessment not in ('policy_only', 'foundation_change_required') then
    raise exception 'The proposal capability assessment is invalid.';
  end if;
  if char_length(coalesce(proposal_contract_addendum, '')) > 12000
    or char_length(coalesce(proposal_instructions_addendum, '')) > 12000
    or char_length(coalesce(proposal_summary, '')) > 2000 then
    raise exception 'The generated package proposal exceeded the safe size limit.';
  end if;

  select * into base_package from public.agent_packages
  where id = proposal.base_package_id
  for update;
  if base_package.id is null or base_package.status <> 'published' then
    raise exception 'The base package is no longer published.';
  end if;

  perform pg_advisory_xact_lock(hashtext(base_package.organization_id::text));
  select coalesce(max(version), 0) + 1 into next_version
  from public.agent_packages
  where organization_id = base_package.organization_id;

  insert into public.agent_packages (
    organization_id, version, status, base_package_id, builder_contract_version,
    foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
    summary, capability_assessment, capability_proposal, created_by
  ) values (
    base_package.organization_id, next_version, 'draft', base_package.id,
    base_package.builder_contract_version, base_package.foundation_version,
    base_package.foundation_checksum, coalesce(proposal_contract_addendum, ''),
    coalesce(proposal_instructions_addendum, ''), coalesce(proposal_summary, ''),
    proposal_capability_assessment, nullif(trim(coalesce(proposal_capability_proposal, '')), ''),
    proposal.created_by
  ) returning * into draft_package;

  update public.agent_package_proposals
  set
    status = 'ready',
    draft_package_id = draft_package.id,
    summary = draft_package.summary,
    contract_addendum = draft_package.contract_addendum,
    instructions_addendum = draft_package.instructions_addendum,
    capability_assessment = draft_package.capability_assessment,
    capability_proposal = draft_package.capability_proposal,
    model = proposal_model,
    worker_id = null,
    lease_expires_at = null,
    error_summary = null
  where id = proposal.id;

  return draft_package;
end;
$$;

create or replace function public.approve_agent_package_for_testing(target_package_id uuid)
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
  if target_package.status <> 'draft' then
    raise exception 'Only a draft package can be approved for testing.';
  end if;
  if target_package.capability_assessment = 'foundation_change_required' then
    raise exception 'This proposal needs a reviewed builder-foundation code change before it can be tested.';
  end if;

  update public.agent_packages
  set status = 'test_ready', approved_at = now()
  where id = target_package.id
  returning * into target_package;

  update public.agent_package_proposals
  set status = 'accepted'
  where draft_package_id = target_package.id and status = 'ready';

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
  if target_package.status <> 'test_ready' then
    raise exception 'Approve this draft package for testing before promotion.';
  end if;
  if target_package.capability_assessment <> 'policy_only' then
    raise exception 'A builder-foundation change must be implemented and released before this package can be promoted.';
  end if;
  if not exists (
    select 1 from public.builder_runs
    where organization_id = target_package.organization_id
      and agent_package_id = target_package.id
      and build_mode = 'homepage_test'
      and status in ('ready', 'review_required')
  ) then
    raise exception 'Complete and review a homepage test using this package before promotion.';
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

drop function if exists public.request_website_build(uuid, text, text, text);

create function public.request_website_build(
  target_business_id uuid,
  requested_mode text default 'homepage_test',
  requested_target_source_url text default null,
  requested_build_instruction text default null,
  requested_agent_package_id uuid default null
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

  select organization_id into target_organization_id from public.businesses where id = target_business_id;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select * into target_manifest from public.build_manifests
  where business_id = target_business_id and organization_id = target_organization_id and status = 'ready'
  order by generated_at desc limit 1;
  if target_manifest.id is null then
    raise exception 'An approved Build Manifest is required before a private preview can be generated.';
  end if;

  if requested_mode = 'full_site' then
    select * into selected_package from public.agent_packages
    where organization_id = target_organization_id and status = 'published'
    order by version desc limit 1;
    if requested_agent_package_id is not null and requested_agent_package_id <> selected_package.id then
      raise exception 'Complete prospect builds always use the current published agent package.';
    end if;
  else
    select * into selected_package from public.agent_packages
    where id = coalesce(requested_agent_package_id, (
      select id from public.agent_packages
      where organization_id = target_organization_id and status = 'published'
      order by version desc limit 1
    )) and organization_id = target_organization_id;
    if selected_package.id is null or selected_package.status not in ('published', 'test_ready') then
      raise exception 'Choose a published package or a draft package approved for testing.';
    end if;
  end if;
  if selected_package.id is null then raise exception 'No published agent package is available.'; end if;

  if requested_mode = 'page_test' then
    if requested_target_source_url is null or trim(requested_target_source_url) = '' then
      raise exception 'Choose a selected source page to build.';
    end if;
    select exists (
      select 1 from jsonb_array_elements(coalesce(target_manifest.data -> 'selectedPages', '[]'::jsonb)) as page
      where page ->> 'url' = requested_target_source_url and coalesce(nullif(trim(page ->> 'url'), ''), '') <> ''
    ) into source_is_selected;
    if not source_is_selected then raise exception 'The selected page is not part of this Build Manifest.'; end if;
  elsif requested_target_source_url is not null then
    raise exception 'Only a page build may target a single source page.';
  end if;

  select * into existing_run from public.builder_runs
  where business_id = target_business_id and build_manifest_id = target_manifest.id
    and build_mode = requested_mode and agent_package_id = selected_package.id
    and coalesce(target_source_url, '') = coalesce(requested_target_source_url, '')
    and coalesce(build_instruction, '') = coalesce(requested_instruction, '')
    and status in ('queued', 'running', 'paused')
  order by created_at desc limit 1;
  if existing_run.id is not null then return existing_run.id; end if;

  if requested_mode = 'homepage_test' then
    select * into source_run from public.builder_runs as candidate
    where candidate.business_id = target_business_id and candidate.build_manifest_id = target_manifest.id
      and candidate.build_mode = 'homepage_test' and candidate.agent_package_id = selected_package.id
      and candidate.status in ('ready', 'review_required')
      and exists (select 1 from public.builder_artifacts where builder_run_id = candidate.id and kind = 'checkpoint')
    order by created_at desc limit 1;
  else
    select * into source_run from public.builder_runs as candidate
    where candidate.business_id = target_business_id and candidate.build_manifest_id = target_manifest.id
      and candidate.build_mode in ('homepage_test', 'page_test') and candidate.agent_package_id = selected_package.id
      and candidate.status in ('ready', 'review_required')
      and exists (select 1 from public.builder_artifacts where builder_run_id = candidate.id and kind = 'checkpoint')
    order by created_at desc limit 1;
  end if;
  if requested_mode in ('page_test', 'full_site') and source_run.id is null then
    raise exception 'Complete a homepage test using this agent package before building another page or the full website.';
  end if;

  insert into public.builder_runs (
    organization_id, business_id, build_manifest_id, parent_builder_run_id, build_mode,
    target_source_url, build_instruction, agent_package_id, status, template_version,
    progress_phase, progress_detail
  ) values (
    target_organization_id, target_business_id, target_manifest.id, source_run.id, requested_mode,
    requested_target_source_url, requested_instruction, selected_package.id, 'queued',
    selected_package.foundation_version, 'queued',
    case requested_mode
      when 'homepage_test' then 'Waiting to build the homepage test preview.'
      when 'page_test' then 'Waiting to build the selected page test preview.'
      else 'Waiting to build the full website preview.'
    end
  ) returning id into requested_run_id;

  return requested_run_id;
end;
$$;

revoke all on function public.claim_next_agent_package_proposal(text) from public, anon, authenticated;
revoke all on function public.complete_agent_package_proposal(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.request_agent_package_proposal(uuid, text) to authenticated;
grant execute on function public.approve_agent_package_for_testing(uuid) to authenticated;
grant execute on function public.promote_agent_package(uuid) to authenticated;
grant execute on function public.claim_next_agent_package_proposal(text) to service_role;
grant execute on function public.complete_agent_package_proposal(uuid, text, text, text, text, text, text, text) to service_role;
grant execute on function public.request_website_build(uuid, text, text, text, uuid) to authenticated;
