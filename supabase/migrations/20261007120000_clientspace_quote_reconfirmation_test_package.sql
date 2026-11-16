insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.7', base.foundation_version, base.foundation_checksum,
  'An expired Clientspace rehearsal quote can be reconfirmed from the exact preflight warning that blocks its invitation. Clientspace requests a new 14-day approval from Studio, verifies that every commercial and source term is unchanged, updates both saved records, and leaves client contact, charging and launch as separate blocked actions.',
  'Keep quote recovery inside the selected Clientspace project. Authenticate the cross-product request, require an expired unsent rehearsal quote, preserve exact source and commercial terms, issue only a new reference and bounded validity window, and show loading, success and safe retry errors beside the preflight action.',
  'Clientspace quote reconfirmation test package: renews unchanged expired rehearsal quotes directly from preflight without leaving the project.',
  'foundation_change_required',
  'Removes the Studio detour while preserving the rehearsal payment, invitation and launch safety boundaries.',
  '["commercial-offer-strategy"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.7'
);
