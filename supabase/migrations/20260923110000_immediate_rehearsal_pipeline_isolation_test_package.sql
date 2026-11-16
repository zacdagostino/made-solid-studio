insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.5', base.foundation_version, base.foundation_checksum,
  'Internal Clientspace rehearsal children remain attached to their original prospect and are excluded from pipeline lists and metrics from the first lightweight organization read, before detailed workspace hydration completes.',
  'Classify rehearsal businesses from their proposal-draft marker whenever the prospect index is loaded. Keep the internal record intact for recipient, proposal, payment and lifecycle isolation, but expose its controls only from the original prospect handoff.',
  'Immediate rehearsal pipeline isolation test package: prevents internal test children from flashing in the prospect pipeline during startup.',
  'foundation_change_required',
  'Removes the duplicate-looking rehearsal card without deleting or weakening the isolated test workspace behind the original prospect.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.5'
);
