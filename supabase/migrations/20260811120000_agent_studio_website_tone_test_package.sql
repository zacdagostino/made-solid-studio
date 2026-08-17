-- Register Agent Studio website-tone controls without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v11.4',
  base.foundation_version,
  base.foundation_checksum,
  'Agent Studio private page tests and whole-site revisions expose the same per-run website-tone direction as complete prospect builds. Agent decides remains the default; Light and Dark remain guidance for overall visual character rather than fixed white or black palettes.',
  'Apply the selected Agent Studio website tone to both clean page tests and linked whole-site feature revisions. Save the direction in the scoped build instruction while retaining Codex ownership of the exact accessible, brand-aware palette.',
  'Agent Studio website tone test package: brings Agent decides, Light, and Dark direction into page tests and whole-site revisions.',
  'policy_only',
  'Keeps tonal comparisons explicit and consistent between Agent Studio tests and complete prospect builds without changing the approved brand evidence.',
  '["website-tone-direction"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Agent Studio website tone test package:%'
  );
