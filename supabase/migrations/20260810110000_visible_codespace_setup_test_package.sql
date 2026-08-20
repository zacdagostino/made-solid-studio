-- Register visible non-blocking Codespace setup without changing production.
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
  'made-solid-studio-builder-agent-v10.0',
  base.foundation_version,
  base.foundation_checksum,
  'Codespace dependency and Codex setup runs in one repository-owned background startup job instead of blocking the container creation terminal. The editor task streams named persisted checkpoints and real failure output, then attaches to the persistent tmux session as soon as it exists.',
  'Use an idempotent background launcher from postStartCommand, persist its PID and log, and make the folder-open task follow that log while waiting for tmux. Bound network installation attempts and report lock waits, dependency installation, Codex installation, tmux checks, readiness, and failure without fabricated percentages.',
  'Visible Codespace setup test package: removes the silent post-create wait and streams real startup checkpoints before tmux attachment.',
  'foundation_change_required',
  'Keeps low-core Codespaces responsive during first setup and makes any dependency or Codex installation failure visible and actionable.',
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
      and existing.summary like 'Visible Codespace setup test package:%'
  );
