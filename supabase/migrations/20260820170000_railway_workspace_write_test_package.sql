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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.0',
  base.foundation_version, base.foundation_checksum,
  'Every owner-authorized Railway Studio Codex conversation uses the workspace-write sandbox with only /data/workspaces/siteforge-os and /data/workspaces/made-solid-website as durable writable repository roots. New, resumed, queued, and recovered turns retain the same boundary.',
  'Force ChatGPT subscription authentication and fail closed when it is unavailable. Start and resume threads with workspace-write, never danger-full-access, and override every turn with the two exact runtime repository roots, workspace-write policy, and no-approval escape boundary. Permit network access for builds and reviewed Git or deployment workflows without broadening filesystem writes beyond the repositories and standard ephemeral sandbox paths.',
  'Railway workspace-write test package: confines every owner Codex chat to both Made Solid repositories while retaining subscription auth, builds, and deployment access.',
  'foundation_change_required',
  'Replaces the Railway Workspace Agent''s full-filesystem profile with an explicit two-repository write boundary that persists across every chat lifecycle.',
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
    and existing.summary like 'Railway workspace-write test package:%'
);
