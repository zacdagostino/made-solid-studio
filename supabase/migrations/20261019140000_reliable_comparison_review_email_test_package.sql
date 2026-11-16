insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.3', base.foundation_version, base.foundation_checksum,
  'A first-introduction email is ready only when its exact capture includes the signed responsive comparison review URL as well as both email animations. A legacy animation-only capture must be replaced automatically and may never fall back to the direct redesign preview link.',
  'Treat the signed comparison review URL as part of the immutable first-email capture result. When a saved capture predates responsive comparison evidence, regenerate it before enabling preview, copy or send actions. Do not cache an animation-only result as current, and reject any capture response that omits the signed review capability.',
  'Reliable comparison-review email test package: automatically upgrades legacy captures so every first-email link opens the signed before-and-after review.',
  'foundation_change_required',
  'Closes the legacy-capture fallback that could leave an initial email pointing straight to the redesign instead of the responsive comparison experience.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.3'
);
