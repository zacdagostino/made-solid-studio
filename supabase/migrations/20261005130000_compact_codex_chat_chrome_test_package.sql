insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.3', base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat keeps workspace scope in its compact header and gives the conversation picker and new-chat action one intrinsic control row. Neither control may absorb the transcript''s flexible height at any supported viewport.',
  'Render Universal Studio or client-only scope as a concise labelled header chip with its fuller explanation available as accessible context. Keep the conversation selector and 44px new-chat touch target aligned in a content-sized row, reserve remaining height for the transcript, and verify the open chat without overflow at mobile, tablet, and desktop widths.',
  'Compact Codex chat chrome test package: moves workspace scope into the header and prevents the new-chat row from stretching into transcript space.',
  'foundation_change_required',
  'Restores usable transcript space in the Studio chat while retaining clear scope, keyboard access, and a full-size touch target for starting a conversation.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.3'
);
