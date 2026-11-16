insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.7', base.foundation_version, base.foundation_checksum,
  'The explicit rehearsal send remains idempotent when the production outreach ledger predates the optional template column. The server retries only a PostgREST missing-template-column insert without that optional field; every other ledger failure remains blocked and is recorded in protected runtime logs.',
  'Keep the verified recipient, two-image comparison, idempotency key and human-confirmed send boundary unchanged. Preserve template metadata whenever the live ledger supports it, and use the legacy insert only for the exact PGRST204 missing-template-column response.',
  'Compatible introduction ledger test package: restores explicit rehearsal email sends across the additive template-schema rollout without weakening recipient or idempotency safeguards.',
  'foundation_change_required',
  'Prevents a harmless additive schema-version mismatch from blocking an owner-confirmed rehearsal email while keeping unexpected database errors fail-closed.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.7'
);
