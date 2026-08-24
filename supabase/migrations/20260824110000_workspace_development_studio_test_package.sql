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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.2',
  base.foundation_version, base.foundation_checksum,
  'The Studio hostname serves the exact reviewed production release, while the owner-authenticated Workspace hostname serves the complete Made Solid Studio application from its persistent editable checkout with immediate development updates.',
  'Serve production Studio only from immutable built release assets and never expose its Vite source or HMR endpoints. Serve Workspace from /data/workspaces/siteforge-os with Vite development and hot updates behind the same owner and organization authorization boundary used by the private runtime. A bare Workspace visit opens the full development Studio UI without selecting a client. Open client website development as a clean route inside that UI, preserve Studio navigation, and show only the selected client chats plus clearly labelled universal Studio chats. Keep every client preview in its opaque exact-client Preview-origin capability frame; never expose capability tokens in the clean Workspace URL, leak secrets to the editable browser process, or allow one client route, chat, asset, API request, or HMR channel to cross into another client.',
  'Workspace development Studio test package: separates reviewed production from the authenticated live Studio checkout while keeping client editors isolated inside the complete development UI.',
  'foundation_change_required',
  'Restores Workspace as the instant-development Studio environment without replacing it with a client website or weakening production, owner, repository, or exact-client boundaries.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.2'
);
