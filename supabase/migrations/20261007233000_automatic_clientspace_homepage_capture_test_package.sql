insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.9', base.foundation_version, base.foundation_checksum,
  'Creating a verified Clientspace rehearsal immediately queues a durable homepage capture. The protected Studio browser waits for fonts, visible media and stable geometry, then Clientspace persists the finished email image against the exact project and preview URL before the Email tab is opened.',
  'Start the homepage capture after rehearsal provisioning without sending the invitation. Persist queued, running, ready and failed lifecycle states, accept output only from the verified Made Solid preview, and let the first-introduction email reuse the ready image with its existing manual fallback.',
  'Automatic Clientspace homepage capture test package: prepares and saves the first-email website screenshot as soon as the rehearsal is created.',
  'foundation_change_required',
  'Removes the Email-tab capture delay while preserving exact-preview verification and explicit email sending.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.9'
);
