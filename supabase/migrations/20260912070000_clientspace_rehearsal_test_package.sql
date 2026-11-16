insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.9, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.9',
  base.foundation_version, base.foundation_checksum,
  'A rehearsal is a separate test prospect and Clientspace that references an original exact verified website without copying or relabelling its release proof.',
  'Keep rehearsal contact, proposal and lifecycle state separate from the real prospect. Label every Studio, handoff and Clientspace surface as test-only; create no invitation implicitly; restrict deliberate rehearsal email to its saved test inbox; reject payment, recurring billing and live launch actions server-side.',
  'Clientspace rehearsal test package: safely rehearses the complete proposal and client experience without affecting the real prospect.',
  'foundation_change_required',
  'Lets the owner prove the first-client workflow end to end while preserving immutable source evidence and hard commercial safeguards.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.8'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.9');
