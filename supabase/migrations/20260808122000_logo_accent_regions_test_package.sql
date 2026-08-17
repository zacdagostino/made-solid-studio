-- Register source-owned accent regions without changing the published production package.
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
  'made-solid-studio-builder-agent-v9.3',
  base.foundation_version,
  base.foundation_checksum,
  'Generated black-with-accent and white-with-accent logo appearances preserve the source logo''s distinct accent regions. A dominant connected primary shape must never recolour a smaller verified accent letter, word, or electrical symbol.',
  'Use the approved accent logo appearances exactly as staged. Keep the non-accent portion black or white for its direct surface, and retain the source-owned accent only in the verified accent regions.',
  'Logo accent-region test package: keeps only verified accent parts coloured in black-with-accent and white-with-accent logo versions.',
  'foundation_change_required',
  'Prevents a dominant connected logo shape from turning the whole generated logo into the accent colour while retaining clean soft edges.',
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
      and existing.summary like 'Logo accent-region test package:%'
  );
