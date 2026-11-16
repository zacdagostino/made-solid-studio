insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.0', base.foundation_version, base.foundation_checksum,
  'Studio retains safe completed App Server items from the live notification stream when an active thread read lags. The chat distinguishes recent native activity with delayed transcript detail, a missing activity signal that may indicate a stalled turn, and a failed status refresh. Historical user requests interrupted by a newer queued message remain visibly labelled as replaced.',
  'Observe only bounded App Server lifecycle and completed-item notifications. Merge allowlisted commentary and structural activity into the selected active turn without exposing reasoning, raw command output, arguments or private paths. Track separate native-activity, visible-update and status-refresh signals; after a meaningful delay, explain the evidenced condition and offer Check now plus Stop Codex. Label superseded turns at their saved user message and never imply that a replaced request is still running.',
  'Truthful live Codex progress test package: restores delayed in-progress activity, diagnoses silent or disconnected turns and marks requests replaced by a newer message.',
  'foundation_change_required',
  'Tells the owner whether Codex is working, the transcript is delayed or the activity signal is stale, with safe recovery actions instead of an indefinite ambiguous spinner.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.0'
);
