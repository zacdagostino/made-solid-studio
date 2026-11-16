insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.8, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.8',
  base.foundation_version, base.foundation_checksum,
  'A failed Codex turn can continue in a newly selected conversation from the last completed assistant reply while the original conversation remains unchanged.',
  'Offer recovery only when a completed assistant reply can be branched. Use the existing protected native branch operation with that successful turn identifier, exclude the failed user turn and its transport context, never retry the failed prompt automatically, and focus the composer after the recovered conversation opens.',
  'Failed chat continuation test package: continue safely from the last successful reply without replaying the failed prompt.',
  'foundation_change_required', 'Restores a usable composer after a failed turn while preserving the provider safety decision and the original conversation.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.7'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.8');
