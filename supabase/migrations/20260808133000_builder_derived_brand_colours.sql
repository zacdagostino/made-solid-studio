-- Register independently delegated Brand Kit colour roles without changing production.
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
  'made-solid-studio-builder-agent-v9.6',
  base.foundation_version,
  base.foundation_checksum,
  'Primary and accent Brand Kit roles are independently review-controlled. Apply every enabled reviewed role exactly; for each deliberately disabled role, choose a coherent accessible design token without presenting it as a verified brand fact.',
  'Read brandKit.palette.mode before creating tokens. primary_and_accent locks both roles, accent_only derives primary, primary_only derives accent, and builder_derived derives both. Never restore a disabled stale value from evidence or an earlier manifest.',
  'Builder-derived colour roles test package: lets a reviewer delegate primary, accent, or both colour choices to Codex.',
  'foundation_change_required',
  'Supports deliberate design autonomy per colour role while preserving exact enforcement for every colour the reviewer keeps enabled.',
  '["contextual-logo-selection"]'::jsonb,
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
      and existing.summary like 'Builder-derived colour roles test package:%'
  );
