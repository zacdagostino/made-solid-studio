insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.1', base.foundation_version, base.foundation_checksum,
  'Studio maintains a protected Feature Releases registry for material changes completed by Codex. Each feature preserves exact conversation and turn lineage, affected software and files, immutable source commits, and separately verified development and production deployment evidence.',
  'Create or update a feature only after a completed Codex turn records observable file changes. Keep one feature linked across its source chat and explicit follow-up branches. Group release targets by Made Solid Studio and Made Solid website or Clientspace, never infer deployment from Git, and enable deployment only for clean repositories at the exact recorded commits. Require explicit confirmation for production, persist deployment lifecycle and failure detail, deploy cross-product receivers before Studio, and open historical source output without silently branching it.',
  'Feature Releases test package: traces Codex-built changes from their exact chat output through committed source and verified development or production releases.',
  'foundation_change_required',
  'Adds an owner-only release control plane inside Codex with automatic feature capture, software grouping, source-chat continuation, exact-commit gates, and truthful environment status.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.1'
);

