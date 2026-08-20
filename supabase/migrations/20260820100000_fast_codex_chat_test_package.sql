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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.0',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat settings expose the selected model''s Fast service tier independently from its reasoning level. The preference persists locally and applies consistently to new conversations, queued turns, interrupted continuations, and recovered work.',
  'Discover service tiers from the live Codex model catalog. Enable Fast only when the selected model advertises the priority tier, label its increased usage clearly, default safely to Standard, and pass the selected service tier through every app-server thread and turn lifecycle without silently changing reasoning effort.',
  'Fast Codex chat test package: adds a persistent, model-aware Fast setting with end-to-end priority-tier delivery.',
  'foundation_change_required',
  'Gives Studio reviewers the same explicit speed choice as Codex while preserving accurate model capability checks and lifecycle recovery.',
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
    and existing.summary like 'Fast Codex chat test package:%'
);
