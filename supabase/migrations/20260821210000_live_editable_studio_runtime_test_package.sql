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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.5',
  base.foundation_version, base.foundation_checksum,
  'The permanent Railway Studio domain serves the editable persistent Studio checkout rather than an older image snapshot. Reviewed source edits appear through Vite hot updates, survive runtime replacement on the mounted volume, and remain separate from the private prospect workspace-preview domain.',
  'After preparing the verified persistent repositories, launch the Studio Vite development server from the exact SITEFORGE_STUDIO_WORKSPACE_DIR checkout with NODE_ENV=development on the configured Studio port. Reuse the image-owned locked dependency installation only when the checkout has no node_modules and never overwrite a workspace-managed dependency directory. Allow the configured Railway Studio hostname in the development server, retain the existing CSP and owner-authenticated private runtime routes, and keep the preview host, prospect workspace proxy, workers, and Codex App Server on their existing separate ports.',
  'Live editable Studio runtime test package: keeps persistent Studio source edits visible immediately after Railway restarts instead of reverting to the image snapshot.',
  'foundation_change_required',
  'Makes the permanent Studio address the durable live refinement surface while preserving the separate private prospect preview and existing authentication boundaries.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.5'
);
