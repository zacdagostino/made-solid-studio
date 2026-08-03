-- Register the source-controlled creative-composition policy as its own
-- immutable test package. Production remains unchanged until this version has
-- build evidence and is deliberately promoted.
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
  published.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = published.organization_id
  ),
  'test_ready',
  published.id,
  published.builder_contract_version,
  published.foundation_version,
  published.foundation_checksum,
  'Use content-led responsive composition for prominent repeated groups. Number only genuine sequences, and treat editorial layouts, grids, horizontal rails, accessible non-rotating carousels, disclosure, and expressive typography as choices driven by the content and approved brand.',
  'Before implementing a prominent repeated group, distinguish real order, item count and length, comparison needs, and browsing needs. Do not default to numbered cards or mobile vertical stacks. Use the locked word, stagger, directional, scale, fade, and factual-counter motion vocabulary where it supports the chosen composition.',
  'Creative composition test package: content-led responsive layouts, intentional motion, page-based navigation, and accessible browsing treatments without testimonial-specific templates.',
  'policy_only',
  'Broadens the builder''s composition repertoire without prescribing a feedback-section template. Visual choices remain content-led and must retain responsive, keyboard, reduced-motion, and no-JavaScript access.',
  '[
    "next-component-architecture",
    "motion-runtime",
    "site-navigation-architecture"
  ]'::jsonb,
  published.created_by,
  now()
from public.agent_packages as published
where published.status = 'published'
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = published.organization_id
      and existing.summary like 'Creative composition test package:%'
  );
