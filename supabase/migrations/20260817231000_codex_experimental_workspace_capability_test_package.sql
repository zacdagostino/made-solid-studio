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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.7',
  base.foundation_version, base.foundation_checksum,
  'The embedded Studio Codex client negotiates the app-server experimental API capability before it sends explicit runtime workspace roots. New conversations and queued or immediate messages can therefore start normally with both sibling Made Solid repositories available.',
  'Send capabilities.experimentalApi=true in the one initialize request for every app-server transport connection before initialized or any thread method. Retain runtimeWorkspaceRoots on thread/start, thread/resume, and turn/start, and cover the capability handshake plus successful new-chat and delivery paths with focused tests.',
  'Codex experimental workspace capability test package: restores new-chat creation and message delivery while retaining both repository roots.',
  'foundation_change_required',
  'Completes the dual-repository chat integration by negotiating the protocol capability required by its workspace-root field.',
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
    and existing.summary like 'Codex experimental workspace capability test package:%'
);
