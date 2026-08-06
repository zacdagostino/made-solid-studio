-- Evaluate accessibility against the final visitor-visible state rather than
-- a partially transparent reveal frame.
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
  'made-solid-studio-builder-agent-v8.0',
  base.foundation_version,
  base.foundation_checksum,
  'Accessibility checks run against the settled visitor-visible page state after lazy sections and reveal motion have completed, preventing transient animation colours from being reported as final contrast failures.',
  'Keep final-state colours conformant to WCAG 2.2 AA. The protected browser runner owns reveal settlement before axe analysis; generated code must still provide reduced-motion styles and accessible final colours.',
  'Settled accessibility test package: evaluates final rendered colours after reveal motion while retaining responsive drawer visibility checks and saved-source repair.',
  'foundation_change_required',
  'Stops a valid repaired preview being held in review because axe sampled a partially transparent reveal frame instead of the final visitor-visible colours.',
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
      and existing.summary like 'Settled accessibility test package:%'
  );
