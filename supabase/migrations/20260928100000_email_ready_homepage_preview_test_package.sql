insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.7', base.foundation_version, base.foundation_checksum,
  'Every generated website foundation exposes the Made Solid review bridge only when it is embedded by a trusted Made Solid parent. The bridge provides a settled exact-homepage capture for client introduction emails without changing the public website or its live release state.',
  'Keep the review bridge in the locked foundation, restrict its parent origin to Made Solid or local development, wait for final website content and visible media before capture, and use the exact branded preview URL as both the capture source and linked destination.',
  'Email-ready homepage preview test package: lets Clientspace embed a settled screenshot from the exact branded website in the introduction email.',
  'foundation_change_required',
  'Makes the first client email visual and dependable while the screenshot and branded live preview remain tied to the same verified website version.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.7'
);
