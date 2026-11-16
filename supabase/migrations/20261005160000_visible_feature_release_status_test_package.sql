insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.6', base.foundation_version, base.foundation_checksum,
  'Every Feature Releases overview card exposes source readiness, development deployment and production deployment as separate truthful states without requiring the reviewer to open its detail view.',
  'Summarize source, development and production independently on each feature card. For multi-product features show verified target counts when deployment is partial, distinguish queued and failed states, and never infer deployment from a commit or from another environment. Keep exact revisions, URLs, files and actions in the detail view.',
  'Visible Feature Releases status test package: shows commit, development and production state directly on every overview card.',
  'foundation_change_required',
  'Lets the owner scan what is local, deployed to development or live in production without opening every feature.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.6'
);
