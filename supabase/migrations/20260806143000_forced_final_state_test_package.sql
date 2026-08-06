-- Force responsive evidence to sample fully settled page content.
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
  'made-solid-studio-builder-agent-v8.3',
  base.foundation_version,
  base.foundation_checksum,
  'Responsive screenshots and accessibility analysis apply a protected final-state evidence class after reveal traversal. It forces generated reveal and scroll-depth elements to their fully visible settled geometry before evidence is sampled, then removes the class before normal-motion interaction checks.',
  'Keep final-state colours and layout WCAG 2.2 AA conformant. Do not override the protected sf-quality-final-state visibility rules or depend on transition timing for factual content to become readable.',
  'Forced final-state evidence test package: captures fully opaque settled sections for screenshots and accessibility while preserving separate normal-motion interaction checks.',
  'foundation_change_required',
  'Prevents browser evidence from blending below-fold section colours with the page background while reveal transitions are resetting after the full-page traversal.',
  '["motion-runtime", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Forced final-state evidence test package:%'
  );
