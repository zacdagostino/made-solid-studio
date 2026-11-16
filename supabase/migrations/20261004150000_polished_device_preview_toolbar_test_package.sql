insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.9', base.foundation_version, base.foundation_checksum,
  'The private Inspect device viewer uses an explicit responsive toolbar layout. Product identity, website identity, preview tools, and device selection never overlap or leave the viewport, including with long website names at compact mobile, mobile, tablet, and desktop widths.',
  'Use a compact three-row toolbar through tablet width and a single ordered row on desktop. Keep Rotate and Reload available as 44px touch targets, present Phone, Tablet, and Desktop as one segmented control, truncate only the secondary website identity when required, and preserve full keyboard, focus, loading, and reduced-motion behaviour.',
  'Polished device preview toolbar test package: gives Inspect a compact, non-overlapping header with clear preview and device controls.',
  'foundation_change_required',
  'Makes desktop previews usable from a phone without the Inspect product label, website title, or controls colliding.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.9'
);
