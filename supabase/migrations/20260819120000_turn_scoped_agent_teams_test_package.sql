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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.6',
  base.foundation_version, base.foundation_checksum,
  'Every visible Agent team is scoped to the exact supervisor turn that spawned its root agents. The team panel follows the final visible output from that turn, remains there when later direct prompts are submitted, and a later delegated turn receives a separate team panel.',
  'Return the parent turn identifier with every transcript message and descendant agent. Resolve nested agents through their root child thread, prefer persisted collaboration tool-call state, and use turn timing only as a compatibility fallback. Group agents by supervisor turn and render each group immediately after that turn''s latest visible message rather than in one global transcript footer.',
  'Turn-scoped Agent teams test package: keeps every team beside the output that created it instead of following later prompts.',
  'foundation_change_required',
  'Makes multi-agent history read like a truthful conversation by preserving which output each team produced across later direct and delegated prompts.',
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
    and existing.summary like 'Turn-scoped Agent teams test package:%'
);
