insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.3, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.3',
  base.foundation_version, base.foundation_checksum,
  'Bound every Codex RPC, release stalled shared connections and keep independent chats usable after a request failure.',
  'Preserve saved chats. Requeue only definite busy rejections. Never automatically replay a send with an unknown acknowledgement; surface the failure and ask the owner to check the conversation before retrying.',
  'Bounded Codex queue: stalled requests and Interrupt fail visibly, connections recover, and definite busy rejections remain retryable.',
  'foundation_change_required', 'Prevents a silent Codex connection from holding the shared chat queue indefinitely.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.id = (select candidate.id from public.agent_packages candidate where candidate.organization_id = base.organization_id and candidate.version < 25.3 order by candidate.version desc limit 1)
and not exists (select 1 from public.agent_packages existing where existing.organization_id = base.organization_id and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.3');
