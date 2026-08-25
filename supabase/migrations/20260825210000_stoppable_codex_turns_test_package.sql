insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.5',
  base.foundation_version, base.foundation_checksum,
  'While the selected Studio Codex conversation is working, its primary composer action becomes an accessible Stop Codex control. Stopping cooperatively interrupts the exact active supervisor turn and any active attached agents, preserves the unsent draft, and records the app-owned turn as intentionally interrupted so maintenance cannot restart it.',
  'Derive the primary composer action from the selected conversation lifecycle. Show Send only while idle and Stop Codex with a square icon while working; expose an explicit disabled Stopping Codex state while the request is pending. Send the exact selected thread and workspace scope to a protected stop-active-turn bridge action, interrupt its active supervisor and discoverable active descendants, and mark its running app-owned records interrupted with a manual-stop marker. Never clear or submit the current draft when stopping, never auto-recover a manually stopped turn, and preserve visible focus, error feedback, and 44px touch targets.',
  'Stoppable Codex turns test package: changes Send into Stop during active work and safely interrupts the selected supervisor and agent team without losing the draft.',
  'foundation_change_required',
  'Gives reviewers the familiar immediate stop control they expect in chat while keeping cancellation scoped, observable, and safe from automatic recovery.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.5'
);
