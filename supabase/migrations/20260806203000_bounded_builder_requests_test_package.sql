-- Prevent an unresponsive protected-storage request from wedging a builder run indefinitely.
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
  'made-solid-studio-builder-agent-v8.8',
  base.foundation_version,
  base.foundation_checksum,
  'Every protected builder storage and lifecycle request has a bounded deadline. A stalled artifact upload enters the existing retry and checkpoint recovery lifecycle instead of blocking worker heartbeats indefinitely. Checkpoint manifests use immutable content-hashed storage and a recorded file-count mismatch restores from immutable per-file source records rather than compiling a partial draft.',
  'Bound protected storage requests, classify timeout and input-staging failures as temporary, verify checkpoint manifest file counts, and continue from the validated post-Codex source without another model pass after storage recovery.',
  'Bounded builder request test package: prevents stalled protected requests from wedging a build and rejects stale partial checkpoint manifests.',
  'foundation_change_required',
  'Prevents a single unresponsive storage request from leaving a website build running without a heartbeat or terminal result.',
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
      and existing.summary like 'Bounded builder request test package:%'
  );
