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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.0',
  base.foundation_version, base.foundation_checksum,
  'Saved, queued, optimistic, and visual Codex chat messages render safe structured Markdown. Supported presentation includes headings, emphasis, lists, blockquotes, links, inline and fenced code, rules, and tabular content without executing embedded HTML or allowing wide content to overflow the chat surface.',
  'Render Markdown as escaped React elements rather than raw HTML. Restrict link protocols, identify external links, preserve keyboard access for horizontally scrollable code and tables, and contain long code, URLs, and table rows within the message at every required viewport.',
  'Markdown Codex chat test package: renders structured responses safely with readable code, links, lists, quotes, and tables.',
  'foundation_change_required',
  'Makes technical Codex responses readable in Studio while retaining safe content handling and responsive chat geometry.',
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
    and existing.summary like 'Markdown Codex chat test package:%'
);
