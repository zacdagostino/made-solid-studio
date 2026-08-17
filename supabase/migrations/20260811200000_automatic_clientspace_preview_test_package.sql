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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.1',
  base.foundation_version, base.foundation_checksum,
  'A Made Solid source handoff verifies the clean local repository against its exact commit, deploys and checks that commit on Vercel, then records the preview with the immutable source lineage. Clientspace creation remains locked until the verified preview and reviewed client email are both available.',
  'Never deploy a dirty, mismatched, or different repository. Persist observable verification, deployment, transfer, and admin checkpoints; attach a later completed preview to an existing Clientspace without sending outreach.',
  'Automatic Clientspace preview test package: deploys the exact committed edit and attaches it before client setup unlocks.',
  'foundation_change_required',
  'Makes the hosted client preview part of the durable handoff lifecycle instead of a separate manual deployment step.',
  '["framework-quality-gates"]'::jsonb,
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
    and existing.summary like 'Automatic Clientspace preview test package:%'
);
