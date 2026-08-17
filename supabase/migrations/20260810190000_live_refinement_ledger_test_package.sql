-- Register the live local refinement ledger without changing production.
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
  'made-solid-studio-builder-agent-v10.8',
  base.foundation_version,
  base.foundation_checksum,
  'The Editable source is ready section includes a live, read-only view of the local prospect workspace refinement ledger. It reads the append-only workspace record through a validated same-origin endpoint and shows verified entries as they are recorded without copying them into Studio state.',
  'Keep refinement history private and workspace-scoped. Show truthful loading, unavailable, empty, ready, and error states; refresh the visual ledger while the panel is open and present each verified problem, fix, classification, page, and checked viewport without exposing unrelated files.',
  'Live refinement ledger test package: shows verified local website changes inside the editable-workspace launcher as they are recorded.',
  'foundation_change_required',
  'Makes local Codex refinements visible in Studio immediately while retaining the append-only repository ledger as the source of truth.',
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
      and existing.summary like 'Live refinement ledger test package:%'
  );
