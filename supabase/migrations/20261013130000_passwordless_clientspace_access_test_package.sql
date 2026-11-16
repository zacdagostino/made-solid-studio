insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.4', base.foundation_version, base.foundation_checksum,
  'Cold outreach and Clientspace access are separate reviewed messages. The first introduction offers a normal email reply without an account or portal link. After interest, the reviewer can send a dedicated passwordless Clientspace access email whose one-time confirmation opens the welcome, explains future secure-link sign-in, then introduces Milo.',
  'Track the introduction receipt separately from the Clientspace invitation state. Generate a fresh magic link only for the explicitly selected Clientspace access delivery, preserve the scanner-safe confirmation step, and never ask the client to create or remember a password. Keep the welcome header and navigation rail clear at mobile, tablet and desktop widths, and make Milo available in protected rehearsals as well as authenticated client entry.',
  'Passwordless Clientspace access test package: separates cold outreach from the later secure access email, explains account entry after the welcome and restores Milo across responsive rehearsal entry.',
  'foundation_change_required',
  'Makes the client journey explicit and secure without introducing an account before interest, while preserving review-only delivery controls and the passwordless authentication boundary.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.4'
);
