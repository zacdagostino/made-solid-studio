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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.5',
  base.foundation_version, base.foundation_checksum,
  'Completed assistant replies in the Studio Codex chat offer an explicit read-aloud action backed by the browser speech-synthesis service and voices available on the reviewer''s device, without an API key or separately billed speech service. Only one reply plays at a time, and playback remains scoped to the active chat.',
  'Add accessible read-aloud controls to completed assistant replies. Start speech only from the reviewer''s action; support play, pause or resume, and stop, cancel speech when the active chat changes or the control unmounts, and announce meaningful playback or unsupported-state changes. Use available device voices with a language-appropriate fallback, split long replies into bounded readable segments, and account for mobile browsers that cancel rather than pause an utterance. Never claim these device voices are ChatGPT voices or send speech text to a Made Solid or OpenAI API.',
  'Device voice read aloud test package: reads completed Codex replies with free browser speech synthesis and accessible, chat-scoped playback controls.',
  'foundation_change_required',
  'Adds useful hands-free review without API credentials or per-character speech charges while keeping browser and device voice limitations explicit.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v17.5'
);
