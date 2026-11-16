insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.1', base.foundation_version, base.foundation_checksum,
  'Agent Studio device-preview launches immediately render a secure-access waiting document in the user-opened tab. Preview capability creation runs concurrently with selected-entry-page resolution, and the tab navigates only after the exact private URL is ready.',
  'Keep private preview capability tokens out of Studio routes and visible loading copy. Open the waiting tab only from the reviewer gesture, announce that secure private access is being prepared, respect reduced motion, overlap independent capability and entry-page lookups, then replace that exact tab with the device preview URL.',
  'Responsive preview launch test package: replaces the slow blank mobile tab with an accessible secure-preview loading state and concurrent private-access preparation.',
  'foundation_change_required',
  'Makes Agent Studio previews feel responsive on mobile without weakening popup handling or the private preview capability boundary.',
  '["package-behaviour","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.1'
);
