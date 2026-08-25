insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  21.8,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.8',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex composer derives Stop from the selected turn rather than coarse thread or historical-agent state. Completion replaces the keyed Stop control with a distinct Send control promptly, out-of-order status responses cannot restore stale work, and a stop gesture can never be reinterpreted as message submission. The runtime advertises stop support explicitly and rejects unknown chat actions instead of treating them as prompts. A malformed or stalled saved transcript is isolated to that exact conversation so the conversation picker, new chats, and other healthy chats remain usable.',
  'Treat an included turn list as the source of truth for selected-thread activity; use coarse active thread status only for summaries that omit turns. Scope running agents to the selected active supervisor turn. Poll active work once per second, discard any status response older than the most recently started request, and render separate keyed Send and Stop buttons so a lifecycle transition between pointer-down and click cancels the old gesture. Include an explicit enqueue action for messages, disable Send without both a model and reasoning choice, advertise stop-active-turn capability from the same server dispatcher that implements it, disable Stop during frontend/server version skew, and fail closed on unknown chat actions. Bound selected-transcript reads below the owner-gateway timeout, preserve an unreadable conversation without rendering or accepting new work into it, return the remaining conversation list, and direct the user to another or new chat.',
  'Reliable Codex chat state test package: removes stale Stop controls, prevents stop/send races, and keeps healthy chats usable when one saved conversation cannot load.',
  'foundation_change_required',
  'Makes the familiar chat surface trustworthy across completion timing, agent-team history, overlapping polling, live Studio server updates, and one malformed saved conversation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.8'
);
