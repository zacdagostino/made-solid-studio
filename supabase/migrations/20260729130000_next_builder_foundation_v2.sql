-- Publish the source-controlled Next.js foundation as a new immutable agent
-- package. Existing runs retain their historic package and artifacts; new
-- builds are pinned to this foundation.
with current_published as (
  select id
  from public.agent_packages
  where status = 'published'
)
update public.agent_packages as target
set status = 'superseded'
where target.id in (select id from current_published)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = target.organization_id
      and existing.foundation_version = 'made-solid-studio-next-builder-v2'
      and existing.status = 'published'
  );

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
  approved_at,
  published_at
)
select
  organizations.id,
  coalesce((
    select max(existing.version) + 1
    from public.agent_packages as existing
    where existing.organization_id = organizations.id
  ), 1),
  'published',
  (
    select prior.id
    from public.agent_packages as prior
    where prior.organization_id = organizations.id
      and prior.status = 'superseded'
    order by prior.published_at desc nulls last, prior.version desc
    limit 1
  ),
  'made-solid-studio-builder-agent-next-v2',
  'made-solid-studio-next-builder-v2',
  'source-controlled-next-builder-v2',
  '',
  '',
  'Next.js App Router production builder with strict TypeScript, Tailwind and semantic tokens, Base UI behaviour primitives, generated site-specific component systems, clean routes, runtime profiles, compiled draft previews, and framework quality gates.',
  'foundation_change_required',
  'Replaces the vanilla static-file foundation with a pinned component architecture while preserving immutable evidence, brand, provenance, capability, and private-delivery boundaries.',
  '[
    "motion-runtime",
    "scoped-revision",
    "brand-introduction",
    "hero-handoff",
    "responsive-sidebar",
    "contextual-logo-selection",
    "visual-content-recovery",
    "site-navigation-architecture",
    "next-component-architecture",
    "runtime-profiles",
    "framework-quality-gates"
  ]'::jsonb,
  now(),
  now()
from public.organizations as organizations
where not exists (
  select 1
  from public.agent_packages as existing
  where existing.organization_id = organizations.id
    and existing.foundation_version = 'made-solid-studio-next-builder-v2'
);
