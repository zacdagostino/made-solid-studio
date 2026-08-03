-- Package releases use one decimal place so refinements remain visibly ordered
-- inside the same package generation (for example v6.1, then v6.2).
drop trigger if exists set_agent_package_contract_version on public.agent_packages;

alter table public.agent_packages
  alter column version type numeric(10, 1)
  using version::numeric(10, 1);

create or replace function public.set_agent_package_contract_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.builder_contract_version :=
    'made-solid-studio-builder-agent-v' || new.version::text;
  return new;
end;
$$;

create trigger set_agent_package_contract_version
before insert or update of version on public.agent_packages
for each row execute procedure public.set_agent_package_contract_version();

update public.agent_packages
set builder_contract_version =
  'made-solid-studio-builder-agent-v' || version::text
where builder_contract_version is distinct from
  'made-solid-studio-builder-agent-v' || version::text;

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
  next_version numeric(10, 1);
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
  select coalesce(max(version), 0) + 0.1 into next_version
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
