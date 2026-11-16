insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.0', base.foundation_version, base.foundation_checksum,
  'The signed website review presents one complete live page at a time behind explicit Old site and New site tabs. The selected site keeps its native scrolling and page interaction without a split reveal layer, synchronized autoplay or page-wide drag surface. Phone, tablet and desktop controls continue to render the selected exact viewport, including desktop geometry on a phone.',
  'Default a signed review to New site and persist the selected site and device in the review URL. Load the old public website only through the signed device-aware HTML relay, and load the new website from the exact signed private preview document. Keep inactive versions mounted but hidden so switching is immediate and each page retains its own state. Full screen must hide all review controls and leave only the selected live page plus an accessible exit control.',
  'Simplified website review test package: replaces the split slider with polished full-page Old site and New site tabs, compact responsive controls and focused full screen.',
  'foundation_change_required',
  'Makes before-and-after review obvious and usable on phones while retaining live websites, exact desktop dimensions and the signed review boundary.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.0'
);
