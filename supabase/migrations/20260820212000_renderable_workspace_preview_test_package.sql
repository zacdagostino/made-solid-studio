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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.2',
  base.foundation_version, base.foundation_checksum,
  'A recovered editable workspace runs its development command with an explicit development environment so Vite and React Fast Refresh install matching browser transforms and the private preview renders instead of returning a blank document.',
  'Launch every recovered workspace with NODE_ENV=development even when the permanent Railway parent process runs in production. Keep framework-specific host arguments, wait for the upstream HTTP response, then verify the rendered page in real mobile, tablet, and desktop browsers for console errors, failed resources, and non-empty pixels before reporting the preview ready.',
  'Renderable workspace preview test package: prevents the recovered Vite source from loading as a blank page under Railway production settings.',
  'foundation_change_required',
  'Makes successful HTTP recovery match actual browser readiness instead of treating an empty React root as a working preview.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Renderable workspace preview test package:%'
);
