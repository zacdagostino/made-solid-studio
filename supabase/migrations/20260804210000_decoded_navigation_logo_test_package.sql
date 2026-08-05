-- Preserve efficient execution v7.2 and register deterministic drawer-logo readiness
-- as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v7.3',
  base.foundation_version,
  base.foundation_checksum,
  'Decode the real compact-navigation logo before releasing the drawer item choreography. The approved logo must lead the sequence, and route links must never animate while its image is still unavailable.',
  'Mark the drawer logo with both data-siteforge-navigation-logo and the first data-sf-navigation-item. Preload any distinct local drawer source from the initial document through data-siteforge-navigation-logo-src. Keep the locked readiness choreography intact so the surface may enter immediately but its logo and routes wait for the mounted image to decode together.',
  'Decoded navigation logo test package: prewarmed drawer assets and readiness-gated logo-first route choreography without late image pop-in.',
  'foundation_change_required',
  'Prevents the compact-navigation links animating before the approved logo and removes the delayed logo pop-in on first menu open.',
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
      and existing.summary like 'Decoded navigation logo test package:%'
  );
