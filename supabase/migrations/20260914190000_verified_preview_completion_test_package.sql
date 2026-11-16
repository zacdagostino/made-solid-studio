insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.7, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.7',
  base.foundation_version, base.foundation_checksum,
  'The protected handoff worker reuses a ready private Vercel preview only when its project metadata matches the exact source commit. A new deployment is polled to a verified ready or failed terminal state instead of assuming the initial CLI response is complete.',
  'After exact source and release-attestation checks pass, expose a persisted deploying-preview phase. Reuse only a non-production ready preview for the exact commit, otherwise create one and inspect it until ready, failed, cancelled or the bounded timeout expires.',
  'Verified preview completion test package: makes automatic rehearsal handoff resilient to asynchronous Vercel deployment responses.',
  'foundation_change_required',
  'Prevents a successfully built private preview from being misclassified as failed while preserving exact-commit and no-production-domain safeguards.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.6'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.7');
