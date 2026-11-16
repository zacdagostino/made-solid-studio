insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.4', base.foundation_version, base.foundation_checksum,
  'Attaching camera-roll or captured images keeps every Codex composer action, including Send, fully inside both the composer and browser viewport at 320px and wider. Compact controls retain 44px targets and attachment previews remain horizontally scrollable.',
  'Verify the image-attached composer at 320 by 568, 375 by 812, 768 by 1024, and 1440 by 900. Require zero unintended horizontal overflow and keep the complete upload, capture, run setup, chat settings, and Send controls within the visible composer without shrinking their touch targets.',
  'Compact photo composer test package: keeps Send fully visible after image attachment at the narrowest supported Studio viewport.',
  'foundation_change_required',
  'Prevents image evidence from making a Codex message impossible to send on compact phones.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.4'
);
