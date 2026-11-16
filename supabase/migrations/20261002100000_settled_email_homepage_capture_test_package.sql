insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.7', base.foundation_version, base.foundation_checksum,
  'The first-introduction email may accept a generated homepage screenshot only from the versioned Made Solid capture bridge after the page has reached its final reveal state, fonts and visible media have loaded, and the viewport geometry has remained stable. An unverified, timed-out, stale-bridge, or partially loaded image keeps sending locked.',
  'Use the settled-email-homepage-capture-v2 handshake for email screenshots. Disable capture-time motion, wait for loaded fonts and every visible image or video, require a stable viewport across repeated checks, and fail with a retryable explanation instead of continuing after a timeout. Keep the exact verified website URL as the screenshot source and email destination.',
  'Settled email homepage capture test package: prevents the introduction email from saving a partially loaded website preview.',
  'foundation_change_required',
  'Makes the initial client email wait for a fully loaded, visually settled homepage and reject stale or incomplete captures.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.7'
);
