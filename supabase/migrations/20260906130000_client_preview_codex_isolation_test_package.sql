insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  25.0,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v25.0',
  base.foundation_version, base.foundation_checksum,
  'The owner-only Codex control belongs only to a top-level Made Solid development website. Clientspace thumbnails and interactive website-review frames never render the Studio Codex iframe or its reconnecting placeholder, even when the reviewer is simultaneously authenticated as the Studio owner.',
  'Reject the website Codex surface server-side when the browser requests the document as an iframe. Retain a client-side nested-frame guard for deployments or proxies that omit request-destination metadata. Remove both the Codex iframe and reconnecting placeholder without disturbing the separate client feedback bridge, and preserve the top-level owner-only Codex experience.',
  'Client preview Codex isolation test package: keeps Studio chat controls out of client-facing website frames.',
  'foundation_change_required',
  'Prevents authenticated owner tooling from appearing inside Clientspace thumbnails and the interactive client website preview.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.0'
);
