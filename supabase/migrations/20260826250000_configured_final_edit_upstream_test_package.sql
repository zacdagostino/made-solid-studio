insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.2,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.2',
  base.foundation_version, base.foundation_checksum,
  'A final website edit checkpoint targets the editable branch''s configured upstream repository and branch instead of requiring a remote named origin. Studio validates that destination before it commits, pushes the exact verified revision to it, and keeps the checkpoint unlocked when the upstream is missing or invalid.',
  'Resolve the current editable branch and its configured upstream remote and merge branch before mutating the prospect repository. Validate that the configured remote exists, then push the exact final-edit commit to that configured remote branch and confirm HEAD matches the upstream revision before locking the handoff checkpoint. Do not assume the remote is named origin. If no valid upstream is configured, preserve the working files and return actionable repository-setup guidance without creating a partial checkpoint.',
  'Configured final edit upstream test package: commits and pushes a verified edit to its tracked repository branch without requiring a remote named origin.',
  'foundation_change_required',
  'Makes final edit checkpoints reliable for every correctly tracked prospect repository while preventing partial or misdirected client handoffs.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.2'
);
