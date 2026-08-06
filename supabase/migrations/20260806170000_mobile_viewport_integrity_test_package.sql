-- Keep compact navigation and the complete hero proposition usable in the first mobile viewport.
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
  'made-solid-studio-builder-agent-v8.6',
  base.foundation_version,
  base.foundation_checksum,
  'Compact navigation is locked to the logical leading edge without generated keyframe overrides or nested scrollbar chrome, and its decoded items become visible together with zero delay. Mobile browser checks require the complete hero proposition and primary action in the first viewport, reject clipped heading words, and verify every traversed image has positive intrinsic dimensions.',
  'Mark hero, heading, primary action, and media with the required Siteforge hero hooks. At 320×568 and 375×812 place the proposition and primary action before supporting media, size display type against the longest word, keep the complete heading and action in the first viewport, and do not add navigation item animations, right anchoring, or drawer scrollbar styling.',
  'Mobile viewport integrity test package: fixes left-edge drawer motion, removes nested navigation scrollbar chrome and delayed items, verifies loaded images, and keeps the mobile hero proposition and action above the fold.',
  'foundation_change_required',
  'Prevents compact navigation entering from the wrong side or appearing empty, and stops oversized mobile hero media or type from clipping the proposition and hiding its primary action.',
  '["responsive-sidebar", "next-component-architecture", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Mobile viewport integrity test package:%'
  );
