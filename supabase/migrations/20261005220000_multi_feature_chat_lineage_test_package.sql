insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.2', base.foundation_version, base.foundation_checksum,
  'One Codex conversation may own multiple distinct Feature Releases records. When completed work clearly introduces a new capability, the ledger creates a new feature entry, preserves the earlier feature and makes the newest feature the chat name instead of appending every later turn to the first feature.',
  'Detect explicit semantic feature boundaries before resolving the active thread feature. Preserve each implementation under exactly one feature, update the thread pointer to the newest feature and keep earlier same-thread features discoverable through implementation lineage. Migrate the completed chat-feature-history turn out of the older product-release-overview record without discarding either turn.',
  'Multi-feature chat lineage test package: keeps distinct features separate inside one chat and names the chat after the newest feature.',
  'foundation_change_required',
  'Prevents a long-running chat from being permanently named after its first feature.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.2'
);
