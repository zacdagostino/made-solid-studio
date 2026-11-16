insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.9', base.foundation_version, base.foundation_checksum,
  'The protected Studio runtime continuously reconciles each exact completed Codex turn once into Feature Releases when it owns the private ledger, including when Development Studio delegates that ownership upstream. Legacy conversation aliases for an already processed turn do not retry forever. An open Features view refreshes without a deployment being queued and refreshes immediately when the owner returns to it.',
  'Run chat maintenance and completed-feature reconciliation independently on the protected runtime cadence so either operation can recover after a transient failure. Preserve bounded newest-first reconciliation, durable processed-turn keys and the no-file-change filter, and deduplicate recovered conversation aliases by their globally unique turn identifier. Advertise continuous-feature-release-reconciliation-v1 only where the owning runtime performs this work, so Development Studio can take over safely from an older upstream runtime without duplicate processing. Refresh the active Features view in the background without replacing current evidence with loading placeholders, and ignore superseded responses.',
  'Continuous feature release reconciliation test package: records completed material Codex work automatically and keeps the open Features view current.',
  'foundation_change_required',
  'Repairs the runtime ownership gap that left completed work unprocessed and removes the need to reopen or manually refresh the Features view.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.9'
);
