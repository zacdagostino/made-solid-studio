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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.3',
  base.foundation_version, base.foundation_checksum,
  'The shared Studio Codex composer accepts a JPEG, PNG, or WebP photo from the device photo library as visual context. The selected photo passes through the existing private visual review and attachment pipeline, with explicit type, size, loading, and failure states.',
  'Expose a keyboard-labelled photo-library action only for image-capable models. Accept one supported photo smaller than 15 MB, preserve the unsent prompt, require visual review before sending, and never request direct camera capture when the reviewer chooses the photo-library action.',
  'Camera-roll photo upload test package: adds reviewed device photo attachments to the shared Codex chat composer.',
  'foundation_change_required',
  'Lets reviewers provide existing phone photos as private visual context without routing them through screen capture.',
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
    and existing.summary like 'Camera-roll photo upload test package:%'
);
