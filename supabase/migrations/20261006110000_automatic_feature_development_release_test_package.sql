insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.4', base.foundation_version, base.foundation_checksum,
  'A newly completed feature with an exact committed revision automatically queues, deploys and verifies its development release. Local, unresolved or mixed workspace changes remain blocked for review, and production promotion remains a separate explicitly confirmed action.',
  'Invoke automatic development release only from the durable completed-feature record and only when its refreshed status is ready_development. Reuse the protected exact-revision deployment contract, persist queued and terminal states, record verification failure without promotion, and never infer that local changes are deployed. Advertise and verify automatic-feature-development-release-v1 in the private runtime health contract.',
  'Automatic feature development release test package: safely deploys exact committed features to development immediately after completion.',
  'foundation_change_required',
  'Makes the owner expectation true for safe revisions while keeping mixed local work and every production release under review.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.4'
);
