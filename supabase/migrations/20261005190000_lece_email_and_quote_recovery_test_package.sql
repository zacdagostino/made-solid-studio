insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.9', base.foundation_version, base.foundation_checksum,
  'Clientspace Admin keeps AI-assisted incoming email replies inside the current Messages workspace, automatically prepares review-only drafts for matched client email, and requires explicit human editing, approval and confirmation before production delivery. Expired LECE rehearsal quotes expose direct recovery actions in both Clientspace and Studio without contacting the client or enabling live billing.',
  'Preserve all current Clientspace communication, payment, balance, release and rehearsal capabilities while restoring the inbound email approval desk. Match only the selected project client email, keep generated drafts private and unsent, invalidate approval after edits, and disable delivery in development. When a rehearsal quote expires, link Clientspace directly to the exact Studio rehearsal and place a prominent Studio action that focuses the unchanged-quote reconfirmation control.',
  'LECE email and quote recovery test package: restores AI-assisted reply review and makes expired test quotes directly recoverable.',
  'foundation_change_required',
  'Restores the protected inbound-email workflow and removes the dead end from expired LECE rehearsal quotes.',
  '["inbound-client-email-review", "commercial-offer-strategy"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.9'
);
