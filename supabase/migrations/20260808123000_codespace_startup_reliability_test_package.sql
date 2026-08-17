-- Register reliable Codespace startup without changing the published production package.
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
  'made-solid-studio-builder-agent-v9.4',
  base.foundation_version,
  base.foundation_checksum,
  'Every generated Next.js editing workspace has an explicit npm development command before publication. Codespace setup exposes the official Codex installer location on PATH before startup tasks launch the website and Codex terminal.',
  'Do not rely on the locked builder package to provide a development script. Add the deterministic Next.js dev command during the editable handoff, verify the checked-in Codespace and task files, and keep the Codex install directory on PATH.',
  'Codespace startup reliability test package: guarantees the exported website and Codex terminal can launch in the editing workspace.',
  'foundation_change_required',
  'Prevents a published editing repository from opening without a runnable website command or discoverable Codex executable.',
  '["framework-quality-gates"]'::jsonb,
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
      and existing.summary like 'Codespace startup reliability test package:%'
  );
