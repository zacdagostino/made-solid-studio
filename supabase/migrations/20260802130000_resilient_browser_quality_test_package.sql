-- Preserve expressive craft v6.2 and register the browser-quality failure-boundary
-- correction as the next immutable private test release. Production remains unchanged.
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
  'made-solid-studio-builder-agent-v6.3',
  base.foundation_version,
  base.foundation_checksum,
  'Treat a transient compact-navigation pointer timeout as a quality-verification retry, not an immediate build failure. Retry the real pointer interaction once after restoring stable viewport geometry; if it still cannot be activated, retain the generated preview and record a quality-review finding.',
  'Responsive verification must distinguish a broken generated interaction from a transient browser actionability timeout. Preserve mouse-based coverage, retry once without bypassing hit testing, and continue the remaining evidence capture when the interaction becomes a review finding.',
  'Resilient quality test package: retries transient mobile-navigation pointer checks and preserves valid generated previews as reviewable output instead of misclassifying them as failed builds.',
  'policy_only',
  'Corrects the browser-quality failure boundary while retaining genuine pointer interaction coverage and all existing responsive checks.',
  '["framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Resilient quality test package:%'
  );
