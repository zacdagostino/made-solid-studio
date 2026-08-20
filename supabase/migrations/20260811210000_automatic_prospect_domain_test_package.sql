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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.2',
  base.foundation_version, base.foundation_checksum,
  'Every exact-edit handoff derives a safe first-level hostname from the source repository, assigns that hostname to the matching Vercel project, and verifies the public HTTPS response before recording the preview or unlocking Clientspace creation.',
  'Use the configured Made Solid apex domain only after its Vercel DNS zone is authoritative. Persist deployment and domain-verification checkpoints separately; never substitute a provider URL when the branded hostname fails.',
  'Automatic prospect-domain test package: assigns and verifies each prospect''s madesolid.com.au website during handoff.',
  'foundation_change_required',
  'Makes branded prospect hosting deterministic and removes per-prospect DNS work from Clientspace setup.',
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
    and existing.summary like 'Automatic prospect-domain test package:%'
);
