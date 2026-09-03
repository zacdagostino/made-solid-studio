insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.7,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.7',
  base.foundation_version, base.foundation_checksum,
  'The owner-facing Codex runtime Settings card shows the installed version, latest known stable version, last successful check time, automatic-update lifecycle, and official release notes. A protected Check for updates action requests an immediate official registry check without disabling the daily updater, duplicating an active check, or interrupting Codex work.',
  'Keep the manual Codex update check behind the existing authenticated same-site runtime boundary. Serialize update checks across runtime processes, reject duplicate checks while downloading or activating, announce checking and failure states accessibly, and keep the installed executable available until the existing idle activation and health-check contract succeeds.',
  'Codex update checker test package: adds installed/latest version details, last-check time, and an immediate protected update check in Settings.',
  'foundation_change_required',
  'Lets the Studio owner verify the live Codex version and request a fresh official update check without waiting for the daily schedule or weakening safe activation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.7'
);
