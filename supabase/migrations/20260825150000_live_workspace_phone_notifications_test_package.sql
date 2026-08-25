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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.9',
  base.foundation_version, base.foundation_checksum,
  'Phone-notification subscription and completion delivery remain available in the editable Workspace Studio while its separately reviewed production API image is still on the preceding release.',
  'Serve the Web Push configuration and subscription actions through the owner-gateway-protected live Workspace endpoint. Reuse the production runtime data directory, monitor its durable completed records without running a second Codex queue maintainer, and deliver only completions recorded after the first active device subscription. Treat empty or non-JSON runtime responses as a clear retryable availability state instead of exposing a browser parsing exception.',
  'Live Workspace phone notifications test package: enables device subscriptions and completion alerts immediately from editable Studio source with safe retry guidance.',
  'foundation_change_required',
  'Closes the editable-frontend versus reviewed-backend rollout gap for private phone alerts without duplicating the Codex queue worker.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.9'
);
