insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.7', base.foundation_version, base.foundation_checksum,
  'Clientspace Admin reconciles the project invitation timestamp with the linked Studio handoff invitation timestamp before rendering first-introduction state, so a retained delivery record cannot be hidden by a stale pending project status.',
  'Treat either persisted invitation timestamp as delivery evidence. Preserve accepted status where present; otherwise normalize a timestamp-backed invitation to sent. A rehearsal reset must continue clearing both timestamps before the send controls return.',
  'Reconciled introduction receipt test package: restores the sent receipt and rehearsal reset when historical invitation status drifted from its durable delivery timestamp.',
  'foundation_change_required',
  'Keeps the post-send UI truthful for existing rehearsals without sending again, deleting history or weakening the explicit reset boundary.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.7'
);
