-- Register the accent-only Brand Kit builder contract without changing production.
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
  'made-solid-studio-builder-agent-v9.1',
  base.foundation_version,
  base.foundation_checksum,
  'A reviewed Brand Kit may explicitly be accent-only. Apply every available reviewed colour to its matching semantic token, never invent a missing primary brand colour, and derive accessible neutral, ink, surface, background, border, and state tokens.',
  'Read the Brand Kit palette mode before creating tokens. When it is accent-only, preserve the reviewed accent exactly and build the remaining accessible colour system from derived neutrals rather than treating the accent as a fabricated primary.',
  'Accent-only brand test package: preserves a sole reviewed accent colour without inventing a primary brand colour.',
  'foundation_change_required',
  'Supports brands whose only verified chromatic identity is an accent while retaining deterministic token enforcement and accessible derived neutrals.',
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
      and existing.summary like 'Accent-only brand test package:%'
  );
