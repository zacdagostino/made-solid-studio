insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.9',
  base.foundation_version, base.foundation_checksum,
  'The live editable Railway Studio always starts Vite with a clean development dependency graph, so React development transforms receive the matching jsxDEV runtime instead of rendering a blank page from a stale production optimizer cache.',
  'Launch the Railway Vite server with NODE_ENV unset, explicit development mode, and forced dependency optimization. Keep the editable persistent Studio checkout as the source root, retain the authenticated runtime plugin, and verify the public Studio renders without page errors at mobile, tablet, and desktop widths. Preserve workspace.madesolid.com.au re-entry through the authenticated Studio route.',
  'Renderable Railway Studio test package: prevents the blank live Studio screen by rebuilding Vite dependencies with the matching React development runtime.',
  'foundation_change_required',
  'Makes the permanent editable Studio reliably render after live source changes and Railway restarts without replacing either persistent repository.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.9'
);
