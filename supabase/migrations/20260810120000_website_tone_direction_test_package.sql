-- Register per-build website tonal direction without changing production.
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
  'made-solid-studio-builder-agent-v10.1',
  base.foundation_version,
  base.foundation_checksum,
  'A private build may carry an explicit light-led or dark-led website tone, or omit tonal direction so Codex decides. Light and dark describe the overall visual character rather than requiring pure white or pure black backgrounds.',
  'Respect the saved per-run website-tone direction while retaining ownership of the exact accessible palette. A light-led build may use warm neutrals or pale brand tints; a dark-led build may use deep brand-compatible colours such as green, blue, brown, or black. When no tone is selected, choose the most fitting direction from the approved evidence.',
  'Website tone direction test package: adds Light, Dark, and Agent decides choices without forcing white or black backgrounds.',
  'policy_only',
  'Lets a reviewer guide the overall tonal character of a private build while preserving Codex ownership of the exact accessible brand-aware palette.',
  '["website-tone-direction"]'::jsonb,
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
      and existing.summary like 'Website tone direction test package:%'
  );
