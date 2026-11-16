insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.8', base.foundation_version, base.foundation_checksum,
  'Codex runtime update, rollback, and failure notices can be dismissed for their exact lifecycle state. Adding camera-roll or captured image evidence keeps the message field compact and every inline composer action reachable while previews remain removable and horizontally scrollable.',
  'Give each visible Codex runtime-update state an accessible 44px dismiss action and allow a later lifecycle state to appear. Do not focus or expand the message field merely because an image was attached. Keep attachment previews in one bounded horizontal strip without clipping capture, setup, settings, Stop, or Send controls at mobile, tablet, or desktop widths.',
  'Compact Codex composer notifications test package: adds dismissible update notices and keeps photo attachments from pushing inline chat actions out of reach.',
  'foundation_change_required',
  'Keeps the embedded Codex chat controllable after photo attachment and lets the owner clear update or rollback notices without hiding later lifecycle changes.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.8'
);
