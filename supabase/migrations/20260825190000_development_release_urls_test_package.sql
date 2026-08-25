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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.3',
  base.foundation_version, base.foundation_checksum,
  'Studio and the Made Solid website expose separate owner-only development surfaces, exact saved Git versions, and explicit production destinations. Canonical development hostnames are additive, legacy Workspace entry remains compatible, private build capabilities identify tests and complete builds, and no development change promotes itself.',
  'Keep dev.studio.madesolid.com.au separate from studio.madesolid.com.au and dev.madesolid.com.au separate from madesolid.com.au. Retain workspace.madesolid.com.au as a compatibility entry until verified retirement. Present repository changes and saved feature versions in Studio, route generated tests through /test capabilities and complete builds through /build capabilities, preserve legacy /site links, and require an exact reviewed version plus an authenticated deployment connection before production promotion.',
  'Development release URLs test package: separates Studio and website development, preserves Workspace compatibility, labels private test/build capabilities, and keeps production promotion explicit.',
  'foundation_change_required',
  'Makes development and production destinations understandable while keeping every current production route untouched during rollout.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.3'
);
