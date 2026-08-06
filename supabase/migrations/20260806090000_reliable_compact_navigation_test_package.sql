-- Lock the compact-navigation boundary and dismissal guarantees into the
-- protected foundation, then register the correction as the next immutable
-- private test release.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v7.7',
  base.foundation_version,
  base.foundation_checksum,
  'Compact navigation is inclusive through 768 CSS pixels and desktop navigation begins at 769 CSS pixels. Every dismissal path shares state closure and restores focus after the close commits. The locked runtime guarantees the breakpoint, full-height surface, Escape recovery, and navigation motion state.',
  'Mark the desktop route list, backdrop, trigger, dialog, close control, logo, and sequenced items with their Siteforge hooks. Use one close function for Escape, backdrop, close-control, and route dismissal. Do not author locked navigation state classes. Browser evidence must wait for the brand-introduction handoff before capturing or exercising the page.',
  'Reliable compact navigation test package: fixes the 768px tablet boundary, full-height side panels, Escape focus restoration, and intro-obscured browser evidence.',
  'foundation_change_required',
  'Moves the repeated v7.4 navigation failures into the protected foundation so generated sites cannot silently drop tablet navigation, strand keyboard focus, or capture the loading surface instead of the page.',
  '["responsive-sidebar", "framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.status = 'test_ready'
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Reliable compact navigation test package:%'
  );
