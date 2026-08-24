insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.3',
  base.foundation_version, base.foundation_checksum,
  'Studio Codex read aloud restores the complete reviewer-controlled voice experience: natural or literal reading, three saved speeds, opt-in chat-scoped automatic reading, progressive cloud playback, and an interactive read-along dock that remains usable while the transcript scrolls.',
  'Keep speech user-initiated unless the reviewer explicitly enables Auto-read for the open chat. Persist Natural or Literal reading style, 0.85x, 1x, or 1.15x speed, language, model, and voice preferences locally; apply the same effective rate and locale-aware selection to Google and device fallback speech. Auto-read only stable new Codex commentary and the final reply, de-duplicate messages, coalesce queued progress to its newest update, and let manual Read pre-empt automatic speech. Fetch bounded Google chunks concurrently, start the first ready chunk without waiting for the rest, keep at most 24 private in-memory MP3 blobs, and abort or ignore late audio after conversation, panel, or navigation changes. Keep the active word visible in a persistent accessible dock with pause, resume, stop, five-second skip, exact Google seeking, and keyboard or pointer restart from a rendered word. Revoke every object URL, preserve device fallback, and use a static active-word treatment when reduced motion is requested.',
  'Restored Codex voice experience test package: brings back saved listening preferences, opt-in auto-read, progressive private audio, and interactive read-along controls.',
  'foundation_change_required',
  'Restores the four developed Codex listening features in the Workspace development Studio without weakening speech privacy, cancellation, accessibility, or client-chat isolation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.3'
);
