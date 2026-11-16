insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.8, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.8',
  base.foundation_version, base.foundation_checksum,
  'The synchronized Clientspace receiver accepts standards-compliant ISO timestamps with either the Z UTC designator or an explicit UTC offset. Rejected handoff fields are retained in the private worker failure summary.',
  'Keep exact-source, quote and attestation checks unchanged. Normalize validation around equivalent ISO datetime representations, and surface protected receiver field errors in the persisted Studio job without exposing secrets or raw request bodies.',
  'Compatible handoff timestamps test package: prevents valid Supabase UTC timestamps from stopping rehearsal preparation and makes future contract failures actionable.',
  'foundation_change_required',
  'Allows the verified report and source handoff to cross Studio and Clientspace reliably while preserving all release safeguards.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.7'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.8');
