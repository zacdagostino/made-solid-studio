-- Preserve the creative-composition package and register the Test 25 response
-- as the next immutable private test release. Production remains unchanged.
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
  'made-solid-studio-builder-agent-v6.2',
  base.foundation_version,
  base.foundation_checksum,
  'Choreograph readable enter and exit motion for compact navigation, sequence its approved logo, routes, and actions, and compose heroes and later sections from multiple related motion beats. Establish deliberate display/body typography and consistent relationship spacing. Use only suitably resolved approved images with stable responsive dimensions and correct eager or lazy loading.',
  'Animate the compact surface fully out and in with smooth decelerating easing and sequential navigation items. Do not animate only the hero title: stage its supporting copy, actions, media, later section content, and a related group. Give service routes a page-specific composition, document typography and spacing choices, never upscale low-resolution assets, and implement stable responsive image loading.',
  'Expressive craft test package: readable navigation choreography, multi-element page motion, deliberate typography and spacing rhythm, distinctive service routes, and quality-aware responsive imagery.',
  'foundation_change_required',
  'Turns the Test 25 review into enforceable motion, typography, route-composition, and image-loading evidence while preserving accessibility and reduced-motion behaviour.',
  '[
    "responsive-sidebar",
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
      and existing.summary like 'Expressive craft test package:%'
  );
