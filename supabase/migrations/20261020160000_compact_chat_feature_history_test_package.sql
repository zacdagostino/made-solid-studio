insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.8', base.foundation_version, base.foundation_checksum,
  'The collapsed Feature history disclosure in the Codex chat is content-sized at phone, tablet and desktop widths. The transcript remains the flexible row that receives the available reading space, while an opened feature history remains bounded and independently scrollable.',
  'Keep the selected-chat feature history as a compact disclosure above the transcript. When chat chrome gains or loses a direct grid child, preserve the transcript as the only flexible content row. Verify the collapsed and expanded states without shrinking labelled controls below their shared touch targets.',
  'Compact chat feature history test package: prevents the collapsed feature disclosure from taking over the transcript area on mobile and larger viewports.',
  'foundation_change_required',
  'Keeps feature context available without sacrificing the conversation area needed to read and continue the chat.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.8'
);
