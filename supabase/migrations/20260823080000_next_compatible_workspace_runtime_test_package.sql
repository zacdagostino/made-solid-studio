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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.7',
  base.foundation_version, base.foundation_checksum,
  'The trusted Preview-to-localhost hop removes the opaque browser Origin and stale cross-site Fetch Metadata before reaching Next.js or Vite, while the signed exact-client path remains the server-side authorization boundary. Railway boot safely restores a persisted approved active workspace when its recorded local server is absent.',
  'Strip Origin, Sec-Fetch-*, Cookie, Referer, and the signed capability path before proxying authenticated live-frame HTTP and HMR traffic to the trusted loopback development server. Continue returning the narrow opaque-frame CORS response without forwarding that browser provenance upstream. On Railway boot, read only the validated active-preview record, reject reserved ports and traversal, resolve the directory through approved persistent workspace roots, require its Git checkout, package manifest, and existing locked dependencies, reuse its recorded port, and start its development command in the exact persistent tmux session only when the server is absent. A failed boot restore must leave Studio available for owner-authorized recovery.',
  'Next-compatible Workspace runtime test package: removes opaque cross-site browser provenance that Next rejects and safely restores the approved active client after Railway restarts.',
  'foundation_change_required',
  'Makes Next.js client assets and HMR load through the secure Preview transport immediately after deploy or restart without broadening workspace authorization.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.7'
);
