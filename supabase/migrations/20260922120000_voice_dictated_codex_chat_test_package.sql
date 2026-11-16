insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.4', base.foundation_version, base.foundation_checksum,
  'The Codex message composer can use browser speech recognition to append live transcription to the saved draft. Studio sends only the reviewed text when the owner explicitly presses Send; it never stores or forwards microphone audio.',
  'Expose a 44px accessible microphone control without reducing the compact composer. Show starting, listening, stopping, permission-error, and unavailable states; preserve existing draft text; stop on backgrounding or navigation; and require review before an explicit send.',
  'Voice-dictated Codex chat test package: adds live browser transcription as a reviewable message draft with explicit privacy and error states.',
  'foundation_change_required',
  'Lets the Studio owner speak longer Codex requests while retaining the same editable draft and deliberate send boundary.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.4'
);
