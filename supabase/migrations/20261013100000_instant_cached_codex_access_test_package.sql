insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.1', base.foundation_version, base.foundation_checksum,
  'Studio keeps a bounded private cache of the latest selected Codex transcript for each universal or client-scoped surface. Opening chat during startup renders that saved transcript immediately while the connection remains visibly unverified. Every trusted website and Clientspace launcher opens its embedded panel on the first activation without waiting for a runtime-ready acknowledgement.',
  'Persist only bounded owner-browser chat data, keep universal and client workspace caches isolated, and replace the cached view after a verified live status response. Never cache queued work, update notices or active lifecycle state as live: label the header Waiting and keep Send and new-chat actions disabled until connection succeeds. Treat network timeouts as reconnectable rather than proof that the launcher is unsupported. On trusted owner surfaces, size and reveal the configured Studio iframe on activation while continuing origin and contentWindow validation for messages.',
  'Instant cached Codex access test package: opens every owner launcher immediately and restores the latest chat while the live connection is still pending.',
  'foundation_change_required',
  'Removes the blank startup wait without hiding connection state, enabling stale actions or weakening the authenticated embedded-panel boundary.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.1'
);
