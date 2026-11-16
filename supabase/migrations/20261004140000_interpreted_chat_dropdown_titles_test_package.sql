insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.8', base.foundation_version, base.foundation_checksum,
  'Open Codex conversation chooser titles are concise semantic interpretations of the current task, never copies of complete user prompts or Codespace resume instructions. They may use more room than the selected-chat label only when that context is necessary to distinguish the work.',
  'Summarize the task rather than rendering the full cleaned prompt. Keep dropdown interpretations to 96 characters or fewer without adding ellipsis, preserve the task subject and distinguishing outcome, and resolve Codespace paused or continue-the-same-request messages against the newest substantive prompt in bounded history. Keep the closed selector on its compact 48-character contract.',
  'Interpreted chat dropdown titles test package: replaces copied prompts and resume instructions with concise current-task summaries.',
  'foundation_change_required',
  'Keeps the conversation list scannable while retaining enough task meaning to distinguish similar chats.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.8'
);
