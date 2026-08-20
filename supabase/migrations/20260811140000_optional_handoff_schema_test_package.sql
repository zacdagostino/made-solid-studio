-- Register optional handoff-schema resilience without changing production.
insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v11.6',
  base.foundation_version, base.foundation_checksum,
  'Made Solid handoff history is an optional integration during core workspace loading. A missing handoff table or stale schema cache cannot block prospect workspaces, Agent Studio tests, or builder runs; only an explicit handoff or cancellation request may require that migration.',
  'Load Made Solid handoff history independently from required prospect and builder data. Continue with an empty handoff history when its schema is unavailable, log the integration failure privately, and show migration-specific guidance only when a user invokes the affected handoff action.',
  'Optional handoff schema test package: keeps prospect and Agent Studio builds available when the Made Solid handoff migration is not installed.',
  'policy_only',
  'Prevents an optional delivery integration from taking down unrelated build workflows during staged database rollouts.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Optional handoff schema test package:%'
);
