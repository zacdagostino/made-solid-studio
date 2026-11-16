insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.1', base.foundation_version, base.foundation_checksum,
  'Studio Codex distinguishes purchased ChatGPT flexible-usage credits from separately billed OpenAI API access. When included usage is exhausted and the signed-in Codex account reports a usable credit balance, chat visibly states that ChatGPT credits are active and shows the verified remaining balance.',
  'Read the Codex credit snapshot and ordinaryUsageAllowed state from account/rateLimits/read. Expose only bounded credit availability, unlimited status, and non-negative balance. Show an active-credit notice in the chat header and the exact remaining balance in Chat settings only when included use is exhausted and credits are available. Label server API-key billing as a separate mechanism and never infer or estimate a credit balance.',
  'Visible ChatGPT credits test package: confirms when Codex has moved beyond included usage and shows the live remaining credit balance without conflating it with API billing.',
  'foundation_change_required',
  'Makes the active paid-usage state and remaining ChatGPT credit balance clear before the owner continues a Codex conversation.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.1'
);
