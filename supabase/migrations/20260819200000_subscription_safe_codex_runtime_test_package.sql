insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.8',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex Workspace Agent, Codex Website Builder, Codex Test Builder, and exported prospect workspace accept only ChatGPT subscription authentication. Each runtime enforces the ChatGPT login method, verifies the active session, strips API-key credentials, and stops instead of falling back to usage-based access. Separately billed OpenAI Analysis Workers are disabled by default and require matching protected-worker and visible UI opt-ins.',
  'Pass forced_login_method="chatgpt" to every Codex App Server, exec, and editable-workspace invocation. Reject non-chatgpt builder modes, validate codex login status before startup, and never forward OPENAI_API_KEY, SITEFORGE_CODEX_API_KEY, or CODEX_API_KEY into a Codex subscription process. Gate each direct Responses or Images API feature behind SITEFORGE_OPENAI_API_ENABLED=true, disclose its billing boundary before a user-triggered call, and preserve deterministic or human-review fallbacks when the gate is off.',
  'Subscription-safe Codex runtime test package: blocks API-key fallback for every Codex coding path and makes separately billed analysis explicit and default-off.',
  'foundation_change_required',
  'Makes the billing boundary enforceable across Studio chat, test builds, complete builds, exported workspaces, and optional analysis rather than relying on deployment convention.',
  '["visual-codex-feedback", "framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Subscription-safe Codex runtime test package:%'
);
