insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.6,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.6',
  base.foundation_version, base.foundation_checksum,
  'The generated full-site build remains an immutable baseline after an editable repository is created. The current edited website is identified by its exact Git commit and receives a separate release attestation only after exact-source, responsive-layout, compact-navigation, and accessibility checks pass. Historical builder failures never appear as current edited-site results, and Made Solid handoff remains blocked without a matching passed attestation.',
  'Label completed builder output as the generated baseline once editing exists. Preserve its original quality evidence unchanged. Bind edited-site release verification to the exact business, builder run, manifest, commit, tree, branch and edit version. Run the versioned release suite in an immutable worktree, invalidate the result when the commit changes, and require the matching passed attestation at every handoff and Clientspace boundary.',
  'Exact edited-site release test package: separates immutable baseline failures from the current edited commit and requires exact-commit verification before handoff.',
  'foundation_change_required',
  'Makes build history understandable and prevents an edited website from reaching Made Solid or Clientspace on lineage alone.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.6'
);
