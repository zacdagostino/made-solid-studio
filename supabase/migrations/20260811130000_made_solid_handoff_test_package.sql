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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v11.5',
  base.foundation_version, base.foundation_checksum,
  'A completed prospect edit enters Made Solid admin only as an exact, immutable Git revision. The protected handoff lifecycle records its repository, branch, full commit SHA, edit version, manifest and agent-package lineage; it never substitutes earlier generated artifacts and never publishes or contacts the client.',
  'Require a synced final-edit checkpoint and verified private editable-source publication before queueing a Made Solid handoff. Persist queued, running, concrete phase detail, completed checkpoints, cancellation, stable failure context and the returned private admin URL. Append later commits as ordered revisions while preserving earlier handoffs.',
  'Made Solid source handoff test package: moves exact committed edit revisions into the private admin workspace with live, cancellable progress.',
  'foundation_change_required',
  'Connects post-build editing to client operations without confusing a builder artifact, private admin record, Clientspace account or public release.',
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
    and existing.summary like 'Made Solid source handoff test package:%'
);
