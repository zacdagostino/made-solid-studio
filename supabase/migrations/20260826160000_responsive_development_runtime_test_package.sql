insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.5,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.5',
  base.foundation_version, base.foundation_checksum,
  'The development Studio reveals the authenticated prospect index as soon as its lightweight business query succeeds, while full workspace detail continues hydrating in place. Codex status polling keeps at most one ordinary request in flight, status reads do not wait for the periodic durable maintenance pass, and the server reuses one healthy app-server connection until that socket actually closes.',
  'Start the complete prospect hydration concurrently with the lightweight business index. Dismiss the initial cover once that index is saved, show the existing hydration status while details load, and retain the retry/error boundary when even the index is unavailable. Coalesce timer and browser-resume Codex status requests while preserving explicit conversation transitions and stale-response sequencing. Run durable maintenance on its existing server interval rather than in the status response path. Share the initialized Codex app-server transport across bridge operations, invalidate it on close, reconnect on the next operation, and close it deliberately when the bridge reloads or the server stops.',
  'Responsive development runtime test package: reveals the prospect index before full hydration and removes repeated Codex handshakes, overlapping polls, and status-path maintenance waits.',
  'foundation_change_required',
  'Shortens authenticated development startup and keeps long Codex conversations responsive through transient transport loss without changing production Studio or workspace boundaries.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.5'
);
