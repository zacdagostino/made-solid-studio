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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.1',
  base.foundation_version, base.foundation_checksum,
  'The bare Workspace hostname is a canonical entry to Made Solid Studio, while only an explicit exact-client launch opens the isolated live website development shell.',
  'Redirect every top-level Workspace request without an exact client directory or valid fresh query capability to the Studio prospects UI, regardless of active, expired, or remembered Workspace cookies. Never infer a client from the active preview process or a last-client cookie. Require the authenticated Studio access endpoint to receive and return the same validated client directory. Preserve explicit client launch, clean scoped refresh, authenticated exact-client recovery, opaque Preview-origin capability paths, and client-bound Codex authorization.',
  'Canonical Workspace entry test package: makes a direct Workspace visit open Studio instead of silently selecting the active or previously viewed client.',
  'foundation_change_required',
  'Separates Studio entry from explicit website editing so the Workspace hostname cannot surprise the reviewer with an unrelated client preview.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.1'
);
