insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v11.8',
  base.foundation_version, base.foundation_checksum,
  'After a failed Agent Studio build, Test something else prepares a clean alternative-test draft instead of retaining the failed package, approach, page selection, tone, or directions. The request client must load the exact run identifier returned by the protected queue function; only Continue this test may reuse failed source.',
  'Keep stopped output as immutable history. Reset the alternate-test chooser to a clean create flow, prefer another eligible package when available, and bind a successful queue response to its returned run ID so a stale latest-run read cannot redisplay the failed run as the active request.',
  'Clean alternate-test package: resets failed-build choices and follows the exact newly queued run instead of redisplaying the stopped build.',
  'policy_only',
  'Makes failure recovery unambiguous while preserving explicit checkpoint continuation as a separate action.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Clean alternate-test package:%'
);
