insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.4', base.foundation_version, base.foundation_checksum,
  'Existing Codex conversations recover a bounded recent user-prompt history from their native transcript, so vague latest messages do not become vague chooser titles. Recovered prompts are cleaned server-side before entering the private status response and cached by conversation revision.',
  'For every visible conversation without sufficient saved Studio prompt records, read only its bounded recent turn summaries and retain up to eight cleaned user prompts. Strip captured-page and progress instructions before serialization. Resolve vague chains such as do it, is that appropriate, or do previous chats do it against the newest substantive task; cache results and preserve the native completion status.',
  'Retrospective chat context test package: repairs vague titles across existing chats from cleaned, bounded native prompt history.',
  'foundation_change_required',
  'Makes older conversations identifiable without requiring a new message or exposing Studio runtime instructions.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.4'
);
