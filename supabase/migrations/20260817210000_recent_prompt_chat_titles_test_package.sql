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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.4',
  base.foundation_version, base.foundation_checksum,
  'Every Studio Codex conversation is labelled with a concise, readable title derived from that thread''s most recent user prompt. Capture provenance is excluded, and an older automatic thread name is used only when no prompt preview exists.',
  'Prefer the current thread preview over its static name, remove appended Captured from provenance, normalize whitespace, and shorten only at a word boundary. Keep New chat for conversations without either source.',
  'Recent-prompt chat titles test package: keeps the conversation chooser aligned with the latest request in every chat.',
  'foundation_change_required',
  'Makes concurrent chats recognizable by their current task instead of a stale title created earlier in the conversation.',
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
    and existing.summary like 'Recent-prompt chat titles test package:%'
);
