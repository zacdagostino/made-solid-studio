-- Preserve valid preview entry v6.9 and register responsive introduction craft
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
  'made-solid-studio-builder-agent-v7.0',
  base.foundation_version,
  base.foundation_checksum,
  'Treat compact-logo alignment as an explicit composition choice: flow alignment is valid, while a declared centred logo must be geometrically centred to the viewport independent of unequal side controls. Fit concise two-to-four-item mobile groups when swiping adds no value, while retaining horizontal browsing for genuinely dense, numerous, media-led, or comparison content. Style every visible scrollbar with accessible brand-connected track and thumb states. Use the logo''s exact contrasting header surface for the server-rendered loading cover, and release hero motion only after the slow eased logo handoff completes.',
  'Annotate the marked header logo with data-siteforge-compact-logo-alignment="center" or "flow" and data-siteforge-intro-surface. If centred, verify its box centre against the viewport at 320, 375, and 768 pixels. Review every mobile horizontal rail against item count, density, and readable fitted width; keep a rail only when browsing materially helps. Define scrollbar-color, scrollbar-width, and matching WebKit track/thumb hover and active styles from semantic tokens. Do not add another loader or animate the hero behind the protected loading cover.',
  'Responsive intro craft test package: honest compact-logo alignment, content-led mobile fitting, polished accessible scrollbars, contrasting server-rendered brand loading, and a visible post-handoff hero entrance.',
  'foundation_change_required',
  'Prevents offset "centred" mobile logos, unnecessary swipe rails for concise content, unstyled scrollbars, white-on-white loading marks, pre-loader page flashes, and hero reveals that finish behind the introduction.',
  '["brand-introduction", "motion-runtime", "responsive-sidebar", "next-component-architecture", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Responsive intro craft test package:%'
  );
