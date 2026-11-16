insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.4', base.foundation_version, base.foundation_checksum,
  'Made Solid Studio and the Made Solid website/Clientspace deploy only to their existing Railway projects and services. A synchronized release verifies and deploys the website receiver first, proves the signed runtime contract on madesolid.com.au, and deploys Studio only after that receiver is healthy.',
  'Never use Vercel for Made Solid Studio or the Made Solid website/Clientspace runtime. Target the existing Railway project, service and explicit development or production environment; never create a replacement service during release. Preserve receiver-first synchronized verification and stop before Studio when any website deployment or contract check fails.',
  'Railway-only product releases test package: moves website, Clientspace and Studio release automation onto their existing Railway services with receiver-first health gates.',
  'foundation_change_required',
  'Keeps every first-party Made Solid runtime on one documented deployment platform and prevents a future Codex release from silently falling back to Vercel.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.4'
);
