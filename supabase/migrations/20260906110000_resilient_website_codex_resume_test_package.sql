insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.8,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.8',
  base.foundation_version, base.foundation_checksum,
  'The owner-only Codex iframe on the Made Solid development website never leaves a discarded browser frame visible after Android Chrome restores a backgrounded or closed tab. The website conceals the old frame during page hide and every foreground synchronization, waits for a trusted ready acknowledgement from the exact Studio origin and iframe window, and reloads the same authenticated embed with a cache-busting resume token when no acknowledgement arrives within a bounded delay.',
  'Preserve the iframe-owned open or closed conversation state across recovery. Keep the stale frame non-interactive and invisible, show only a compact owner-only reconnecting placeholder in its footprint, and reveal the iframe only after its validated panel-ready response. Apply the same path to focus, pageshow, online, and visible-state restoration without exposing the control to signed-out or non-owner accounts.',
  'Resilient website Codex resume test package: replaces broken restored frames with bounded automatic recovery.',
  'foundation_change_required',
  'Prevents Android Chrome from exposing a dead embedded Studio document when the Made Solid development website returns from the background.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.8'
);
