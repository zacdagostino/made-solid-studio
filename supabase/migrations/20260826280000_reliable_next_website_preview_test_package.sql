insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.5,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.5',
  base.foundation_version, base.foundation_checksum,
  'A generated Next.js website remains fully navigable inside its exact client preview capability without server/client URL divergence. Internal page changes expose a truthful indeterminate loading state, development-only Next.js chrome stays outside the client review surface, and full preview uses the complete available screen with a persistent exit control.',
  'Keep server-rendered internal anchor hrefs byte-consistent for Next.js hydration. Route document navigation through the exact directory and token capability without exposing it to generated source, retain secured resource and hot-reload rewriting, and announce navigation start only from the bound preview frame. Hide framework development chrome in the private client view while retaining runtime errors in protected logs. Make full preview edge-to-edge, request browser fullscreen from the reviewer gesture where supported, provide a CSS fallback and visible exit control, restore on Escape, and preserve reduced-motion loading feedback.',
  'Reliable Next website preview test package: fixes client page navigation, adds visible workspace loading, removes development chrome, and makes full preview edge-to-edge.',
  'foundation_change_required',
  'Makes generated Next.js sites reviewable as complete multi-page websites without weakening exact-client preview isolation or hiding protected diagnostics.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.5'
);
