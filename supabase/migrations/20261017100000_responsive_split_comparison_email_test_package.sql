insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.6', base.foundation_version, base.foundation_checksum,
  'The first introduction embeds two synchronized desktop animations: the current website and redesign. Email layout places them side by side on larger screens and stacks them vertically on phones, while both retain percentage-matched scrolling, bottom hold and a direct fade to their opening frames.',
  'Capture both sites from true 1440 by 900 desktop viewports as separate bounded GIFs. Use an 80 millisecond target frame delay, encode the raw stacks sequentially, and require exactly the current and redesign assets before enabling the email. Reject the earlier combined desktop asset so mobile email can reflow the comparison without stretching or cropping it.',
  'Responsive split comparison email test package: stacks separate current and redesign animations on phones, keeps them side by side on desktop and doubles the bounded scrolling frame rate.',
  'foundation_change_required',
  'Makes the desktop comparison readable in narrow email clients while improving motion smoothness without holding two raw animation stacks in memory together.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.6'
);
