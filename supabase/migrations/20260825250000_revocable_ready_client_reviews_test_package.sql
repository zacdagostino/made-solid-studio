insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  21.7,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.7',
  base.foundation_version, base.foundation_checksum,
  'A private client review remains revocable after it becomes ready. Revocation immediately disables every active review capability for the exact build before recording the ready publication as cancelled, while queued and running work retains its truthful cancellation lifecycle.',
  'Allow an authenticated organization member to cancel a queued, running, or ready private client review. Revoke every unrevoked review capability for the exact builder run before closing a ready publication, record its phase as revoked with a plain-language explanation, and make repeated cancellation safe. Cancel queued work before it starts; keep running work in cooperative cancellation until its next safe checkpoint. Preserve completed build evidence and never turn review cancellation into a production or source deletion action.',
  'Revocable ready client reviews test package: closes an already-ready private review immediately while preserving truthful queued and running cancellation states.',
  'foundation_change_required',
  'Closes the final review-link lifecycle gap so a reviewer can withdraw access after sharing without deleting the build or affecting production.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.7'
);
