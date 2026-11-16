insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.0', base.foundation_version, base.foundation_checksum,
  'The prepared first-email homepage image is an email-safe scrolling GIF when the verified page can be animated below the strict payload limit. Its first frame is a complete static hero, it pans down and returns to the top in a restrained loop, and JPEG remains the automatic fallback.',
  'Generate the animation from one settled immutable homepage capture rather than recording runtime motion. Cap the binary below 1.9 MB, preserve the verified preview URL and private storage lifecycle, embed it as an inline GIF, and fall back to the existing JPEG whenever the page is too short, encoding fails or the result exceeds the limit.',
  'Animated Clientspace homepage preview test package: turns the prepared first-email image into a compact scrolling loop with a safe static fallback.',
  'foundation_change_required',
  'Shows the prospect more of the finished homepage without delaying the Email tab, sending automatically or making the message image-only.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.0'
);
