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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.5',
  base.foundation_version, base.foundation_checksum,
  'The active Studio Codex composer accepts up to five JPEG, PNG, or WebP images in one message. Selected images remain inside the current draft, can be removed individually, and move into the submitted user message without a separate visual-review dialog.',
  'Append valid multi-file selections to the active draft, preserve the message and ready images after failures, reject invalid or excess files without discarding valid selections, and deliver every ready image as a localImage input in original selection order. Keep screenshot region selection available, then return the result to the same composer.',
  'Inline multi-image Codex chat test package: keeps up to five selected photos and screenshots inside the active message composer and delivers them together.',
  'foundation_change_required',
  'Removes the detached upload-review workflow and makes visual context behave like a durable, editable part of the current Codex message.',
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
    and existing.summary like 'Inline multi-image Codex chat test package:%'
);
