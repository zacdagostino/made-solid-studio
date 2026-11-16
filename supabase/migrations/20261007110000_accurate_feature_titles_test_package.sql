insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.6', base.foundation_version, base.foundation_checksum,
  'Feature Releases and chat names use current-task feature metadata rather than a previously cached conversation label. Generated feature titles use polished product capitalization, distinct requests in one chat retain separate history entries, and a prompt containing several related outcomes receives one accurate encompassing title and description.',
  'Generate dedicated feature title and summary fields alongside conversation labels, bind them to the exact current-task signature, and never reuse stale metadata for a later completed turn. Re-evaluate older generated records from their own implementation evidence, preserve manual wording, and keep chat names sourced from the newest linked feature.',
  'Accurate feature and chat titles test package: fixes stale repeated names, standardizes capitalization and covers multi-outcome prompts clearly.',
  'foundation_change_required',
  'Makes feature history and chat names accurate enough to identify completed work without reopening the transcript.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.6'
);
