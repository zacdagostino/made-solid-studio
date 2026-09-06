insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.4,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.4',
  base.foundation_version, base.foundation_checksum,
  'Every Studio Codex conversation title is a compact summary of that thread’s latest requested work. The title removes conversational lead-ins, capture provenance, links, and trailing purpose clauses while the existing adjacent state reports whether the work is active, finished, unread, interrupted, or ready.',
  'Derive every conversation chooser label from the newest thread preview without making another model or per-thread network request. Normalize common conversational requests into direct work summaries, preserve a saved thread name only when no preview exists, shorten at a readable word boundary, and keep live lifecycle and last-used information as separate accessible metadata.',
  'Concise current-work chat titles test package: makes every conversation recognizable at a glance from its latest task without slowing the chooser.',
  'foundation_change_required',
  'Makes the chat chooser scannable by turning each latest request into a short current-work label while retaining truthful live state and timing.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.4'
);
