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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.8',
  base.foundation_version, base.foundation_checksum,
  'A newly created Codex conversation can be abandoned and deleted before app-server materializes its rollout. Studio recognizes that narrow not-yet-materialized read response only for a thread it created locally, verifies that no queued work exists, and removes the unused conversation.',
  'When deleting an empty chat, retain the normal server-side turn read for every materialized or externally discovered thread. If includeTurns reports not materialized for an id still held in the local started-thread cache, treat the cached zero-turn thread as empty and call thread/delete. Never generalize the fallback to unknown ids or active and queued conversations.',
  'Reliable unmaterialized-chat cleanup test package: removes abandoned New chats cleanly before their first prompt.',
  'foundation_change_required',
  'Keeps New chat cleanup consistent with the app-server lifecycle without risking conversations that contain work.',
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
    and existing.summary like 'Reliable unmaterialized-chat cleanup test package:%'
);
