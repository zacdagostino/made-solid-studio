-- Register dedicated prospect editing and Made Solid handoff pages without changing production.
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
  'made-solid-studio-builder-agent-v11.0',
  base.foundation_version,
  base.foundation_checksum,
  'Prospect editing and Made Solid handoff are dedicated routed workspace sections. The final-edit action runs the complete website verification, refreshes the refinement bundle, creates an explicit final checkpoint commit, and pushes the current prospect branch before handoff can become ready.',
  'Keep generation, local editing, and client-workspace handoff as separate URL-backed stages. Stream verified finalisation phases without fabricated percentages, require confirmation before committing and pushing, and block Made Solid transfer until the final commit is synced and the website-admin connection is configured.',
  'Editing and handoff pages test package: separates local refinement from generation and adds a verified final-source checkpoint before client transfer.',
  'foundation_change_required',
  'Makes final source ownership visible and prevents the earlier generated artifact set from being submitted as though it contained later local edits.',
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
      and existing.summary like 'Editing and handoff pages test package:%'
  );
