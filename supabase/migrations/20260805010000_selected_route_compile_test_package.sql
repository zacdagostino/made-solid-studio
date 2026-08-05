-- Validate the selected export routes rather than requiring an unrelated root
-- homepage, and register the correction as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v7.5',
  base.foundation_version,
  base.foundation_checksum,
  'A page or page-set test compiles successfully when every selected manifest output path exists. The worker must not require a root index.html when the selected test scope intentionally excludes the homepage.',
  'After production compilation, validate the exact outputPath for every staged source page and publish the first selected output as the private draft entry. Report a missing selected route by its path; never relabel a valid non-homepage export as a missing homepage.',
  'Selected-route compile test package: accepts valid non-homepage page sets and validates every selected exported route instead of requiring an unrelated root homepage.',
  'foundation_change_required',
  'Prevents successfully compiled page and page-set tests from failing merely because their selected scope did not include the homepage.',
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
      and existing.summary like 'Selected-route compile test package:%'
  );
