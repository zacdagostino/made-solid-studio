-- Preserve structured Codex provider failures and the saved source needed for a safe resume.
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
  'made-solid-studio-builder-agent-v8.7',
  base.foundation_version,
  base.foundation_checksum,
  'The protected builder preserves the final structured Codex failure reason, classifies exhausted API credits separately from source or quality failures, and retains the complete private source checkpoint for an explicit resume after billing is restored.',
  'Do not discard generated source when the model provider stops a run. Persist the structured provider failure, provide a specific recovery action, and resume from the saved checkpoint only after the external account condition has been corrected.',
  'Actionable builder failure test package: exposes the real Codex provider failure and preserves generated source for a safe checkpoint resume.',
  'foundation_change_required',
  'Prevents a provider billing failure from appearing as an unexplained permanent website-generation failure or forcing completed route work to be discarded.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Actionable builder failure test package:%'
  );
