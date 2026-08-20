insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.5',
  base.foundation_version, base.foundation_checksum,
  'Authenticated mobile DOM capture requires every image intersecting the captured viewport to be embedded before rendering. Image requests belonging entirely to off-screen content may fall back to a genuinely transparent pixel so an unrelated asset lower in a long Agent Studio page cannot abort the visible screenshot.',
  'Pre-embed and decode all visible image elements, failing clearly if any visible image cannot be represented. After that visible-image gate succeeds, provide the DOM renderer with a verified transparent fallback for unreachable off-screen images. Never use that fallback in place of visible content, and never allow an off-screen asset failure to reject the viewport capture.',
  'Reliable long-page capture test package: prevents off-screen refinement assets from aborting an otherwise exact mobile viewport screenshot.',
  'foundation_change_required',
  'Keeps exact mobile capture reliable on long Agent Studio refinement pages without hiding failures in content the user can actually see.',
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
    and existing.summary like 'Reliable long-page capture test package:%'
);
