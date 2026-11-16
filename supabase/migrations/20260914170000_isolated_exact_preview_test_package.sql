insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.5, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.5',
  base.foundation_version, base.foundation_checksum,
  'The handoff worker selects a clean local checkout of the attested commit or creates a disposable detached Git worktree for that exact commit, without rewinding or changing the active editable website.',
  'Search only configured prospect repository roots, require the attested commit object, preserve the active checkout, use a uniquely created temporary worktree when isolation is needed, and remove only that exact temporary worktree after success or failure.',
  'Isolated exact preview test package: deploys the verified handoff commit without requiring the editable workspace to remain on that older revision.',
  'foundation_change_required',
  'Allows a rehearsal of a verified committed edit after later development has begun while preserving both exact-source proof and the current working tree.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.4'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.5');
