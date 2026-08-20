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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.3',
  base.foundation_version, base.foundation_checksum,
  'A completed generated source handoff converts the protected builder copy into an owner-writable local workspace before adding refinement metadata. Approved transparent logo-family variants remain available together so Codex can select the correct contrast-safe mark for each direct surface.',
  'Keep the protected generation workspace immutable while Codex runs, then explicitly restore owner-write permission only in the disposable local-development copy before extending package.json. Stage every human-approved appearance variant derived from the approved primary logo and exclude unapproved mattes, suggestions, and unrelated marks.',
  'Editable handoff recovery test package: completes source export after browser checks and preserves the approved contextual logo family.',
  'foundation_change_required',
  'Prevents a passing generated site from failing while its editable source is packaged and keeps approved logo variants available for contrast-aware placement.',
  '["contextual-logo-selection", "framework-quality-gates"]'::jsonb,
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
    and existing.summary like 'Editable handoff recovery test package:%'
);
