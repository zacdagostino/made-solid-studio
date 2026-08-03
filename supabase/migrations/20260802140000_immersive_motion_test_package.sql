-- Preserve resilient quality v6.3 and register the coordinated route and scroll-motion
-- runtime as the next immutable private test release. Production remains unchanged.
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
  'made-solid-studio-builder-agent-v6.4',
  base.foundation_version,
  base.foundation_checksum,
  'Use slower smooth decelerating motion, sequentially reveal meaningful stacked text, and add reversible scroll-responsive depth where a bounded container supports it. On every route, introduce the approved logo on the loading surface, transfer its clone to the measured header-logo position, remove the loading surface, and only then release the first page reveal.',
  'Build text stacks with stable semantic gap tokens and data-reveal="sequence" in reading order. Use data-scroll-zoom on at least one bounded container per route so the surface expands in view, shrinks away from view, and its direct children counter-scale. Keep the locked route transition as the only loader and never animate page content behind it.',
  'Immersive motion test package: slower sequential reveals, reversible container depth, consistent stack spacing, and an every-route approved-logo loading handoff into the navigation.',
  'foundation_change_required',
  'Coordinates route loading, logo transfer, page-reveal timing, sequential text rhythm, and reversible scroll depth while preserving reduced-motion behaviour.',
  '[
    "brand-introduction",
    "motion-runtime",
    "next-component-architecture",
    "framework-quality-gates"
  ]'::jsonb,
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
      and existing.summary like 'Immersive motion test package:%'
  );
