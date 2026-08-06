-- Enforce reusable section rhythm, neutral scrollbars, and meaningful approved imagery.
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
  'made-solid-studio-builder-agent-v8.2',
  base.foundation_version,
  base.foundation_checksum,
  'Generated pages define semantic section, heading, and copy relationship tokens and reuse SectionShell and SectionHeading components with observable rhythm hooks. Browser quality compares eyebrow-to-title gaps and section-end padding at every viewport. Scrollbar chrome uses neutral tokens rather than reviewed brand colours, and two distinct approved page photographs are required when two are available.',
  'Define --space-section-block, --space-heading, --space-copy, --scrollbar-track, and --scrollbar-thumb. Use shared SectionShell and SectionHeading components with the required Siteforge hooks throughout the selected page. Keep equal relationships equal, retain at least 24px section-end clearance, use quiet neutral scrollbar colours, and place two distinct approved worksite or project photographs when available.',
  'Reusable section rhythm test package: enforces shared spacing tokens and section components, consistent heading and section-end rhythm, neutral scrollbars, and meaningful use of approved photography.',
  'foundation_change_required',
  'Stops generated pages from hand-tuning repeated section spacing, crowding final copy against the next surface, using brand-red/blue scrollbars, or silently omitting available approved photography.',
  '["next-component-architecture", "framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.status = 'test_ready'
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Reusable section rhythm test package:%'
  );
