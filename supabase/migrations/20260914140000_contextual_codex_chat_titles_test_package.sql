insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.2, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.2',
  base.foundation_version, base.foundation_checksum,
  'Studio Codex conversation titles describe the current work rather than copying an unclear latest message. A short referential follow-up retains its action while resolving its subject from the preceding private request or a meaningful saved title.',
  'Carry only the two newest already-saved prompts for each validated conversation into the private status response. Derive chooser labels locally with no additional model or per-thread request: summarize standalone prompts directly, resolve vague follow-ups such as implement it, discuss this, do it, or it still does not work against the preceding prompt, and ignore generic saved names when no useful context exists.',
  'Contextual Codex chat titles test package: keeps each chat recognizable when the latest message relies on earlier conversation context.',
  'foundation_change_required',
  'Makes the conversation chooser useful after short follow-ups without adding model latency, usage cost, or cross-thread reads.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v26.1'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.2');
