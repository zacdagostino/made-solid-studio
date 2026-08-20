insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.0',
  base.foundation_version, base.foundation_checksum,
  'The persistent Codespace session starts the Made Solid website beside Studio, the private preview host, Codex app-server, and active prospect preview without port collisions. The website mounts the same development-only Studio-hosted Codex panel, including persistent conversation history and New chat. Forwarded services use stable labelled ports, internal and automated-test ports are ignored, and stale port forwarding is not restored after reload.',
  'Reserve port 3000 for the active prospect website, 3001 for the Made Solid website, 5173 for Studio, 8788 for the private preview and API host, and loopback-only 4500 for Codex app-server. Launch the Made Solid website with MADE_SOLID_STUDIO_ORIGIN pointing to the current private Studio origin, wait for readiness, and open it once per Codespace start. Render the Codex iframe only when that development origin exists, validate bridge messages by origin and contentWindow, and allow popup-free local capture from port 3001. Do not restore stale test ports or expose the app-server as a browser-facing service.',
  'Codespace workspace suite test package: adds the Made Solid website to automatic startup, shares persistent Codex chats and New chat there, and keeps every active port stable and clearly labelled.',
  'foundation_change_required',
  'Makes the complete Made Solid development workspace open together with one consistent Codex conversation surface and a predictable, uncluttered Ports panel.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Codespace workspace suite test package:%'
);
