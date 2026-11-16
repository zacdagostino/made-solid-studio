insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.9', base.foundation_version, base.foundation_checksum,
  'Research capture, redesign briefs, and Build Manifests may contain only stable public website pages. Authentication, login, OAuth, credential-bearing, and temporary session redirect URLs are excluded before they can become page plans or builder routes.',
  'Treat authentication redirects as failed private evidence, continue capturing the remaining public pages, normalise safe page URLs consistently across selection and disposition matching, and never expose session query parameters in a Build Manifest or builder error.',
  'Public-only manifest sources test package: excludes temporary authentication redirects while preserving every legitimate captured public page.',
  'foundation_change_required',
  'Prevents provider login sessions from becoming generated site routes or blocking an otherwise valid public-page manifest.',
  '["site-navigation-architecture"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.9'
);
