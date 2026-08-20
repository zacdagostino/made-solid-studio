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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v14.9',
  base.foundation_version, base.foundation_checksum,
  'Every prompt accepted by the embedded Studio Codex bridge is persisted as an app-owned running turn with its app-server turn id. The server reconciles completion independently of the browser, and after a Codespace pause it resumes one interrupted app-owned turn from the saved transcript without replaying the original prompt.',
  'Keep unfinished turn leases in private local storage until the app server reports a terminal state. On restart, recover an interrupted leased turn at most once, preserve both repository roots, and do not auto-recover when a queued interrupt or replacement message exists. Expose the packaged bubblewrap helper on PATH without root access, disable invalid shell snapshots in the Codespace launcher, and enable the Codex idle-sleep inhibitor.',
  'Durable Codex turn recovery test package: keeps app-owned chats running independently of the panel and safely resumes work after a Codespace pause.',
  'foundation_change_required',
  'Removes the browser-lifecycle dependency from embedded chats and makes Codespace suspension a recoverable server-side lifecycle event.',
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
    and existing.summary like 'Durable Codex turn recovery test package:%'
);
