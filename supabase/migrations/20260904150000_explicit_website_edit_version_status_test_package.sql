insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.5,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.5',
  base.foundation_version, base.foundation_checksum,
  'Website editing presents the current working website and latest committed Made Solid edit checkpoint as separate, directly comparable states. It derives an explicit up-to-date, uncommitted-changes, checkpoint-behind, not-synced, or unavailable result from the exact Git head, changed-file list, committed-version record, and upstream sync state.',
  'Never imply that the next available version number already exists. Compare the current Git head with the latest committed edit record, report pending file changes separately, keep remote sync distinct from local checkpoint equality, and give the reviewer a direct next action whenever the checkpoint is behind.',
  'Explicit website edit version status test package: makes it immediately clear whether the latest committed version contains the current working website.',
  'foundation_change_required',
  'Prevents stale committed checkpoints and pending working edits from being mistaken for the same website version.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.5'
);
