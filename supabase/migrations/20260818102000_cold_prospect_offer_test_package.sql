insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.1',
  base.foundation_version, base.foundation_checksum,
  'Every approved prospect build produces an immutable scope-derived offer menu with a recommended milestone option, outright payment, an optional fixed-term managed plan, and a focused essentials launch. Repeated routes use capped volume pricing, the automatic cold-prospect offer ceiling is explicit, and company size never changes the price.',
  'Calculate from the newest working source, show full-scope value internally, keep automatic first-engagement pricing within the reviewed ceiling, and require human review for complex application capability or unusually large value. Preserve every client choice and its total commitment through Clientspace acceptance. Require recorded channel compliance before human-controlled outreach.',
  'Cold prospect offer test package: adds scale-aware automatic pricing, fixed client choices, managed-plan handoff, outreach safeguards and funnel visibility.',
  'foundation_change_required',
  'Standardises commercially clear cold-prospect offers without net-worth pricing and preserves the selected commitment through acceptance and billing.',
  '["commercial-offer-strategy"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Cold prospect offer test package:%'
);
