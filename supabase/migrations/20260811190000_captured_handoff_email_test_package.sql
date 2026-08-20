insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12',
  base.foundation_version, base.foundation_checksum,
  'The Made Solid handoff form prefills the first valid public email from the immutable Research Packet when no reviewed prospect contact email exists. Staff must review the value before Clientspace creation; recording a handoff never sends email.',
  'Keep captured contact provenance visible, prefer a reviewed prospect contact over captured public evidence, and retain separate explicit controls for saving contact data, creating a Clientspace, and sending outreach.',
  'Captured handoff email test package: prefills researched public contact evidence while preserving human review and no-contact boundaries.',
  'policy_only',
  'Removes repetitive contact entry without treating a scraped public address as verified or contacting the prospect.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Captured handoff email test package:%'
);
