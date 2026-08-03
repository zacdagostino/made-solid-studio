-- Preserve clean new-test intent v6.7 and register exact route-logo geometry as
-- the next immutable private test release.
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
  'made-solid-studio-builder-agent-v6.8',
  base.foundation_version,
  base.foundation_checksum,
  'Every route loading transition must stabilise the destination header at the top of the incoming page before measuring its approved logo. Animate the cloned loading mark from a top-left transform origin to that exact measured box, then reveal the real navigation logo without a visible jump.',
  'Reset retained route scroll before the handoff, allow header scroll state to settle for two animation frames, and keep the destination header visible and undisplaced during measurement. Restore normal scrolling only after the loading mark has landed and the transition is complete.',
  'Precise logo handoff test package: resets retained route scroll, exposes the final navigation position before measurement, and lands the loading logo exactly on its real navigation mark.',
  'foundation_change_required',
  'Corrects route-loading logo geometry so the mark cannot shoot toward a scroll-hidden header or finish offset from the navigation logo.',
  '["brand-introduction", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Precise logo handoff test package:%'
  );
