-- Restore every checkpointed source entry at its recorded hash and register the
-- correction as the next immutable private test release.
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
  'made-solid-studio-builder-agent-v7.6',
  base.foundation_version,
  base.foundation_checksum,
  'A resumable post-Codex checkpoint must restore every recorded source file at its recorded hash, including files inherited from the foundation when the current clean template no longer contains the same path or body.',
  'Verify every template-inherited checkpoint entry against the prepared workspace. Recover a missing or changed entry from its immutable hash-addressed private source object before compilation, and save exact objects for every source entry when producing future validated checkpoints.',
  'Complete checkpoint restore test package: recovers missing foundation-inherited source modules before compiling a saved post-Codex continuation.',
  'foundation_change_required',
  'Lets a stopped test continue from its complete validated source without rerunning Codex or losing generated modules that originally matched its foundation.',
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
      and existing.summary like 'Complete checkpoint restore test package:%'
  );
