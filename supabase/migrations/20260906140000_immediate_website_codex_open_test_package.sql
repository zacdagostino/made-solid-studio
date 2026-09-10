insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  25.1,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v25.1',
  base.foundation_version, base.foundation_checksum,
  'The owner-only Codex launcher on the Made Solid development website accepts the first tap while its embedded Studio capability check is still connecting. The website queues that open request until the authenticated embedded listener is available and expands the trusted panel as soon as it acknowledges the open state, without waiting for the status request to complete.',
  'Render the connecting fallback as a keyboard- and touch-operable 56-pixel button. On activation, announce its opening state, repeatedly deliver the pending open request alongside host synchronization, and reveal only an iframe that has sent a validated open acknowledgement from the exact configured Studio origin and contentWindow. Preserve stale-frame recovery, top-level owner authorization, and client-preview exclusion.',
  'Immediate website Codex open test package: makes the connecting launcher accept the first tap and open as soon as the trusted embedded UI responds.',
  'foundation_change_required',
  'Removes the dead first-tap period on slower mobile loads without exposing an untrusted or discarded iframe.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v25.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.1'
);
