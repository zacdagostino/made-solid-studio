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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.7',
  base.foundation_version, base.foundation_checksum,
  'Google Cloud authentication uses the standards-compliant JWT bearer grant so the live global voice catalogue and selected cloud playback load instead of silently falling back to Australian device voices.',
  'Exchange the signed service-account assertion with the exact OAuth JWT bearer grant identifier urn:ietf:params:oauth:grant-type:jwt-bearer. Keep a regression assertion for the full identifier before accepting global catalogue or synthesis behavior.',
  'Authenticated Google voice catalogue test package: loads the worldwide Google catalogue and cloud playback with the valid OAuth grant.',
  'foundation_change_required',
  'Restores the intended worldwide voice selection and Google audio while retaining the safe Australian fallback for genuine upstream outages.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.7'
);
