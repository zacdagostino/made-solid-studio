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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.0',
  base.foundation_version, base.foundation_checksum,
  'The embedded Studio Codex composer offers an explicit Agent team work mode. An enabled request authorizes the parent Codex thread to supervise useful parallel sub-agents while the private bridge returns the real spawned-thread hierarchy, task, status, timing, and bounded sub-chat transcript.',
  'Persist Direct or Agent team as a local reviewer preference and with each queued request. In Agent team mode, delegate only useful independent workstreams, keep final ownership in the parent thread, and never fabricate workers or progress. Discover descendants through the app-server ancestor-thread filter, preserve parent relationships, bound thread and transcript reads, and render live starting, working, completed, interrupted, and error states with accessible expandable sub-chats.',
  'Agent team chat test package: adds explicit supervisor delegation and a live, inspectable hierarchy of attached Codex sub-chats.',
  'foundation_change_required',
  'Turns the Studio Codex modal into a transparent multi-agent workspace where reviewers can see delegated work happen and inspect each real sub-chat.',
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
    and existing.summary like 'Agent team chat test package:%'
);
