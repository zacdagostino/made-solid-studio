-- Register the default-off editable SVG workflow without changing production.
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
  'made-solid-studio-builder-agent-v9.8',
  base.foundation_version,
  base.foundation_checksum,
  'Editable SVG generation is optional and defaults off. A normal logo-version refresh preserves an existing editable SVG and does not create, trace, or stage a new SVG unless the reviewer explicitly enables the control in the collapsed SVG section.',
  'Use only editable SVGs explicitly present in the current approved manifest. When SVG generation is disabled, use the approved source and transparent PNG logo family without assuming a fresh vector exists.',
  'Optional SVG generation test package: makes editable vector creation an explicit default-off logo-run choice.',
  'foundation_change_required',
  'Prevents repeated SVG work during ordinary logo remasters while retaining an opt-in editable-vector workflow.',
  '["contextual-logo-selection"]'::jsonb,
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
      and existing.summary like 'Optional SVG generation test package:%'
  );
