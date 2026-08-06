-- Capture and audit the fully revealed final page state while retaining
-- separate normal-motion drawer interaction checks.
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
  'made-solid-studio-builder-agent-v8.1',
  base.foundation_version,
  base.foundation_checksum,
  'Responsive screenshots and accessibility analysis use the deterministic reduced-motion final state after lazy sections are revealed. Open-navigation interaction evidence returns to normal motion and still waits for every route to become visibly rendered.',
  'Provide complete reduced-motion styles that expose the same content, layout, colour, and controls as the final motion-enabled state. Never use reduced motion to omit content or bypass interaction checks.',
  'Deterministic final evidence test package: captures fully revealed page content, tests final-state contrast, and separately verifies normal and reduced-motion drawer interaction.',
  'foundation_change_required',
  'Prevents full-page evidence from containing half-transparent sections and prevents axe from sampling an arbitrary transition frame.',
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
      and existing.summary like 'Deterministic final evidence test package:%'
  );
