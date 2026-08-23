insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.3',
  base.foundation_version, base.foundation_checksum,
  'The Railway Codex app-server starts with only configuration keys supported by the pinned Codex CLI, preserving the owner-only ChatGPT subscription runtime and restoring the live launcher.',
  'Start the Railway Codex app-server with strict configuration, forced ChatGPT authentication, danger-full-access inside the isolated container, and no approvals. Do not pass unsupported sandbox_permissions configuration. Retain the exact owner and organization authorization gate and both configured Made Solid repository roots for universal Studio conversations.',
  'Live Codex launcher recovery test package: removes the unsupported startup option that hid the otherwise owner-authenticated Railway launcher.',
  'foundation_change_required',
  'Keeps the private Railway Codex launcher available after deployment without weakening authentication or changing its two-repository runtime boundary.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.3'
);
