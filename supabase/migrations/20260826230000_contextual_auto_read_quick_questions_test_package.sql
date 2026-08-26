insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.0,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.0',
  base.foundation_version, base.foundation_checksum,
  'A Quick question about selected Codex output inherits the complete selected conversation through its latest completed turn without adding the question or answer to that conversation. The temporary answer follows the saved Auto-read Codex preference and exposes in-dialog read, pause, resume, and stop controls.',
  'Bind selected text to its exact conversation, completed turn, and assistant message. Authorize that source thread against the active universal or client workspace, verify the excerpt against the saved assistant message, then create an ephemeral native fork in an empty temporary directory with no workspace roots and read-only thread and turn sandboxes. Answer from the inherited conversation, delete the fork and directory on every outcome, and never mutate the source thread. When Auto-read Codex is enabled, read each returned answer once with the saved voice, style, language, and speed; keep manual speech priority and stop temporary speech when the dialog closes or resets.',
  'Contextual auto-read Quick questions test package: answers from the whole selected conversation in an isolated fork and reads temporary answers with the saved voice preference.',
  'foundation_change_required',
  'Makes a precise follow-up useful without losing the surrounding conversation or requiring the reviewer to read the temporary answer manually.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.0'
);
