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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.3',
  base.foundation_version, base.foundation_checksum,
  'A Studio refresh restores an open Codex chat to the same selected conversation and saved reading position. Each recent conversation retains its own bounded viewport anchor, offset, and follow-latest state without changing the active prospect route.',
  'Persist only bounded local Codex chat session UI state: whether the panel was open, the exact selected thread ID, and up to 25 recent per-thread transcript positions. Save a stable visible message or activity anchor with its viewport offset and a scrollTop fallback. Restore only after the requested thread transcript is rendered; retain bottom-following only when it was active before refresh. A deliberate close remains closed after refresh, and invalid or unavailable storage must leave chat usable.',
  'Durable Codex chat session test package: restores the open conversation and exact transcript reading position after refresh.',
  'foundation_change_required',
  'Lets reviewers refresh or recover the Studio without losing the Codex conversation and place they were actively reading.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.3'
);
