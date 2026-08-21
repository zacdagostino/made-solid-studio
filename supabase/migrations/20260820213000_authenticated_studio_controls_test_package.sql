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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.3',
  base.foundation_version, base.foundation_checksum,
  'Studio-only controls, including the Codex Workspace Agent, mount only after the configured Supabase client confirms an authenticated session. Signed-out, loading, error, preview-access, and embedded-panel entry states expose no chat control and initiate no Codex runtime request.',
  'Keep all privileged Studio tools behind the confirmed session boundary. Test every public entry route while signed out at mobile, tablet, and desktop sizes; assert that no Codex launcher, dialog, embedded panel, stored draft, or Codex runtime request is exposed before authentication.',
  'Authenticated Studio controls test package: removes private chat controls and internal sign-in details from public workspace entry states.',
  'foundation_change_required',
  'Prevents anonymous visitors from mounting private Studio tools while retaining server-side authorization on every runtime endpoint.',
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
    and existing.summary like 'Authenticated Studio controls test package:%'
);
