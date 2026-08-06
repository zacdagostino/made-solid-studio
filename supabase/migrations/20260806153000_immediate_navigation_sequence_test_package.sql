-- Start compact-navigation content immediately while preserving decoded-logo ordering.
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
  'made-solid-studio-builder-agent-v8.5',
  base.foundation_version,
  base.foundation_checksum,
  'Compact navigation begins its decoded logo reveal with the entering surface, starts the first route within 60ms, and bounds the remaining reading-order stagger. Protected browser checks reject delayed logo, route, or item sequences.',
  'Use the locked compact-navigation choreography without adding independent delays. Keep the approved logo first, let it begin immediately, and follow with a short route and secondary-control sequence.',
  'Immediate compact navigation test package: removes the empty-drawer pause while retaining decoded-logo ordering, responsive motion, and reduced-motion behaviour.',
  'foundation_change_required',
  'Makes the mobile and tablet drawer respond immediately instead of showing its surface before the logo and links begin animating.',
  '["responsive-sidebar"]'::jsonb,
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
      and existing.summary like 'Immediate compact navigation test package:%'
  );
