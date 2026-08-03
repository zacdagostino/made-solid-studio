-- Preserve immersive motion v6.4 and register non-blocking failure recovery as
-- the next immutable private test release. Production remains unchanged.
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
  'made-solid-studio-builder-agent-v6.5',
  base.foundation_version,
  base.foundation_checksum,
  'Treat saved checkpoints as generated source only. On every resumed test, reapply the current protected foundation before verification. A stopped test keeps its frozen diagnostic draft openable and must not prevent the tester from starting a different package or page test.',
  'Resume useful generated components and pages, but never restore a checkpoint copy over the locked foundation. Preserve failed and cancelled output as private diagnostic history while allowing independent tests to continue.',
  'Resilient resume test package: refreshes the protected foundation before resumed verification and keeps stopped drafts available without blocking other tests.',
  'policy_only',
  'Separates recoverable generated source from the current locked runtime and makes failure recovery non-blocking in Agent Studio Testing.',
  '["framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Resilient resume test package:%'
  );
