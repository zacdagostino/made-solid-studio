insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.4,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.4',
  base.foundation_version, base.foundation_checksum,
  'While a selected Codex conversation is working, its empty composer shows Stop Codex. Entering trimmed text or attaching at least one ready image immediately replaces Stop with Send so the reviewer can enqueue another message; clearing all draft content restores Stop.',
  'Derive the working composer action from ready draft content. Keep Stop available only while the selected turn is working and the composer has neither trimmed text nor a ready image. Show the existing Send action as soon as either content type is present, retain all model, reasoning, image-preparation, transition, and delivery guards, and enqueue through the existing thread-scoped message path. Preserve a stopping action once it has begun so its pending control cannot become Send mid-request.',
  'Queueable working Codex messages test package: changes Stop back to Send when text or an image is ready so follow-ups can be queued during active work.',
  'foundation_change_required',
  'Lets reviewers compose and queue the next instruction without waiting for the active Codex turn to finish or giving up access to Stop when the composer is empty.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.4'
);
