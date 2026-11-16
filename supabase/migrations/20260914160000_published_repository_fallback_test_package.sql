insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.4, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.4',
  base.foundation_version, base.foundation_checksum,
  'Exact-source handoff verification accepts a workspace without a local origin remote only when the persisted ready GitHub publication for the exact builder run independently matches the expected repository.',
  'Keep commit, tree, clean-worktree and attestation checks unchanged. Reject a mismatched configured origin. When origin is absent, require the immutable ready GitHub publication for the same builder run to match before deploying the verified preview.',
  'Published repository fallback test package: safely recovers verified preview handoffs when local origin metadata is absent.',
  'foundation_change_required',
  'Prevents a missing local Git remote from blocking an otherwise fully verified rehearsal without weakening repository identity checks.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.3'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.4');
