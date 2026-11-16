insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.2', base.foundation_version, base.foundation_checksum,
  'The dedicated Clientspace access email is a short entry message rather than a second proposal. Its primary Open your Clientspace action appears immediately after one concise workspace summary, followed by one passwordless-return note. The public Made Solid FAQ links to the real client login and explains initial confirmation, later passwordless access, expired links and new devices.',
  'Keep cold outreach separate from Clientspace access. In the access email, put the one-time confirmation action before secondary explanation, omit repeated website and report sections, and explain passwordless return access once without weakening the scanner-safe confirmation or exact-recipient boundary. Keep the public login guidance accurate, actionable and keyboard accessible.',
  'Concise Clientspace access test package: moves the secure workspace action to the top of a shorter email and documents passwordless return access in the public FAQ.',
  'foundation_change_required',
  'Reduces friction at the moment an interested client enters Clientspace while making the real passwordless login route and recovery path easy to find later.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.2'
);
