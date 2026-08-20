-- Register one-click embedded prospect workspace setup without changing production.
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
  'made-solid-studio-builder-agent-v10.4',
  base.foundation_version,
  base.foundation_checksum,
  'The Studio development server exposes a same-origin, validated local action that invokes the embedded prospect workspace preparation script and streams concrete setup phases back to the authenticated workspace UI.',
  'Use one labelled Open local workspace action for the normal path. Report GitHub authorization, clone or safe update, refinement-ledger verification, dependency preparation, completion, and failure without fabricated percentages; retain the shell command only as an explicitly collapsed fallback.',
  'One-click prospect workspace test package: prepares the embedded private repository from the Prospect Build panel with staged, accessible status.',
  'foundation_change_required',
  'Removes command copying from the normal workflow while keeping repository validation, safe Git updates, auditable logging, and a manual recovery path.',
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
      and existing.summary like 'One-click prospect workspace test package:%'
  );
