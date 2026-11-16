insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.6', base.foundation_version, base.foundation_checksum,
  'Codex conversation names have separate compact and expanded presentations. The selected conversation control remains concise, while every open chooser row renders the complete contextual task summary without character truncation, ellipsis, or a line clamp.',
  'Keep the closed conversation selector at its existing compact 48-character title contract. In the open conversation chooser, generate the full cleaned contextual summary, preserve explanatory task clauses, wrap the complete title to as many lines as required, and never substitute an ellipsis. Maintain status metadata, touch targets, menu scrolling, and zero horizontal overflow at every required viewport.',
  'Expanded chat dropdown titles test package: shows each complete contextual task in the open chooser while keeping the selected chat compact.',
  'foundation_change_required',
  'Provides enough context to identify similar chats in the chooser without making the closed chat control oversized.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.6'
);
