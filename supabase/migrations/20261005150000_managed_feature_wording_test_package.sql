insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.5', base.foundation_version, base.foundation_checksum,
  'Feature Releases uses semantic owner-facing names and concise product descriptions instead of implementation prompts or raw Codex completion text. Generated wording remains editable, regenerable and mergeable without losing exact source-chat lineage or overstating deployment evidence.',
  'Derive new feature wording from the interpreted conversation task, completed behaviour and changed components. Keep titles as short product capabilities and descriptions as one plain-language outcome sentence. Preserve manual wording across refreshes, provide explicit improve and edit actions, merge related records only after confirmation, retain every implementation turn, and reset environment verification whenever merged source revisions differ.',
  'Managed Feature Releases wording test package: replaces vague implementation-command cards with semantic editable descriptions and safe feature merging.',
  'foundation_change_required',
  'Makes the release overview understandable as a product ledger while preserving auditable chat, source and deployment history.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.5'
);
