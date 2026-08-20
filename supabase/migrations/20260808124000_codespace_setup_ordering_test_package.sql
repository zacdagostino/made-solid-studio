-- Register deterministic Codespace setup ordering without changing production.
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
  'made-solid-studio-builder-agent-v9.5',
  base.foundation_version,
  base.foundation_checksum,
  'Folder-open website and Codex tasks invoke one concurrency-safe, idempotent setup gate before either process starts. Setup completion is verified from the installed Next.js executable and Codex command rather than assumed from Codespaces lifecycle timing.',
  'Do not assume postCreateCommand finishes before VS Code folder-open tasks. Serialize setup with a workspace cache lock, make both startup tasks call it, and launch the website or Codex only after their required executables are present.',
  'Codespace setup-ordering test package: prevents website and Codex tasks from racing dependency installation.',
  'foundation_change_required',
  'Makes automatic startup deterministic even when Codespaces attaches VS Code before post-create dependency installation completes.',
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
      and existing.summary like 'Codespace setup-ordering test package:%'
  );
