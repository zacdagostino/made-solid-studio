insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.3', base.foundation_version, base.foundation_checksum,
  'Every Codex conversation chooser title is a concise summary of its newest task, including referential follow-ups resolved from the preceding request. The chooser permanently distinguishes active running work from completed work; unread completion is an additional notification and does not replace the completed state.',
  'Keep conversation titles at 48 characters or fewer, strip captured-page instructions, and resolve short requests such as implement it against the preceding saved user prompt. Label active work Running with a spinner and completed work Completed with a distinct success icon and treatment. Preserve Completed after the chat is viewed, while clearing only its unread notification.',
  'Context-aware chat titles and states test package: concise latest-task names with durable Running and Completed dropdown states.',
  'foundation_change_required',
  'Makes every chat identifiable at a glance and keeps its running or completed lifecycle visible after notifications are read.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.3'
);
