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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.1',
  base.foundation_version, base.foundation_checksum,
  'Optimistic Codex messages reconcile against the exact persisted feedback record in the same render that the delivered user message appears. Text-only records retain their request identity after capture context is removed. The message textarea is compact while empty or while the reviewer scrolls upward and expands only through deliberate focus.',
  'Attach each delivered browser request ID to its matching Codex user message, suppress the optimistic card immediately when that ID is queued or delivered, and never leave a stale Sending summary beside real work. Preserve draft text while compacting the textarea on upward transcript movement; restore the expanded editor on focus and provide reduced-motion behavior.',
  'Compact Codex composer test package: removes duplicate Sending messages and collapses the draft editor while idle or reviewing earlier chat.',
  'foundation_change_required',
  'Keeps the active chat trustworthy while giving more transcript space to reviewers without losing an unsent draft.',
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
    and existing.summary like 'Compact Codex composer test package:%'
);
