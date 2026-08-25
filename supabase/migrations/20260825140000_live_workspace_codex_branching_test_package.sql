insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.8',
  base.foundation_version, base.foundation_checksum,
  'Branching remains available in the editable Workspace Studio as soon as its source changes, even while the separately reviewed production API image is still on the preceding release.',
  'Serve the native thread-fork mutation through a narrow owner-gateway-protected Workspace endpoint loaded from the persistent Studio checkout. Keep ordinary chat delivery on the established runtime worker, never start a second queue maintainer, accept legacy completed-turn status only for button visibility, and revalidate completion and exact workspace scope in the current bridge before forking.',
  'Live Workspace Codex branching test package: makes the Branch control and native fork available immediately from editable Studio source.',
  'foundation_change_required',
  'Closes the editable-frontend versus reviewed-backend rollout gap without duplicating Codex queue workers or weakening the private owner gateway.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.8'
);
