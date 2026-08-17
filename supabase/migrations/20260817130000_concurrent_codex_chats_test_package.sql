insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.6',
  base.foundation_version, base.foundation_checksum,
  'Codex conversations are independent execution lanes. A busy thread defers only its own queued messages while idle threads start immediately. New conversations use the app-server automatic name after their first prompt, display a temporary New chat label beforehand, and are deleted through the supported app-server lifecycle when abandoned without any conversation content.',
  'Dispatch queued records by their exact thread ID and continue scanning after a busy or temporarily unavailable thread; never fall back to another conversation when a target ID was supplied. Preserve app-server-provided thread names and previews instead of assigning a Studio title. Mark truly empty threads as discardable, validate they contain no turns or queued work on the server, and call thread/delete when the user leaves them.',
  'Concurrent Codex chats test package: runs independent conversations together, preserves automatic Codex titles, and removes abandoned empty chats.',
  'foundation_change_required',
  'Makes the Studio conversation model behave like the Codex extension instead of treating all chats as one global queue.',
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
    and existing.summary like 'Concurrent Codex chats test package:%'
);
