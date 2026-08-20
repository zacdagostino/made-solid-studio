-- Register the reviewed prospect-learning inbox without changing production.
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
  'made-solid-studio-builder-agent-v11.3',
  base.foundation_version,
  base.foundation_checksum,
  'A committed prospect learning bundle enters production-agent refinement only through an explicit human review. Strict safeguards and reusable principles may be selected; project-specific decisions and unclassified observations remain excluded by default. Approved evidence creates a private proposal in Agent Studio Learning inbox and never mutates the published package directly.',
  'Read learning bundles from the validated local workspace service, keep every selected lesson tied to its committed source and original build, and fit the protected proposal size boundary without silently dropping selections. Distil only approved evidence into the appropriate policy, feature contract, foundation source, and regression tests. Replay the immutable original manifest for testing and require the normal test-package, production-draft, and explicit publish gates.',
  'Agent learning inbox test package: reviews committed refinement evidence and sends only approved reusable lessons into the protected package lifecycle.',
  'foundation_change_required',
  'Closes the gap between a prospect learning bundle and a reviewable Agent Studio proposal without allowing client-specific taste or final website source to leak into future builds.',
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
      and existing.summary like 'Agent learning inbox test package:%'
  );
