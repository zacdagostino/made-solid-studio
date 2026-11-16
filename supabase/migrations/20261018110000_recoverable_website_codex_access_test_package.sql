insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.8', base.foundation_version, base.foundation_checksum,
  'When the owner opens the Codex panel on dev.madesolid.com.au after its private Development Studio session expires, the framed gateway returns a narrowly scoped access-required message instead of exposing a raw unavailable response. The authenticated website bridge sends the owner through the existing Studio verification flow, returns to the exact website route, and reopens Codex automatically.',
  'Keep recovery bound to the exact development website origin, exact iframe window, Fetch Metadata checks and authenticated Studio owner. Store no access token in website markup or browser storage. Accept only an exact dev.madesolid.com.au return URL, renew the HttpOnly Development Studio session through the existing short-lived exchange, and preserve the owner-only frame and no-index boundaries.',
  'Recoverable website Codex access test package: renews an expired private Workspace session and reopens the chat on the same development website page.',
  'foundation_change_required',
  'Prevents an expired private Workspace cookie from replacing the owner Codex panel with an unavailable message while preserving the authenticated owner boundary.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.8'
);
