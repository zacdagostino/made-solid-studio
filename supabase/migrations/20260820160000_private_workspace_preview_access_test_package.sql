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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.4',
  base.foundation_version, base.foundation_checksum,
  'The permanent Studio runtime issues working, expiring capabilities for the private editable-workspace preview domain so authenticated reviewers can see the current source immediately without publishing it.',
  'Verify private workspace-preview capabilities against the current clock, reject expired or invalid signatures, exchange a valid query capability for the secure preview cookie, and proxy only the active matching workspace. Keep the preview private, expiring, no-index, and separate from production publication.',
  'Private workspace preview access test package: restores valid expiring links for immediate review of the active Studio or website source.',
  'foundation_change_required',
  'Makes the existing private Railway preview lane usable for immediate source review while preserving its signed, expiring access boundary.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Private workspace preview access test package:%'
);
