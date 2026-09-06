insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.2,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.2',
  base.foundation_version, base.foundation_checksum,
  'The cross-origin Clientspace Codex embed recovers deterministically after Chrome process or back-forward-cache restoration. The host conceals partial iframe rendering until a trusted ready state, repeats its synchronization handshake after load, focus, visibility, and pageshow events, and the panel converts transient status failures into a retryable connected surface instead of an indefinite spinner. Saved idle conversations expose a confirmed delete action in the conversation picker.',
  'Do not rely on animation-completion or a one-shot postMessage handshake for restored browser state. Keep the embedded surface hidden and non-interactive until its trusted Studio frame responds ready, retry synchronization after browser lifecycle events, bound status requests, and keep normal polling able to reconnect. Allow permanent thread deletion only after explicit confirmation and exact workspace-scope validation; reject active or queued work, remove deleted lifecycle and transcript-position state, and select a safe remaining conversation when the active chat is deleted.',
  'Restorable managed Codex chats test package: repairs Chrome-restored embed and loading states and adds confirmed deletion for saved idle chats.',
  'foundation_change_required',
  'Keeps the cross-product Codex chat usable after mobile Chrome restoration and lets the Studio owner safely remove unwanted saved conversations.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.2'
);
