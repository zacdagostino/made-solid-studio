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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.4',
  base.foundation_version, base.foundation_checksum,
  'Resuming an interrupted Agent team conversation restarts the supervising thread and every interrupted attached agent from its own saved sub-chat. Completed agents remain complete, active thread state overrides stale collaboration records, and the response identifies every restarted or failed child thread.',
  'Before continuing an interrupted supervisor, discover and read its bounded descendant hierarchy. Start a continuation turn only for descendants whose saved turn is interrupted, preserve both workspace roots, then continue the supervisor with the real restart outcome. Visually mark each accepted descendant as Resuming until live thread state becomes working or complete, and surface partial restart failures as needing attention.',
  'Resumable Agent team test package: restarts interrupted attached agents and visibly confirms each resumed assignment.',
  'foundation_change_required',
  'Makes recovery truthful for multi-agent work by continuing interrupted child threads as well as the supervisor and exposing that lifecycle in the team UI.',
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
    and existing.summary like 'Resumable Agent team test package:%'
);
