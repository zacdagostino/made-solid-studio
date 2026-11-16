insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.0, 'test_ready', base.id, 'made-solid-studio-builder-agent-v27.0',
  base.foundation_version, base.foundation_checksum,
  'Automatic rehearsal preparation keeps the rehearsal test inbox separate from the original prospect handoff. An exact source revision may refresh an existing Clientspace without supplying a recipient, in which case the established client-account email is preserved.',
  'Never copy rehearsal contact fields into the original source handoff. Queue source-only preparation with the original prospect identity and no recipient override; keep the test inbox only on the separately identified rehearsal record.',
  'Rehearsal recipient isolation test package: refreshes the verified source preview without attempting to replace an existing client account email.',
  'foundation_change_required',
  'Lets rehearsal creation continue automatically for an existing Clientspace while preventing test contact details from leaking into the real client handoff.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.9'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.0');
