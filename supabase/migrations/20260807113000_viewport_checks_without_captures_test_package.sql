-- Keep responsive browser verification while removing final generated-site screenshots.
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
  'made-solid-studio-builder-agent-v8.9',
  base.foundation_version,
  base.foundation_checksum,
  'Responsive quality verification runs each selected page in isolated mobile, tablet, and desktop browser contexts without generating, uploading, or retaining final viewport screenshots. The worker still checks rendered content, accessibility, console errors, navigation, overflow, touch targets, image readiness, first-viewport hero fit, focus restoration, and reduced motion.',
  'Keep the required responsive hooks and accessible behaviour. Treat viewport execution as transient verification only: persist structured check results and diagnostics, but do not create screenshot artifacts or open-navigation image evidence.',
  'Viewport checks only test package: retains responsive browser verification while removing final screenshot generation and storage.',
  'foundation_change_required',
  'Avoids generating hundreds of unnecessary final viewport images while retaining deterministic responsive and accessibility checks.',
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
      and existing.summary like 'Viewport checks only test package:%'
  );
