insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.7', base.foundation_version, base.foundation_checksum,
  'An expired approved quote remains visible as a distinct recoverable commercial state. When its exact website revision, scope and terms are unchanged, Studio can issue a fresh bounded approval without contacting the client or weakening Clientspace payment and release safeguards.',
  'Separate quote term matching from time validity. Show the exact expiry date, explain that an unsent invitation remains blocked, and offer Reconfirm unchanged quote only when source, scope and commercial terms still match. Reconfirmation creates a new reference and validity window. Rehearsal billing and live launch remain blocked.',
  'Recoverable quote expiry test package: explains expired approvals and safely reconfirms unchanged quotes without client contact.',
  'foundation_change_required',
  'Turns an ambiguous approved-but-blocked quote into an explicit expiry state with a safe, exact-scope recovery action.',
  '["commercial-offer-strategy"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.7'
);
