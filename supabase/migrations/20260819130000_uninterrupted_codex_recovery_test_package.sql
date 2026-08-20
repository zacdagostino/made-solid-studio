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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.7',
  base.foundation_version, base.foundation_checksum,
  'An accepted Studio Codex turn is owned by the server rather than its browser viewer. Closing or suspending Chrome never requests interruption. After any number of Codespace restarts, each newly interrupted continuation is recovered exactly once from its persisted turn. Because App Server prohibits direct input to multi-agent child threads, the recovered supervisor must restart each interrupted descendant through followup_task before synthesis.',
  'Run Codex maintenance immediately when the Studio server starts and before returning conversation status. Persist a recovering lease before starting a continuation, rebind a continuation already accepted before a bridge disconnect, and remove the lifetime one-recovery cap. Discover interrupted descendants and inject or steer exact followup_task recovery instructions into the supervisor; never send direct App Server input to a multi-agent child. An explicit queued Interrupt or replacement remains terminal for the superseded turn and must never be auto-recovered.',
  'Uninterrupted Codex recovery test package: detaches accepted work from Chrome and repeatedly restores solo and Agent team turns after Codespace restarts.',
  'foundation_change_required',
  'Makes embedded Codex work survive phone disconnects and repeated Codespace lifecycle events without duplicate continuations or abandoned child agents.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Uninterrupted Codex recovery test package:%'
);
