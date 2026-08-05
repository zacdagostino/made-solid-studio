-- Preserve deterministic drawer-logo readiness v7.3 and register outcome-led
-- creative autonomy as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v7.4',
  base.foundation_version,
  base.foundation_checksum,
  'Treat short subjective directions as outcome-level creative briefs. Independently create a coherent, page-specific art direction and execute it through expressive typography, distinctive composition, responsive depth, high-quality motion, and purposeful interaction rather than waiting for the member to enumerate techniques.',
  'Infer the strongest fitting visual concept from the approved brand, page purpose, content, and assets. Required runtime hooks are the baseline, not the creative ceiling. Use custom page-owned React and CSS for coherent parallax, sticky narrative, scroll-linked transforms, layered or masked media, pointer-responsive ambient light, or other effects when they strengthen the concept. Select rather than stack effects, avoid conventional interchangeable sections, and provide performant reduced-motion fallbacks without adding dependencies.',
  'Creative autonomy test package: decisive page-specific art direction, expressive typography, distinctive responsive composition, and custom high-quality motion from simple workspace prompts.',
  'policy_only',
  'Lets a workspace member describe the desired outcome in one sentence while the builder independently supplies the design system, composition, typography, effects, and motion craft.',
  '["motion-runtime", "next-component-architecture", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Creative autonomy test package:%'
  );
