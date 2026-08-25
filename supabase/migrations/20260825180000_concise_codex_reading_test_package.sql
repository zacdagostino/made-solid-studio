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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.2',
  base.foundation_version, base.foundation_checksum,
  'Natural Studio Codex reading replaces compact technical handoff paragraphs about implementation files and completed verification with one short spoken pointer to the full visible chat. Literal reading preserves those details.',
  'In Natural mode, recognise technical handoff paragraphs beginning with Implemented in, Changed in, Updated in, All checks passed or complete, Verification checks passed or complete, or Verification details or results. Replace consecutive matching paragraphs with exactly one concise sentence explaining that the technical implementation and verification details remain in the chat. Preserve the outcome before the handoff, later non-technical prose, all visible message content, and complete Literal playback.',
  'Concise Codex reading test package: summarises file, test, tool, count, and viewport handoff details instead of reading them aloud.',
  'foundation_change_required',
  'Keeps voice playback focused on the result while leaving detailed engineering evidence available for visual review.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.2'
);
