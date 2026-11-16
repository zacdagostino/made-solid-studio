insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.3, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.3',
  base.foundation_version, base.foundation_checksum,
  'New Codex conversations clear the previous conversation error immediately. Incomplete background updates retain only the same conversation last loaded transcript with an explicit reconnecting notice and recover automatically. Stalled child-agent reads cannot block the parent transcript.',
  'Bound the full status request including authentication and body reading, discard late responses after a conversation transition, and clear the polling lock on every outcome. Keep last loaded messages and agent placement together only for the same conversation, disable sending during transcript recovery, and replace them with the next complete response. Never merge evidence across conversation IDs or bypass workspace checks.',
  'Recovering Codex transcripts test package: clears new-chat errors and restores stalled or incomplete chat updates without a page refresh.',
  'foundation_change_required', 'Keeps the conversation usable through mobile reconnects and partial runtime responses.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.id = (select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v25.2'
  order by candidate.version desc limit 1)
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.3');
