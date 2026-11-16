insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.5', base.foundation_version, base.foundation_checksum,
  'The first-email homepage GIF records the complete live hero entrance immediately after the loading introduction hands off, before image and layout settling can consume the short animation off-camera.',
  'After the branded loading overlay becomes hidden, immediately record 1.2 seconds of the real hero entrance at 80 millisecond intervals. Only then settle eager media and geometry before continuing the live downward scroll. Preserve the loading animation, lazy-asset warm-up, exact-bottom hold, fade reset, 64 MB raw-frame cap and 1.9 MB email limit.',
  'Hero-animated homepage capture test package: preserves the complete hero entrance between the loading sequence and smooth live-page scroll.',
  'foundation_change_required',
  'Keeps the hero heading, supporting copy and media visibly animating in the saved GIF instead of allowing their entrance to finish during capture settling.',
  '["client-url-release-contract", "hero-handoff"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.5'
);
