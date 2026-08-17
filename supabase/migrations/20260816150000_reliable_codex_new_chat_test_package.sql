insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.1',
  base.foundation_version, base.foundation_checksum,
  'New Codex conversations are immediately selectable before their first user message materializes the app-server thread. An empty newly started thread remains represented in conversation history, and a delayed status response for a previously selected thread cannot replace the current conversation.',
  'Cache newly started app-server threads until thread/read succeeds, return their empty conversation state while materialization is pending, and merge them with thread/list without duplication. Track the selected conversation synchronously on the client and discard any status response whose requested thread no longer matches it. Keep the empty conversation selected through polling until its first accepted message.',
  'Reliable Codex new-chat test package: keeps a newly created empty conversation selected and prevents stale status polling from reverting it.',
  'foundation_change_required',
  'Makes New chat deterministic across the Studio, Made Solid website, and prospect workspace chat surfaces even before the first message is sent.',
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
    and existing.summary like 'Reliable Codex new-chat test package:%'
);
