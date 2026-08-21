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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.2',
  base.foundation_version, base.foundation_checksum,
  'Completed Studio Codex replies can use owner-authenticated Google Chirp 3 HD Australian English audio. Reviewers choose and preview an allow-listed voice in chat settings, retain that choice locally, hear every bounded reply chunk, and use exact generated-audio playback time and seeking. Google credentials remain server-only, generated audio remains private and ephemeral, and the corrected English device voice remains the automatic fallback.',
  'Expose only the documented en-AU Chirp 3 HD voice set through the authenticated private Studio runtime. Exchange a server-only least-privilege service-account assertion for a short-lived Google access token, validate voice and UTF-8 text bounds, redact upstream errors, and return private no-store MP3 audio without persisting it. In chat settings, provide a labelled voice selector and explicit preview/stop control, save the selected voice locally, and revoke every audio object URL. For completed replies, show loading, pause, resume, stop, exact elapsed and total audio time, and keyboard-accessible seeking. Abort and clean up on reply replacement, conversation change, panel close, navigation, or failure; fall back to English device speech when Google is unavailable.',
  'Selectable Google Codex voices test package: adds private Australian Chirp voice previews and exact seekable full-reply playback with free device fallback.',
  'foundation_change_required',
  'Gives the owner consistent natural Australian read-aloud voices with test-before-select settings while preserving private authentication, bounded cost, and a no-service fallback.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.2'
);
