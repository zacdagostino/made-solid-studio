insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.2', base.foundation_version, base.foundation_checksum,
  'Codex runtime recovery is directly available from Chat settings and from a dedicated route. A failed or rolled-back activation can be retried explicitly, exposes truthful loading and error states, and a dismissed lifecycle notice stays dismissed until the runtime enters a different lifecycle state.',
  'Link Chat settings to the route-persistent Codex updates page. Send manual recovery through a protected retry action that clears only failed staging metadata before rerunning the verified update flow. Keep chat usable during recovery, disable duplicate retries, announce state changes, and persist dismissal against the exact runtime lifecycle key.',
  'Manual Codex update recovery test package: adds a dedicated update page, in-notice retry, verified retry lifecycle, and durable notice dismissal.',
  'foundation_change_required',
  'Lets the owner recover a stopped runtime update without waiting for the next automatic cycle or repeatedly dismissing the same error.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.2'
);
