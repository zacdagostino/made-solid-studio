insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.2', base.foundation_version, base.foundation_checksum,
  'The first-email homepage GIF begins with the real captured loading screen, softly reveals the settled homepage, scrolls downward once at a slow memory-bounded frame rate, holds the exact bottom, and fades back to its opening frame instead of reversing upward.',
  'Capture the loading viewport immediately after DOM readiness and capture the complete homepage only after fonts, visible media and geometry settle. Build one phase-ordered loop of loading hold, loaded reveal, linear downward scroll, bottom hold and reset fade. Preserve the 1.9 MB email limit, cap raw animation frames at 64 MB, and adapt delay or dimensions instead of omitting the bottom frame.',
  'Smooth homepage preview loop test package: shows the real loading screen, scrolls slowly to the page bottom, and fades back smoothly within bounded memory.',
  'foundation_change_required',
  'Makes the prepared email preview smooth and legible while preserving the authentic loading experience, exact page ending and bounded private capture workflow.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.2'
);
