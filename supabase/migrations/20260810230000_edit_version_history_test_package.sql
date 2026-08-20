-- Register Git-backed website edit versions without changing production.
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
  'made-solid-studio-builder-agent-v11.2',
  base.foundation_version,
  base.foundation_checksum,
  'Every verified website edit is an ordered immutable Git checkpoint tied to the originating Studio build. Website editing shows the next working version and current committed version, while editing, prospect overview, and Made Solid handoff can open any retained committed website from a detached snapshot.',
  'Derive edit versions from validated repository commit history and .made-solid/origin.json. Increment the version only when a new verified commit is created. Serve committed previews from detached Git worktrees so uncommitted or later working changes cannot alter an earlier version.',
  'Edit version history test package: identifies the working edit, originating build, current checkpoint, and immutable committed website previews.',
  'foundation_change_required',
  'Makes repeated post-build editing explicit and reviewable without duplicating source records or confusing the live working tree with the version selected for handoff.',
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
      and existing.summary like 'Edit version history test package:%'
  );
