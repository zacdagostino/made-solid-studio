-- Register resilient local refinement-ledger responses without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v10.9',
  base.foundation_version,
  base.foundation_checksum,
  'Local Studio startup loads the Vite workspace-service configuration explicitly. The live refinement-ledger client verifies that its same-origin endpoint returned JSON before parsing it, so an HTML application fallback or malformed response becomes a clear reconnect state and never exposes a raw parser exception.',
  'Pass the Studio Vite config explicitly from the local service launcher, keep the ledger endpoint registered there, and validate its response content type in the client. If the local middleware is not connected, tell the operator to restart Made Solid Studio while preserving the workspace ledger as the source of truth.',
  'Resilient refinement ledger test package: turns missing local middleware into an actionable reconnection state.',
  'foundation_change_required',
  'Keeps the live handoff understandable when Studio is running an outdated local server process without weakening workspace isolation or ledger validation.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Resilient refinement ledger test package:%'
  );
