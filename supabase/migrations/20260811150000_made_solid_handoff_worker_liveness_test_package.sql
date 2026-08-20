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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v11.7',
  base.foundation_version, base.foundation_checksum,
  'An exact-edit handoff can be queued only while the protected Made Solid worker has a fresh persisted heartbeat. The UI reports unavailable delivery before submission, and a database liveness guard prevents unattended jobs from accumulating if the worker stops.',
  'Heartbeat the Made Solid handoff worker independently of item processing, release its heartbeat on an orderly stop, require a heartbeat no older than 45 seconds when queueing, and keep the integration availability read optional during workspace loading.',
  'Made Solid handoff worker liveness test package: blocks unattended queues and shows when protected delivery is not connected.',
  'foundation_change_required',
  'Makes the handoff button honest about worker availability while retaining the durable exact-commit lifecycle.',
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
    and existing.summary like 'Made Solid handoff worker liveness test package:%'
);
