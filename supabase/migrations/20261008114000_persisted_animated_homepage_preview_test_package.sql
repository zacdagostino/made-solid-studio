insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.1, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.1', base.foundation_version, base.foundation_checksum,
  'The private Clientspace review-capture bucket explicitly accepts the bounded scrolling GIF alongside its existing JPEG and PNG evidence. The capture worker verifies that storage contract before persisting an animated first-email homepage preview.',
  'Keep the review-capture bucket private and capped at 6 MB, allow image/gif without removing image/jpeg or image/png, and fail safely before email preparation if the protected storage contract cannot be updated or the animation cannot be persisted.',
  'Persisted animated homepage preview test package: saves the verified scrolling GIF in Clientspace private storage for rehearsal email review.',
  'foundation_change_required',
  'Completes the animated preview workflow by aligning private storage with the already verified capture and email contracts.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.0'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.1'
);
