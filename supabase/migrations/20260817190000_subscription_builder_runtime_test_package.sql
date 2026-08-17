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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.2',
  base.foundation_version, base.foundation_checksum,
  'Every Agent Studio test build and complete prospect build uses the same persistent named tmux builder runtime. Trusted local workers default to the cached ChatGPT sign-in for subscription access; API-key billing requires an explicit opt-in. User-visible Codex messages remain persisted with their builder run and are not inserted into the general Studio conversation list.',
  'Verify ChatGPT authentication before invoking Codex, strip API credentials from subscription-backed child processes, preserve token usage without estimating API spend, and keep the safe user/assistant build transcript scoped to the immutable run. Retain API-key mode only as an explicit protected deployment option.',
  'Subscription builder runtime test package: moves test and proper builds onto the persistent tmux worker with build-scoped conversations.',
  'foundation_change_required',
  'Uses the reviewer''s Codex subscription for trusted local builds while keeping each saved build conversation in its own test or prospect record.',
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
    and existing.summary like 'Subscription builder runtime test package:%'
);
