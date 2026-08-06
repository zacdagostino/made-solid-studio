-- Keep compact-navigation content visibly stable after it has opened, and
-- reject screenshots captured before every sequenced route is rendered.
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
  'made-solid-studio-builder-agent-v7.9',
  base.foundation_version,
  base.foundation_checksum,
  'Compact-navigation readiness remains stable across unrelated DOM updates while the drawer is open. Browser quality checks wait for every sequenced navigation item to become visibly rendered before accepting or capturing the open state.',
  'Keep every compact-navigation route and action marked with data-sf-navigation-item. The protected runtime owns durable readiness; generated components must not reset or override its open and ready classes.',
  'Stable navigation visibility test package: keeps animated drawer routes visible after live page updates and rejects open-state captures until every route is visibly rendered.',
  'foundation_change_required',
  'Prevents a drawer from passing structural checks while its route list is transparent, mid-animation, or repeatedly hidden by unrelated page updates.',
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
      and existing.summary like 'Stable navigation visibility test package:%'
  );
