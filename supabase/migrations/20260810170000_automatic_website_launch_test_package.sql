-- Register persistent automatic website launch without changing production.
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
  'made-solid-studio-builder-agent-v10.6',
  base.foundation_version,
  base.foundation_checksum,
  'After one-click local workspace preparation, Studio launches the generated website in a named persistent tmux terminal session, waits for an actual HTTP response, and returns the correct local or Codespaces-forwarded preview URL.',
  'Report website launch and readiness as observable phases. Open the preview from the original click context and retain a labelled preview link when automatic navigation is blocked. Never claim readiness before the server responds.',
  'Automatic website launch test package: starts the prepared prospect site persistently and opens its live preview.',
  'foundation_change_required',
  'Completes the local handoff in one action while keeping the development server inspectable, restartable, and truthfully readiness-checked.',
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
      and existing.summary like 'Automatic website launch test package:%'
  );
