insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.3', base.foundation_version, base.foundation_checksum,
  'Paired comparison capture must remain inside the email-safe asset budget for real prospect pages. The mobile composition preserves the true 375 by 812 viewport ratio while adapting only its encoded canvas and palette; it must never substitute the obsolete single animation.',
  'Keep the 22-second percentage-matched scroll, loading sequence, hero entrance, bottom hold and fade reset intact. Encode the mobile pair on a compact proportional canvas and progressively reduce palette complexity when necessary, without stretching either panel or dropping back to a reveal wipe.',
  'Email-safe paired comparison test package: keeps the real mobile pair smooth, proportional and below the inline-image limit on content-heavy prospect pages.',
  'foundation_change_required',
  'Prevents live prospect content from rejecting the new mobile animation while preserving the paired-device interaction and verified asset boundary.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.3'
);
