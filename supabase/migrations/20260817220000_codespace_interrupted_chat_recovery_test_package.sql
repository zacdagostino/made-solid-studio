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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.5',
  base.foundation_version, base.foundation_checksum,
  'A Codespace suspension is represented as an interrupted Codex turn rather than completed or indefinitely working. Studio preserves the saved transcript and workspace edits, explains that tmux cannot execute while the Codespace VM is paused, and offers a deliberate continuation action for the exact conversation.',
  'Read the selected thread with turns before offering recovery. Continue only when its latest turn is interrupted and the thread is not active, resume a not-loaded thread through the app server, and start one explicit continuation turn that inspects and preserves the shared workspace before finishing the original request. Never automatically replay an original prompt or classify a completed turn as interrupted.',
  'Codespace interrupted-chat recovery test package: identifies suspended turns and resumes them safely from saved work.',
  'foundation_change_required',
  'Makes unfinished parallel chat work understandable and recoverable after GitHub suspends and later restarts a Codespace.',
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
    and existing.summary like 'Codespace interrupted-chat recovery test package:%'
);
