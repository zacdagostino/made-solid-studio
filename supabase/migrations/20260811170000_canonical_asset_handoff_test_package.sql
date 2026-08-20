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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v11.9',
  base.foundation_version, base.foundation_checksum,
  'Exact duplicate visual assets are represented once in Build Manifest and staged builder input. The canonical record retains every captured source page and image URL plus duplicate artifact IDs as provenance.',
  'Use each canonical approved image once. Treat sourcePageUrls and sourceUrls as provenance showing every discovery location, not as additional image files or instructions to repeat the image.',
  'Canonical asset handoff test package: combines byte-identical images while retaining every discovery location for Codex.',
  'policy_only',
  'Reduces redundant builder context without losing page-level provenance or human-approved asset boundaries.',
  '["framework-quality-gates"]'::jsonb,
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
    and existing.summary like 'Canonical asset handoff test package:%'
);
