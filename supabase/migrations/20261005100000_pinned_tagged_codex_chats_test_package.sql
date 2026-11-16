insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.0', base.foundation_version, base.foundation_checksum,
  'Studio Codex conversations have private durable organization metadata. A reviewer can pin any chat above unpinned chats in its existing workspace section and assign up to eight visible tag names without changing the Codex transcript or workspace boundary.',
  'Persist pin and tag metadata in the protected Studio runtime, validate the exact conversation scope before saving it, and return organization data with conversation status. Sort pinned chats first within each existing client or Universal Studio section while preserving relative order, show tags without horizontal overflow, and provide a keyboard-accessible editor with clear limits and errors.',
  'Pinned and tagged Codex chats test package: keeps important conversations first and adds durable multi-tag organization.',
  'foundation_change_required',
  'Makes long-running Studio chat history easier to scan and organize without renaming or altering conversation content.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.0'
);
