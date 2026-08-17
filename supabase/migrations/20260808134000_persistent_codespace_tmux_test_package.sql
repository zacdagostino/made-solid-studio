-- Register persistent Codespace tmux startup without changing production.
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
  'made-solid-studio-builder-agent-v9.7',
  base.foundation_version,
  base.foundation_checksum,
  'Every generated editing workspace starts the website and Codex in one repository-owned persistent tmux session. The same idempotent launcher runs from the Codespace container start lifecycle and the editor folder-open task, so opening the repository directly from GitHub does not bypass startup.',
  'Create the tmux session behind a workspace lock, keep Codex and the website in named windows, attach the editor terminal to the existing session, and use the dev container postStartCommand to launch it independently of editor task timing.',
  'Persistent Codespace tmux test package: keeps Codex and the website running for build-created and direct GitHub Codespace openings.',
  'foundation_change_required',
  'Makes the editable workspace durable across terminal attachment and guarantees the repository-owned startup path runs when a Codespace is opened directly from GitHub.',
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
      and existing.summary like 'Persistent Codespace tmux test package:%'
  );
