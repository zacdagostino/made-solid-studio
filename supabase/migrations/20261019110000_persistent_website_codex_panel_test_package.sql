insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.0', base.foundation_version, base.foundation_checksum,
  'The authenticated development website remembers whether its owner-only Codex panel was open or closed for the current browser tab. A foreground, focus or restored-page synchronization keeps an open cached panel visible and repeatedly requests the trusted embedded panel state instead of replacing it with the three-dot fallback. A transient closed response cannot override an in-flight open request; only the panel''s explicit close action may do so.',
  'Store only the open or closed presentation state in website session storage and keep transcript data inside the authenticated Studio origin. On pagehide, conceal the iframe without forgetting that state. On pageshow, focus, online or visible restoration, immediately restore the remembered geometry, continue the bounded trusted-origin handshake and reload a non-responsive iframe after the existing timeout. Ignore false closed acknowledgements while an open request is pending, but accept an explicit close action from the exact trusted iframe window. Preserve expired-access recovery, client-preview exclusion and the first-tap connecting behavior.',
  'Persistent website Codex panel test package: keeps an open cached chat accessible across phone foreground recovery and prevents transient synchronization from closing it.',
  'foundation_change_required',
  'Removes the three-dot-only return state and random-looking panel collapse without caching private transcript content in the website host or weakening the owner-only iframe boundary.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.0'
);
