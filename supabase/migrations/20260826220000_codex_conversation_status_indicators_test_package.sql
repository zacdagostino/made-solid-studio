insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.9,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.9',
  base.foundation_version, base.foundation_checksum,
  'Every conversation in the Codex chat selector exposes its current activity state. Working conversations show a loading indicator, while a finished conversation that has not been viewed since completion shows an unread notification indicator until selected. Interrupted conversations remain explicitly interrupted and do not receive the finished indicator.',
  'Derive conversation activity and unread completion state from persisted lifecycle evidence for every selector row, not only the selected conversation. Animate the loading indicator with a reduced-motion alternative, give status icons accessible text, and clear the unread completion indicator only when the user views that finished conversation.',
  'Codex conversation status indicators test package: shows working chats and unread finished chats across the conversation selector.',
  'foundation_change_required',
  'Makes concurrent chat progress and unseen completions visible before a reviewer opens each conversation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.9'
);
