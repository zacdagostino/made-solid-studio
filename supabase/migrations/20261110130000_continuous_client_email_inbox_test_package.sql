insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.7', base.foundation_version, base.foundation_checksum,
  'The supervised Studio runtime checks the protected Clientspace inbox receiver every minute. Clientspace saves email from exact project address matches once, prepares private review-only AI drafts, and exposes unread project email to admin Overview, Messages, and open-session notifications.',
  'Keep inbound email private and project-scoped. Never send an AI reply automatically. Clear unread status only when staff open the matching email; keep the background check independent of whether the admin browser is open.',
  'Continuous client email inbox test package: checks incoming mail in the background and alerts staff to new project-specific email.',
  'foundation_change_required',
  'Makes the existing review desk timely and discoverable without changing the human approval boundary for replies.',
  '["inbound-client-email-review"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.7'
);
