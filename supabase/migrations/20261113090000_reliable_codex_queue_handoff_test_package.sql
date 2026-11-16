insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.8', base.foundation_version, base.foundation_checksum,
  'The Studio Codex queue confirms an apparently active conversation against its latest turn before holding a message. A completed turn with a lagging active thread summary cannot strand later requests. Selecting Interrupt waits for the selected queued request to hand off when no active turn remains.',
  'Use authoritative included turn state for dispatch when a thread summary is active. Leave genuinely in-progress turns queued, keep independent idle conversations parallel, and retain a durable request when current detail cannot be read. After an interrupt request finds no active turn, complete the selected queue hand-off before returning status.',
  'Reliable Codex queue handoff test package: sends messages after completed turns despite stale active thread summaries and makes Interrupt advance the selected request.',
  'foundation_change_required',
  'Removes the false busy state that made completed Studio chats look permanently queued while preserving real active-turn and workspace-scope safeguards.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.8'
);
