insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.1', base.foundation_version, base.foundation_checksum,
  'A Codex conversation linked to feature work uses the newest linked Feature Releases title as its owner-facing chat name. The conversation chooser exposes an expandable, scrollable feature history for every chat, and the selected chat shows the same history above its transcript with exact feature markers at completed turns.',
  'Expose linked thread identifiers from the private feature ledger without changing persisted feature lineage. Resolve chat names and histories from that same feature record, falling back to the interpreted conversation title only before a feature exists. Selecting a feature must open its source chat, scroll to the exact saved turn, focus its labelled marker and report clearly when that turn is outside bounded history.',
  'Chat feature history test package: names chats after their latest feature and navigates from feature history to exact transcript turns.',
  'foundation_change_required',
  'Makes feature-led work easy to recognise and revisit without searching through long chat transcripts.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.1'
);
