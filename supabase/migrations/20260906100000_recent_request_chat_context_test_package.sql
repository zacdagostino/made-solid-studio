insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.7,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.7',
  base.foundation_version, base.foundation_checksum,
  'Every Studio Codex chooser label is derived from the newest privately saved request for that exact conversation, with the runtime thread preview retained only as a fallback. The open conversation keeps a compact, non-interactive copy of the reviewer''s latest request above the scrolling transcript, including queued and just-sent requests, while capture provenance stays hidden.',
  'Build one latest-request map from the already loaded private feedback records and apply it only to conversations that passed the existing workspace-scope checks; do not issue per-thread reads or model calls for titles. In the selected chat, prefer a just-sent request, then the newest queued request, then the newest rendered user message. Keep the pinned reminder outside the scrolling log, limit it to two visual lines, expose the full cleaned request as its title, and preserve the transcript''s available height at mobile, tablet, and desktop widths.',
  'Recent request chat context test package: keeps every chat title current and pins the latest request in a compact reminder.',
  'foundation_change_required',
  'Makes conversations identifiable from their actual latest work and keeps the current ask visible without repeated scrolling or a crowded chat surface.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.7'
);
