insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.0,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.0',
  base.foundation_version, base.foundation_checksum,
  'The protected Studio runtime includes stable Codex CLI 0.153.2 and reads both the visible and hidden signed-in App Server model catalogue, exposing only public models plus the explicitly supported GPT-6 Astra rollout. Settings shows whether Astra is available to the account, the exact runtime-advertised reasoning and service tiers, and how future runtime, model-metadata, and Studio-contract changes are adopted. Immediate feature notes may come from the official OpenAI Codex GitHub releases while the official changelog page catches up.',
  'Treat the signed-in App Server model catalogue as the availability boundary. Never synthesize Astra access: include gpt-6-astra in the Studio picker only when model/list returns it, accept only that named rollout model from hidden entries, validate every requested reasoning level and service tier against its returned metadata, and keep all other hidden internal models unavailable. Retain daily verified stable updates, idle activation, health checks, rollback, and notifications. Merge release notes only from official OpenAI Codex sources, prefer the immediate GitHub release entry for duplicate versions, and keep arbitrary future Studio UI or API changes versioned and tested rather than claiming they can be safely guessed.',
  'Astra-ready Codex runtime test package: bundles Codex 0.153.2, safely unlocks GPT-6 Astra when the account receives it, and documents automatic versus versioned update adoption.',
  'foundation_change_required',
  'Keeps Studio current with Codex runtime and model rollouts while making account availability, exact model controls, feature notes, and Studio-specific adoption truthful and reviewable.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.0'
);
