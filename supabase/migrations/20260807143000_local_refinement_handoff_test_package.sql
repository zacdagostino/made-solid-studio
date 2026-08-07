-- Export complete local website workspaces with a reviewed agent-learning handoff.
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
  'made-solid-studio-builder-agent-v9.0',
  base.foundation_version,
  base.foundation_checksum,
  'Every completed source export is a complete local-development workspace containing the generated source, approved local assets, immutable Studio origin metadata, local-agent instructions, an append-only structured refinement ledger, and a private learning-bundle generator. Local refinements remain separate from production agent changes until an explicit reviewed distillation step.',
  'Preserve a clean generated baseline, record meaningful verified corrections by root cause and enforcement strength, group repeated instances, and create a private learning bundle only at a reviewed milestone. Treat the finished local source as reference evidence; replay the immutable original manifest without copying the final site when evaluating an agent change.',
  'Local refinement handoff test package: exports a complete editable workspace with approved assets and a structured, reviewable agent-learning ledger.',
  'foundation_change_required',
  'Lets completed websites move into local Git development while preserving a private, auditable path for strict regressions and flexible lessons to improve a later agent package without automatic production mutation.',
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
      and existing.summary like 'Local refinement handoff test package:%'
  );
