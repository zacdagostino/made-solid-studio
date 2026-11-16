insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.7', base.foundation_version, base.foundation_checksum,
  'The signed live-document relay is routed by its dedicated /inspect/live path even when a deployment proxy rewrites the upstream Host header. Review-token, exact-source, device, destination, response-type, size and private-network validation remain mandatory.',
  'Recognize only the exact /inspect/live path before applying the signed Clientspace review configuration and destination checks. Do not use the proxy-facing Host header as a second authorization decision because managed deployment proxies may replace it. Preserve every existing signed-review, exact-target, device, redirect, HTML, size and private-network boundary.',
  'Proxy-safe live comparison test package: keeps signed interactive comparison documents available through the deployed Inspect proxy instead of falling through to a static not-found page.',
  'foundation_change_required',
  'Makes the live before-and-after websites load reliably behind the production reverse proxy without weakening the signed comparison boundary.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.7'
);
