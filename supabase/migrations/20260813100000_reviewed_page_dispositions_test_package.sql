insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.4',
  base.foundation_version, base.foundation_checksum,
  'Every selected source page receives a reviewed coverage outcome: standalone build, merge, redirect, workflow state, contextual route, or exclusion. Source selection preserves evidence but no longer automatically creates a public route or footer link.',
  'Flag suspicious CMS slugs and canonical duplicates for review. Require a canonical destination for merges and redirects. Build only outputRequired routes, preserve merged material at its target, keep redirects and workflow states out of global navigation, noindex workflow states, and omit reviewed CMS residue.',
  'Reviewed page-disposition test package: preserves source coverage without reproducing legacy CMS architecture.',
  'policy_only',
  'Prevents duplicate home slugs, confirmation states, author archives, and CMS residue from being promoted merely because capture discovered them.',
  '["site-navigation-architecture"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Reviewed page-disposition test package:%'
);
