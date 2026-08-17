insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.6',
  base.foundation_version, base.foundation_checksum,
  'The local Codex control is a complete chat composer as well as a visual-feedback tool. Reviewers can send a text-only message immediately or attach a deliberately selected screenshot region before sending to the same active tmux conversation.',
  'Expose every live text-capable Codex model for chat, label image support clearly, and disable screenshot capture for text-only models. Queue text-only and image-assisted turns through the same private bridge without requiring an image or interrupting an active turn.',
  'Codex chat test package: adds direct text messaging while preserving optional reviewed screenshot attachments and live model selection.',
  'foundation_change_required',
  'Turns the visual-feedback launcher into a reusable local Codex chat composer for build, test, preview, and editing workflows.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Codex chat test package:%'
);
