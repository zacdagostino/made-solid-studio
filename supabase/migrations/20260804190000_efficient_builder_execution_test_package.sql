-- Preserve immediate brand introduction v7.1 and register economical test execution
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
  'made-solid-studio-builder-agent-v7.2',
  base.foundation_version,
  base.foundation_checksum,
  'Keep private tests economical without weakening complete-build quality. Use the balanced GPT-5.6 Terra medium-reasoning profile for homepage and page-set tests, while retaining GPT-5.6 Sol high reasoning for whole-site revisions and full builds. Record the exact profile and official token-credit estimate with every Codex usage record.',
  'Read each applicable contract once. Use Node.js, rg, sed, and sharp for bounded inspection; jq and ImageMagick are unavailable. Use no more than ten inspection commands before editing and never print a whole manifest, asset inventory, or unchanged tree. Format once before full verification. Run full verification at most twice and never repeat a passing run without source changes.',
  'Efficient builder execution test package: balanced test-model routing, explicit credit attribution, bounded inspection, and no redundant full verification cycles.',
  'foundation_change_required',
  'Reduces avoidable test credits caused by unsupported tool probes, broad context dumps, excessive reasoning, and repeated unchanged verification while preserving stronger execution for complete builds.',
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
      and existing.summary like 'Efficient builder execution test package:%'
  );
