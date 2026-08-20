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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.2',
  base.foundation_version, base.foundation_checksum,
  'Every owner-authorized Railway Studio Codex conversation uses danger-full-access inside the isolated Railway service container because that host cannot create Bubblewrap namespaces. New, resumed, queued, and recovered turns retain both configured workspace roots: /data/workspaces/siteforge-os and /data/workspaces/made-solid-website.',
  'Force ChatGPT subscription authentication and fail closed when it is unavailable. Validate the exact owner user and organization before any runtime action. Start and resume threads and override every turn with danger-full-access plus no approvals inside the isolated Railway container, while continuing to pass only the two configured Made Solid repository roots as the conversation workspaces.',
  'Railway container-access test package: avoids unsupported Bubblewrap namespaces while retaining owner-only access, subscription authentication, and both persistent repository workspaces.',
  'foundation_change_required',
  'Moves command isolation to the dedicated Railway container so Codex commands can run reliably without changing the application authentication or workspace configuration.',
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
    and existing.summary like 'Railway container-access test package:%'
);
