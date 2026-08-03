-- Preserve precise logo geometry v6.8 and register valid page-set preview
-- entry resolution as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v6.9',
  base.foundation_version,
  base.foundation_checksum,
  'Opening a completed page or page-set test must enter through the first selected generated route. Do not assume that index.html is a valid landing page when the homepage was outside the test scope.',
  'Resolve the first target source URL through the immutable Build Manifest publicPath and append that route to both deployed-host and edge-function preview capabilities. Retain the capability root for assets and internal navigation.',
  'Valid preview entry test package: opens non-homepage tests on their first generated page instead of an unrelated framework not-found document at the capability root.',
  'policy_only',
  'Makes every completed test directly viewable even when its selected page set intentionally excludes the homepage.',
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
      and existing.summary like 'Valid preview entry test package:%'
  );
