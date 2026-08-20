-- Register the embedded local prospect workspace without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v10.3',
  base.foundation_version,
  base.foundation_checksum,
  'Editable prospect repositories may live under the Studio-owned prospect-workspaces directory, which is excluded from Studio version control. The local workspace command clones or fast-forwards the private repository, preserves local changes, verifies the Made Solid refinement ledger, and installs locked dependencies.',
  'Present the repository-relative prospect-workspaces path and the npm workspace:open command instead of a Codespaces link. Authenticate private clone and pull operations through the configured GitHub CLI without exposing credentials or embedding them in repository URLs.',
  'Embedded prospect workspace test package: keeps editable prospect repositories inside the current Studio workspace with refinement logging intact.',
  'foundation_change_required',
  'Removes the separate Codespace dependency while retaining private GitHub history, safe updates, installed dependencies, and auditable refinement logging.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Embedded prospect workspace test package:%'
  );
