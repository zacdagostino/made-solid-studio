insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.9',
  base.foundation_version, base.foundation_checksum,
  'The authenticated Studio owner can deliberately switch all Codex and OpenAI-backed Studio work between included ChatGPT subscription access and separately billed OpenAI API credits without exposing credentials to the browser.',
  'Default every Railway runtime to ChatGPT subscription access. Persist an owner-only billing preference on the Railway volume, require a server-side API key before enabling API credits, restart only the Codex app-server when the preference changes, and apply the same effective mode to Studio chat, website/test builders, analysis workers, and asset enrichment. Never reveal the key, silently enable API billing, switch during active or queued Codex work, or weaken the exact owner, organization, client, and repository boundaries.',
  'Owner API credits switch test package: adds a disclosed private control that can move all Studio AI work to separately billed API usage when subscription allowance is exhausted.',
  'foundation_change_required',
  'Keeps the Studio usable after subscription quota exhaustion while making the billing boundary explicit, reversible, owner-only, and credential-safe.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.9'
);
