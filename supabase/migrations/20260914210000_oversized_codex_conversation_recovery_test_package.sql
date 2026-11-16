insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.9, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.9',
  base.foundation_version, base.foundation_checksum,
  'An oversized or slow Codex transcript remains usable through a bounded newest-turn summary page. The complete saved rollout is preserved, stale older in-progress turns do not override the newest lifecycle, and an authenticated reviewer can explicitly trigger native context compaction without deleting the conversation.',
  'Attempt the normal complete transcript read within its bounded timeout, then remember that thread and use experimental thread/turns/list with newest-first summary items for subsequent status reads. Render the limited-history state plainly, keep the composer usable, and expose Repair chat only as a guarded thread/compact/start request after active work finishes. Never truncate, rewrite, or delete the source rollout.',
  'Oversized Codex conversation recovery test package: keeps long chats open and adds a safe in-UI repair action.',
  'foundation_change_required',
  'Prevents one large transcript from becoming permanently inaccessible while preserving its complete history and workspace boundary.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.8'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.9');
