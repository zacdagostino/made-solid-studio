insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.2', base.foundation_version, base.foundation_checksum,
  'Codex branches distinguish deliberate exploration from recovery after a broken source conversation. Recovery keeps the source history privately stored but removes that unusable chat from the conversation chooser; an intentional branch leaves both the source and branch visible.',
  'Label the failed-turn Continue in a new chat action as recovery and every message-level Branch action as intentional. Persist only recovery source thread IDs in the private runtime, filter them from conversation selection after the fork succeeds and across restart, and never delete their native thread or evidence. Preserve existing exact-turn, workspace-scope, and branch-failure guarantees.',
  'Purpose-aware Codex branching test package: hides broken recovery sources while preserving source chats for intentional branches.',
  'foundation_change_required',
  'Keeps the conversation chooser clear after broken-chat recovery without hiding the reference chat for a branch the reviewer created on purpose.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.2'
);
