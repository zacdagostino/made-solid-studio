insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.9', base.foundation_version, base.foundation_checksum,
  'Email homepage images require loaded visible media, a dismissed intro, completed finite reveal animations and stable rendered geometry and opacity. A loading timeout fails capture instead of saving an incomplete image.',
  'Use waitForHomepageCapture for every still homepage capture. Wait for visible images, backgrounds and videos, fonts, loader dismissal and finite animations. Leave infinite decorative motion alone. Never replace a loading timeout with a successful screenshot.',
  'Rendered email capture test package: waits for the website intro, media and reveal animations before saving the email image.',
  'foundation_change_required',
  'Prevents blank homepage screenshots in client introduction emails.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.9'
);
