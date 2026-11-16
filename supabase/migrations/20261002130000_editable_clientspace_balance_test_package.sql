insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.9', base.foundation_version, base.foundation_checksum,
  'Clientspace Admin exposes the current final balance as a route-backed pricing control. Every edit creates an immutable quote revision with an explicit reason and outstanding-milestone breakdown; payment-started balances remain locked. A protected durable worker synchronizes the exact revision into the originating Studio proposal without changing the committed website scope.',
  'Treat Clientspace as the operational source for post-handoff balance amendments. Preserve the opening payment, require every outstanding milestone and an audit reason, keep Stripe blocked unless the current project balance and quote agree, and expose queued, running, synced, or failed Studio synchronization truthfully. In Studio, show the imported Clientspace balance and reason on the ready handoff.',
  'Editable Clientspace balance test package: opens a complete pricing breakdown, saves safe balance revisions, and synchronizes them back to Studio.',
  'foundation_change_required',
  'Lets the owner revise a final balance once in Clientspace while preserving quote history, checkout integrity, and the matching Studio commercial record.',
  '["commercial-offer-strategy"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.9'
);
