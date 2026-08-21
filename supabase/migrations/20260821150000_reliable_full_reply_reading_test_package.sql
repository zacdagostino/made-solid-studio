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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.9',
  base.foundation_version, base.foundation_checksum,
  'Completed Codex replies provide reliable, user-initiated English read-aloud for the full reply using the reviewer''s available device voices. Playback advances through every bounded chunk in order and exposes an explicitly estimated elapsed-and-total timeline; it remains scoped to the active reply and chat.',
  'Extend the existing browser speech-synthesis read-aloud behaviour without adding a separately billed speech service. Select only reported English voices, preferring a local Australian English voice, and mark each utterance as English. Read every speech-friendly chunk of the completed reply exactly once and ignore stale completion events so long replies cannot skip, repeat, or stop early. Show an accessible estimated elapsed-and-total timeline while playing, freeze it while paused, and clear it when playback stops, completes, errors, the reply changes, or the active chat changes.',
  'Reliable full-reply reading test package: reads completed Codex replies fully in English with resilient device-voice playback and an estimated timeline.',
  'foundation_change_required',
  'Makes free device-voice playback dependable for long English replies and gives reviewers an honest sense of listening progress without claiming an exact audio duration.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v17.9'
);
