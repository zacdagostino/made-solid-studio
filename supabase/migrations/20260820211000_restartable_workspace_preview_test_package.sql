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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.1',
  base.foundation_version, base.foundation_checksum,
  'An authenticated workspace-preview access request verifies the recorded upstream and, after a Railway restart, relaunches the saved active repository from an approved persistent workspace root before issuing fresh private access.',
  'Treat an unreachable active-preview port as recoverable only after owner authorization. Resolve the saved directory against the configured Studio, Made Solid website, or prospect workspace roots, require its Git repository and package manifest, share concurrent recovery attempts, launch through the existing persistent terminal contract, wait for a real HTTP response, and reject unknown or missing directories.',
  'Restartable workspace preview test package: restores the saved private development server after Railway replaces the application container.',
  'foundation_change_required',
  'Keeps the stable non-production workspace URL usable across deployments without trusting arbitrary paths or weakening private access.',
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
    and existing.summary like 'Restartable workspace preview test package:%'
);
