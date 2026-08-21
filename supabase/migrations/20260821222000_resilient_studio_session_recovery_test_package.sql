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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.8',
  base.foundation_version, base.foundation_checksum,
  'Studio runtime requests recover once from a stale signed-in session, malformed workspace cookies cannot stop the private preview proxy, and unavailable preview documents return through authenticated Studio re-entry.',
  'Refresh and replay a Studio runtime request once after an authenticated 401, then clear only the invalid local session and request sign-in. Treat malformed preview capabilities as absent, bound preview upstream waits, and redirect unavailable top-level preview documents through the authenticated Studio recovery route without exposing access tokens.',
  'Resilient Studio session recovery test package: recovers stale sessions and private previews without deleting browser cookies.',
  'foundation_change_required',
  'Keeps returning mobile reviewers in a recoverable signed-in flow while preventing malformed or stale preview cookies from taking down the shared Railway runtime.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.8'
);
