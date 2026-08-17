-- Register immediate one-click setup from ready editable source without changing production.
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
  'made-solid-studio-builder-agent-v10.5',
  base.foundation_version,
  base.foundation_checksum,
  'A completed build with safe editable-source evidence can be opened directly from its Editable source is ready section. The same local action exports source when no repository exists or safely updates the private repository when it does.',
  'Place the labelled Open local workspace action beside the ready source evidence instead of gating it on repository publication. Use a deterministic ignored prospect-workspaces destination, prepare dependencies, and keep the exact command in a collapsed manual fallback.',
  'Immediate source workspace test package: makes one-click local setup visible as soon as editable build source is ready.',
  'foundation_change_required',
  'Lets development begin from completed source without first creating or locating a separate GitHub repository while retaining the repository-backed path when available.',
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
      and existing.summary like 'Immediate source workspace test package:%'
  );
