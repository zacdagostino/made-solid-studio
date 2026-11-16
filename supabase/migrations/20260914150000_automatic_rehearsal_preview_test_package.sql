insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.3, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.3',
  base.foundation_version, base.foundation_checksum,
  'Preparing a Clientspace rehearsal automatically queues the verified exact-source preview when it does not already exist, follows its persisted worker status, and continues the rehearsal after the preview is ready.',
  'Do not send the owner backwards to prepare a separate original handoff. Reuse an existing exact-source preview job or queue it with the saved test-only contact and approved quote, surface its real persisted phase, and resume Clientspace preparation without another click. Never contact the real client.',
  'Automatic rehearsal preview test package: removes the separate original-handoff prerequisite and carries the test through its verified preview step.',
  'foundation_change_required',
  'Makes the rehearsal one understandable workflow while retaining exact-source verification, idempotent worker jobs and all commercial safeguards.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.2'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.3');
