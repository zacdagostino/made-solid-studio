insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.6,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.6',
  base.foundation_version, base.foundation_checksum,
  'The protected Studio runtime checks the official stable Codex CLI release daily, stages and verifies it on persistent storage, waits for active and queued Codex work to finish, then atomically activates it and health-checks the restarted App Server. A failed startup restores the prior executable. The owner can see the installed version, lifecycle state, failure or rollback detail, and official Codex feature notes in Settings, with an in-app notice and an opt-in phone alert after successful activation.',
  'Resolve one persistent Codex executable pointer for the Workspace Agent and all subsequently launched builder jobs. Accept only stable @openai/codex registry versions, verify the staged binary reports the exact requested version, and never restart while tracked chat work or another Codex process is active. Preserve the prior executable until the replacement survives its startup health window, roll back atomically on failure, and retain truthful persisted status. Parse release highlights only from the official OpenAI Codex changelog, keep status private behind existing owner authorization, and reuse the established Web Push opt-in without exposing prospect or conversation data.',
  'Automatic Codex updates test package: safely installs stable releases after work finishes, restores failed updates, and shows official feature notes with Studio and phone alerts.',
  'foundation_change_required',
  'Keeps the complete protected Codex runtime current without interrupting work, while making every activation, feature summary, failure, and rollback visible to the owner.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.6'
);
