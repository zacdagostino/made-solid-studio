insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.1', base.foundation_version, base.foundation_checksum,
  'Agent Studio tests and full website builds always show the effective Codex model, reasoning level, and runtime version before work starts, while it is active, and after it finishes or stops. Active and completed runs use only their immutable execution snapshot.',
  'Show a responsive accessible Codex execution summary beside each builder workflow. Before a run, identify the saved effective profile and current runtime while stating that the exact runtime is captured at worker start. During and after a run, replace planned values with the immutable model, reasoning, runtime, and profile source saved on that run; never present current preferences as historical execution facts.',
  'Visible builder Codex version test package: keeps the planned or recorded Codex execution version visible through the full build lifecycle.',
  'foundation_change_required',
  'Lets the Studio owner confirm which Codex configuration will run and verify the exact recorded configuration while reviewing active or finished work.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.1'
);
