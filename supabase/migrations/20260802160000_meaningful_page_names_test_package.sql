-- Preserve resilient resume v6.5 and register meaningful visitor-facing page
-- names as the next immutable private test release. Production remains unchanged.
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
  'made-solid-studio-builder-agent-v6.6',
  base.foundation_version,
  base.foundation_checksum,
  'Give every generated route and internal link a concise visitor-facing name derived from approved page content. Replace placeholders such as Blank, Unnamed page, Untitled, New page, Placeholder, and raw path labels such as /blank without changing assigned route or evidence paths.',
  'Use the page dossier to name metadata, the H1, navigation links, breadcrumbs, cards, and contextual links consistently. A weak source label may be rewritten, but the new name cannot invent a service, location, qualification, or promise.',
  'Meaningful page names test package: replaces unnamed, blank, placeholder, and raw-path visitor labels with supported content-derived page and link names.',
  'policy_only',
  'Makes generated information architecture readable even when captured CMS page names are missing or malformed, while preserving immutable route evidence.',
  '["site-navigation-architecture", "framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.status = 'test_ready'
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Meaningful page names test package:%'
  );
