insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.3', base.foundation_version, base.foundation_checksum,
  'Codex runtime updates expose persisted phase timing and ordered progress, resume an interrupted activation health check, and automatically restore the previous executable when a bounded activation phase stalls. Existing conversations remain readable, and messages submitted during the App Server handover are saved durably for automatic delivery after reconnection.',
  'Keep the current Codex executable serving chat while checking and downloading. Pause durable queue dispatch only for the activation handover, accept and validate existing-conversation messages into that queue, resume dispatch after reconnection, and never report a saved message as sent. Resume or roll back persisted restarting state after a supervisor restart; fail any checking, download, restart-pending, or health-check phase that exceeds its bounded timeout with an owner-visible explanation.',
  'Resilient Codex runtime updates test package: adds visible phases, bounded recovery, resumable health checks, and durable chat sends during activation.',
  'foundation_change_required',
  'Prevents a runtime update from trapping Studio in an indefinite updating state or forcing the owner to copy and retry a chat message.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.3'
);
