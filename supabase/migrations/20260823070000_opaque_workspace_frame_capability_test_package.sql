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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.6',
  base.foundation_version, base.foundation_checksum,
  'Keep the client development document in an opaque sandbox on the distinct private Preview origin. Authenticate the document, every rewritten runtime asset, navigation, API path, and HMR upgrade through one short-lived exact-client signed capability path instead of a frame cookie.',
  'Never grant allow-same-origin to the live client frame and never serve client assets from the Workspace origin. Route the live document through the existing private Preview host, rewrite HTML, CSS, JavaScript, JSON, Vite, Next, redirect, and websocket roots beneath its exact signed capability, and validate the capability and current active directory on every request. Keep proxy responses private and no-store, with no referrer, cookies, service-worker scope, site-data clearing, or remote connections and forms. Preserve any upstream CSP sandbox directive, allow framing only from the exact Workspace origin, strip the capability before proxying upstream, and reject expired, mismatched, stale-client, and cross-client paths.',
  'Opaque Workspace frame capability test package: restores real client assets and HMR without browser cookie exceptions or shared cross-client frame storage.',
  'foundation_change_required',
  'Makes the existing Preview origin a secure live-development transport while Workspace remains the stable shell and every client frame remains opaque and isolated.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.6'
);
