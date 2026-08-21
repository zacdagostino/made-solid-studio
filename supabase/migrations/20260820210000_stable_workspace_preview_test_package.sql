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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.0',
  base.foundation_version, base.foundation_checksum,
  'The stable private workspace domain redirects an expired or missing browser capability through the authenticated owner-only Studio runtime, issues fresh access for the active development directory, and returns to the same workspace path with a clean browser URL.',
  'When workspace preview access is missing, expired, or belongs to an earlier active directory, redirect only top-level document navigation to the configured HTTPS Studio origin. Require the existing Supabase owner authorization before issuing a fresh capability, preserve the requested same-origin workspace path, exchange the capability for the secure cookie, and keep assets, non-document requests, indexing, and unauthorized accounts blocked.',
  'Stable workspace preview test package: makes the normal private workspace domain recover expired access through the signed-in Studio owner session.',
  'foundation_change_required',
  'Keeps the non-production workspace preview reachable at its normal domain without turning it into a public or permanent bearer link.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Stable workspace preview test package:%'
);
