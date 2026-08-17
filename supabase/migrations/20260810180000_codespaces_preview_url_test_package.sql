-- Register Codespaces-aware preview URLs without changing production.
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
  'made-solid-studio-builder-agent-v10.7',
  base.foundation_version,
  base.foundation_checksum,
  'Website preview links use the explicit Codespaces name and port-forwarding domain when running in GitHub Codespaces, regardless of proxy Host rewriting. Ordinary local development retains localhost URLs.',
  'Build the Codespaces preview URL from CODESPACE_NAME, the selected server port, and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN. Fall back to the request host or localhost only outside Codespaces.',
  'Codespaces preview URL test package: opens the forwarded prospect-site port instead of localhost while preserving local-PC behavior.',
  'foundation_change_required',
  'Makes automatic preview opening reach the actual Codespaces tunnel without changing how local developers access localhost.',
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
      and existing.summary like 'Codespaces preview URL test package:%'
  );
