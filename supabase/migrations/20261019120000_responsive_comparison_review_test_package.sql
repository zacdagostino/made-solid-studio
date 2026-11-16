insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.1', base.foundation_version, base.foundation_checksum,
  'The first introduction links every website comparison affordance to one revocable Made Solid review capability. The review opens in desktop comparison mode, offers exact phone, tablet and desktop evidence plus an interactive redesign preview, and keeps full-size viewport geometry when the host device is narrower.',
  'Create comparison evidence from independent 375 by 812 phone, 768 by 1024 tablet and 1440 by 900 browser contexts. Keep the current-site URL private behind a signed Clientspace capability, return only short-lived private evidence URLs, and never accept an arbitrary comparison origin in Inspect. Make the reveal slider mouse, touch and keyboard operable. Full screen must hide mode, device and zoom choices, request browser fullscreen where supported, retain a CSS fallback and persistent exit control, restore on Escape, preserve the selected device and mode, and keep the underlying redesign interactive in Preview mode.',
  'Responsive comparison review test package: sends the first email to a signed phone-ready before-and-after viewer with exact device sizes, a touch slider and focused full screen.',
  'foundation_change_required',
  'Lets a prospect understand the redesign against verified current-site evidence on any device without iframe dependence, stretched desktop captures or a public arbitrary-URL proxy.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.1'
);
