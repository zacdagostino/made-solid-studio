-- Register archive-safe Codespace resume startup without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v9.9',
  base.foundation_version,
  base.foundation_checksum,
  'Every GitHub workspace publication refreshes the current repository-owned Codespace startup handoff after loading source, including archived source bundles. On each container resume, the launcher restarts stopped website or Codex panes in the persistent tmux session before the editor attaches.',
  'Apply the current local-development handoff to both reconstructed and archive-based workspaces immediately before publication. Keep named tmux windows restartable with remain-on-exit and respawn a dead pane during the postStartCommand lifecycle.',
  'Codespace resume startup test package: refreshes archived handoffs and automatically restarts stopped website and Codex panes.',
  'foundation_change_required',
  'Prevents old archived startup files from reaching new repositories and restores both development processes whenever a Codespace resumes.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Codespace resume startup test package:%'
  );
