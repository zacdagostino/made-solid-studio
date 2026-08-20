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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.1',
  base.foundation_version, base.foundation_checksum,
  'The permanent Railway runtime verifies both persisted repository origins before launch. When GitHub authentication is temporarily unavailable, it preserves and starts from those existing checkouts instead of replacing them or crash-looping; a missing or mismatched checkout still fails closed.',
  'Require GitHub access to both private repositories for initial provisioning and normal refresh. If that access is unavailable after both exact repositories have already been verified on the mounted volume, skip network refresh and preserve their current clean or dirty state. Never create, replace, or accept an unexpected repository while offline.',
  'Railway persistent-checkout test package: keeps the private Studio available from verified volume checkouts during a temporary GitHub credential or provider outage.',
  'foundation_change_required',
  'Makes permanent Studio startup resilient without weakening the two-repository workspace-write boundary, owner gate, or ChatGPT subscription authentication.',
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
    and existing.summary like 'Railway persistent-checkout test package:%'
);
