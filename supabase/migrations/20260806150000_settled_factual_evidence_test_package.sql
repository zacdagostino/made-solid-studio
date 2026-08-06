-- Capture factual counters only after their bounded animation reaches its endpoint.
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
  'made-solid-studio-builder-agent-v8.4',
  base.foundation_version,
  base.foundation_checksum,
  'Final-state evidence waits for any factual counter animation triggered during full-page traversal to reach its defined endpoint before applying the protected opaque evidence state, running accessibility analysis, or capturing screenshots.',
  'Use data-counter only for supported factual metrics and keep its visible endpoint accurate. Browser evidence owns the bounded completion wait; do not lengthen factual counter animations or make their endpoint depend on viewport timing.',
  'Settled factual evidence test package: captures the same completed metric values at mobile, tablet, and desktop instead of saving transition frames.',
  'foundation_change_required',
  'Prevents responsive screenshots from showing different intermediate values for the same approved factual counter.',
  '["motion-runtime", "framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Settled factual evidence test package:%'
  );
