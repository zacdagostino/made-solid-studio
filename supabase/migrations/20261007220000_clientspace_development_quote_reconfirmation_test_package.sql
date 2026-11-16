insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.8', base.foundation_version, base.foundation_checksum,
  'The protected development Clientspace keeps expired rehearsal-quote recovery inside Clientspace Admin. Its authenticated rehearsal-only route forwards to the production receiver while production credentials remain isolated, and the preflight action never redirects to Studio.',
  'Permit the quote-reconfirmation mutation only for a saved test rehearsal after owner authentication. Proxy the exact Clientspace Admin request to the protected production receiver, retain the current project and section, and render loading, success or retry guidance in the same preflight surface.',
  'Clientspace development quote reconfirmation test package: removes the remaining Studio redirect and completes the action inside protected Clientspace Admin.',
  'foundation_change_required',
  'Makes the development rehearsal behave like the intended Clientspace workflow without copying privileged credentials into Preview.',
  '["commercial-offer-strategy"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.8'
);
