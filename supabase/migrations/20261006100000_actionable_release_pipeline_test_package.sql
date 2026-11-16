insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.3', base.foundation_version, base.foundation_checksum,
  'Feature Releases presents Workspace, Development and Production as distinct release stages. Local files are never described as queued deployment work, identical feature titles count once while duplicate records remain visible for reconciliation, and each state exposes one safe next action.',
  'Classify uncommitted or unresolved targets as workspace review, prevent them from appearing ready in either environment, and explain the blocker beside the action. Prepare release with Codex must open a linked follow-up with a review-only draft that scopes files, reconciles stale records, runs checks and forbids production deployment. Development deployment still requires an exact clean commit; production still requires verified development and explicit confirmation.',
  'Actionable release pipeline test package: replaces ambiguous pending labels with precise stages, blockers and safe next actions.',
  'foundation_change_required',
  'Makes release status understandable and actionable without overstating local files as deployed or queued.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.3'
);
