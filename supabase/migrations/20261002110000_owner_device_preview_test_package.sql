insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.8', base.foundation_version, base.foundation_checksum,
  'Every saved Agent Studio test, complete website build, and owner-managed live website exposes one separate Made Solid Inspect link with phone, tablet, and desktop viewport presets. The clean client review hostname, feedback workflow, generated source, and publication state remain unchanged.',
  'Open responsive inspection through the protected inspect.madesolid.com.au shell. Default to the 1440 by 900 desktop viewport, allow 375 by 812 phone and 768 by 1024 tablet selection, preserve the selected device in the viewer URL, and clearly distinguish mutable working source from immutable saved output. Accept only issued private preview capabilities or exact Made Solid branded client previews; never turn the viewer into an arbitrary URL proxy.',
  'Owner device preview test package: opens generated and editable websites in one phone-accessible desktop, tablet, and phone inspection surface.',
  'foundation_change_required',
  'Lets the Studio owner inspect a real desktop-responsive layout from a phone while keeping Clientspace review links and feedback separate.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.8'
);
