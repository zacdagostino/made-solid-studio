insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.5', base.foundation_version, base.foundation_checksum,
  'The first introduction embeds one verified desktop comparison animation only. It keeps the current website and redesign side by side, scrolls both complete pages together at a slow percentage-matched pace, holds the bottom and fades directly back to the opening frame. No mobile comparison is captured, stored, previewed or delivered.',
  'Capture only the true 1440 by 900 desktop pair, preserve the redesign loading and hero entrance, and require exactly one bounded desktop GIF before enabling the first email. Reject legacy two-asset capture records so the reviewer receives a fresh desktop-only comparison rather than a hidden mobile attachment.',
  'Desktop-only comparison email test package: simplifies the first introduction to one smooth side-by-side desktop GIF and removes the mobile animation from the full delivery contract.',
  'foundation_change_required',
  'Keeps the comparison readable and lighter in email while preserving the verified capture, matched scrolling and fade-reset behavior.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.5'
);
