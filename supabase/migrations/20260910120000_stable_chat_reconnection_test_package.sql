insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.5, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.5',
  base.foundation_version, base.foundation_checksum,
  'Chat reconnection notices preserve the compact conversation selector and the transcript layout. A saved conversation cannot make an unavailable service appear Ready.',
  'Keep the workspace scope and connection notice in one stable layout row. Display Reconnecting while service status is unavailable, retain the saved conversation, and restore the connected header after successful automatic polling.',
  'Stable chat reconnection test package: prevents stretched selectors and contradictory Ready labels while reconnecting.',
  'foundation_change_required', 'Keeps mobile chat usable and connection status truthful through transient service failures.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.4'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.5');
