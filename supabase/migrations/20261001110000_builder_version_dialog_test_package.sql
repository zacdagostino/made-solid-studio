insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.0', base.foundation_version, base.foundation_checksum,
  'Agent Studio and full website build workspaces expose the same in-place Codex version dialog. It shows the effective page-test, whole-site-test, and full-site model and reasoning profiles plus the active runtime version without navigating away from current work.',
  'Provide one accessible shared dialog from Agent Studio and complete website build controls. Keep the trigger at least 44 pixels, trap focus while open, support close control and Escape dismissal with focus restoration, prevent mobile overflow, and retain immutable model, reasoning, runtime, and package details on existing runs.',
  'Builder version dialog test package: restores in-place access to the Codex versions used by Agent Studio and complete website builds.',
  'foundation_change_required',
  'Lets the Studio owner inspect or change future builder execution profiles without losing the current Agent Studio or prospect-build context.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.0'
);
