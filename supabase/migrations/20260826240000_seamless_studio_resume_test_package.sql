insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.1,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.1',
  base.foundation_version, base.foundation_checksum,
  'The authenticated development Studio keeps its owner-only live-update connection active while Chrome is backgrounded, privately revalidates editable source instead of discarding every browser module, reuses versioned optimized dependencies and the runtime optimizer cache, and pre-warms its largest client entry files. A routine return keeps the mounted route and workspace intact; an unavoidable cold start removes its post-load pause and restores saved workspace data before live hydration.',
  'Send a bounded server-side WebSocket heartbeat through the owner gateway so background-tab timer throttling does not turn an idle live-update connection into a document reload. Keep documents and runtime API responses private and no-store. Serve editable source as private no-cache responses with validators, and versioned optimized dependencies as private immutable responses. Reuse the isolated Vite optimizer cache on routine restarts, pre-warm the primary Studio client entries, require four consecutive failed dependency-graph probes before restarting, and keep saved workspace hydration non-blocking. Never cache authenticated API data or weaken owner-cookie validation.',
  'Seamless Studio resume test package: prevents idle development reconnect reloads and makes unavoidable reloads reuse warm private modules and saved workspace state.',
  'foundation_change_required',
  'Keeps the editable Studio responsive when Chrome resumes while retaining immediate source updates, owner isolation, and fresh live data.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.1'
);
