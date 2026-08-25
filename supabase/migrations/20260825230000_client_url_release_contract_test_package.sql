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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.6',
  base.foundation_version, base.foundation_checksum,
  'Test builds, complete builds, client review links, live editing workspaces, committed edit previews, source handoffs, and production releases remain distinct versioned surfaces. Private review links expire and can be revoked; committed previews stay bound to one exact Git revision; a source handoff never deploys production or assigns a client domain.',
  'Open canonical /test and /build capabilities only after exact preview-origin, run, and token validation. Create /review capabilities only for quality-approved full-site builds, scope their frame policy to the configured Clientspace origin, expire them after seven days, and revoke them when publishing is cancelled. Key live preview routing by client directory plus working or exact 40-character Git revision so concurrent clients and historical edits cannot replace each other. Never restore a committed preview as the working editor after restart. A Made Solid source handoff may create an isolated Vercel preview for internal review, but must never pass --prod, attach a Made Solid domain, accept a reserved hostname, or treat handoff completion as production promotion.',
  'Client URL release contract test package: separates test, build, private review, exact edit, handoff, and production surfaces without changing production automatically.',
  'foundation_change_required',
  'Makes every client-facing URL state explicit and recoverable while closing public-preview, cross-client, historical-version, and accidental-production paths.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.6'
);
