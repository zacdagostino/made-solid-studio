insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.1, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.1',
  base.foundation_version, base.foundation_checksum,
  'Creating a client-experience rehearsal uses one stable rehearsal identity and recovers automatically from a transient incomplete Studio runtime response without duplicating the test prospect.',
  'Describe the rehearsal as practising the client experience, identify the destination as the owner email used for the test, retry an incomplete runtime response once with the exact same idempotency identifier, and preserve a clear actionable error if confirmation still fails.',
  'Reliable rehearsal creation test package: clearer test-email language and automatic recovery from blank runtime responses.',
  'foundation_change_required',
  'Prevents raw JSON errors and duplicate rehearsals when the live Studio connection briefly interrupts rehearsal creation.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.0'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.1');
