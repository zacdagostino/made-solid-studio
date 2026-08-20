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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.6',
  base.foundation_version, base.foundation_checksum,
  'Every Codex conversation launched from the persistent Codespace terminal or the embedded Studio chat receives both Made Solid Git repositories as explicit runtime workspace roots: Studio at /workspaces/siteforge-os and the Made Solid website and Clientspace at /workspaces/made-solid-website.',
  'Keep the repositories as siblings with separate Git histories and commits. Pass the website repository through the Codex CLI additional-directory option for terminal sessions and through app-server runtimeWorkspaceRoots for new, resumed, and continued embedded conversations. Never treat /workspaces as one Git repository.',
  'Dual-repository Codex workspace test package: gives every local Studio chat explicit write access to both sibling repositories while preserving separate commits.',
  'foundation_change_required',
  'Lets one Codex conversation complete coordinated Studio and Clientspace work without losing the repositories'' independent histories.',
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
    and existing.summary like 'Dual-repository Codex workspace test package:%'
);
