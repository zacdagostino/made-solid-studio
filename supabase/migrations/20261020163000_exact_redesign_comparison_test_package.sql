insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.9', base.foundation_version, base.foundation_checksum,
  'Compare mode renders the redesign from the exact signed private preview document used by Preview mode. The trusted preview host injects only the normalized-scroll comparison bridge, while the unrelated current public website remains isolated behind the bounded HTML relay.',
  'Do not fetch and re-serve the generated redesign HTML through the public-site comparison relay. Load the signed preview capability directly with its inspect and comparison markers, preserve those markers during internal navigation, and inject the comparison bridge only while serving that exact private capability. Keep the redesign frame cross-origin from Inspect with scripts and same-origin enabled so its normal runtime, assets, hero reveal and hydration match Preview. Continue to relay the untrusted current public website without same-origin permission.',
  'Exact redesign comparison test package: makes the desktop hero and complete redesign render identically in Preview and Compare while retaining synchronized scrolling.',
  'foundation_change_required',
  'Removes the second HTML-proxy rendering path that could strand generated hero reveals, without weakening isolation for the original public website.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.9'
);
