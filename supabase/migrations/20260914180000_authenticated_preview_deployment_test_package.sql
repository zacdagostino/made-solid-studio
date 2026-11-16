insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.6, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.6',
  base.foundation_version, base.foundation_checksum,
  'The protected handoff worker passes its configured Vercel access token explicitly to every private project inspection, creation and preview deployment command. An explicit rehearsal retry resets exhausted infrastructure attempts on the same idempotent job.',
  'Require a server-only Vercel access token at worker startup, accept the runtime access-token variable or standard CLI token fallback, pass it directly to bounded Vercel commands, and never persist or expose it in browser state or job output.',
  'Authenticated preview deployment test package: removes interactive Vercel login and safely resets exhausted attempts when the owner retries the same rehearsal.',
  'foundation_change_required',
  'Makes automated rehearsal preview deployment reliable after runtime restarts while keeping the credential server-only.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.5'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.6');
