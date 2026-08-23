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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.2',
  base.foundation_version, base.foundation_checksum,
  'The stable workspace hostname remains the reviewer-facing development workspace, with a native runtime-owned shell around the isolated live client preview and an exact-client Codex editor.',
  'Serve a native runtime-owned top-level editor shell at workspace.madesolid.com.au without adding Studio files to the client repository. Keep the client development server inside an opaque sandboxed preview frame, preserve live updates and refresh on the workspace hostname, and make Back to Studio navigate the top-level browser to Studio. Frame only a dedicated Studio Codex document that exchanges a short-lived exact-client capability for an HttpOnly cookie; keep normal Studio documents non-frameable from Workspace and bind every embedded Codex request to that same client.',
  'Workspace-hosted editor shell test package: restores the distinct live development workspace instead of redirecting its browser tab to Studio.',
  'foundation_change_required',
  'Keeps Workspace as the dedicated instant-update editing place while preserving Studio ownership and client repository isolation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.2'
);
