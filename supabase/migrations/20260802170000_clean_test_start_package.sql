-- Preserve meaningful page names v6.6 and register explicit new-test versus
-- resume intent as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v6.7',
  base.foundation_version,
  base.foundation_checksum,
  'Starting a test from the package and page chooser always creates a clean new worker run. A failed or cancelled run may be resumed only through its explicit Continue this test action.',
  'Do not infer resume intent from matching package, page, direction, or manifest values. Preserve the stopped run and frozen draft as history while the newly requested test receives its own run identifier.',
  'Clean test start package: Test something else always creates a new run, while only Continue this test resumes stopped source.',
  'policy_only',
  'Separates explicit continuation from new-test intent so a failed run cannot silently capture the next test request.',
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
      and existing.summary like 'Clean test start package:%'
  );
