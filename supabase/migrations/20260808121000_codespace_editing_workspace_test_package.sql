-- Register the repository-owned Codespace editing workspace contract without changing production.
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
  'made-solid-studio-builder-agent-v9.2',
  base.foundation_version,
  base.foundation_checksum,
  'Every completed editable-source handoff includes a checked-in Codespace definition that installs locked dependencies and the official Codex tools, forwards the preview port, starts the website, and opens Codex without storing authentication credentials in source.',
  'Keep Codespace startup reproducible and repository-owned. Authenticate Codex only through its supported cached browser login, CODEX_ACCESS_TOKEN, or OPENAI_API_KEY supplied as a Codespaces secret; never write a token or cached login into the generated repository.',
  'Codespace editing workspace test package: opens a complete website-development environment with the site and Codex ready to use.',
  'foundation_change_required',
  'Removes manual workspace setup while preserving private credentials and the separation between Studio and the generated client repository.',
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
      and existing.summary like 'Codespace editing workspace test package:%'
  );
