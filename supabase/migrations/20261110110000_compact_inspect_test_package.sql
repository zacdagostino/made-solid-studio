insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.5', base.foundation_version, base.foundation_checksum,
  'Inspect reserves more space for the website with a two-row mobile toolbar, accessible device icons, a compact zoom footer and a restrained canvas.',
  'Keep 44px touch targets, signed Email Zac contact, exact preview dimensions, version switching and full-screen controls. Verify 320px and 375px phones, tablet and desktop without horizontal overflow.',
  'Compact Inspect test package: gives phone previews more room with a two-row toolbar, device icons and a compact footer.',
  'foundation_change_required',
  'Makes website review easier on phones without shrinking touch targets or changing the inspected website viewport.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.5'
);
