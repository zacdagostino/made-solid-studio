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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.9',
  base.foundation_version, base.foundation_checksum,
  'Each Codex conversation owns its delivery and activity state. A request for an idle conversation starts independently while another conversation is active; only work blocked behind an active turn in the same conversation is labelled queued. The conversation chooser exposes per-thread working state and last-used time.',
  'Drain newly submitted Codex work even when another delivery pass is already running, retry only genuinely blocked records, and reconcile newly created threads with current server state. Render the conversation chooser as a compact accessible menu with a working spinner, selected state, automatic Codex title, and persisted updated-at time for every thread.',
  'Concurrent Codex activity test package: prevents independent working chats from appearing queued and adds a clear activity-aware conversation chooser.',
  'foundation_change_required',
  'Keeps simultaneous Codex conversations trustworthy and makes their working and recent-use state easy to scan.',
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
    and existing.summary like 'Concurrent Codex activity test package:%'
);
