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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.8',
  base.foundation_version, base.foundation_checksum,
  'Next.js source remains byte-compatible inside the opaque client frame except for its exact Webpack and Turbopack runtime public-path declarations, which are rooted beneath the signed client capability. A document-local, memory-only compatibility layer supports Next development storage without persistence or shared client state.',
  'Never broadly replace slash-prefixed strings in proxied Next.js JavaScript. Preserve React hydration sentinels, embedded source, and Next asset-prefix detection while rewriting only the exact CHUNK_BASE_PATH, RUNTIME_PUBLIC_PATH, and Webpack public-path assignments to the validated frame capability. For Next development documents only, install an early per-document memory sessionStorage and cookie surface when the opaque sandbox blocks native access. Keep the frame opaque and prove real Next initialization, React interaction, painted output, and HMR on the exact capability path in HTTPS Chromium.',
  'Executable Next Workspace runtime test package: restores client-side React hydration and exact-capability hot reload while keeping each client frame opaque and isolated.',
  'foundation_change_required',
  'Makes downloaded Next.js client code actually execute and live-update inside the secure Workspace preview instead of leaving a blank or static server-rendered surface.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.8'
);
