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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.7',
  base.foundation_version, base.foundation_checksum,
  'Every browser-facing Studio, Made Solid website, prospect preview, Storybook, and preview-host port is restored to public visibility after a Codespace restart or service rebind. A persistent workspace watcher applies visibility only when an approved service is listening; the loopback Codex app-server is never published.',
  'Run the public-port watcher in its own persistent tmux window for both Studio and generated editable website workspaces. Reapply GitHub Codespaces public visibility whenever an approved listening port appears because Codespaces resets public ports to private after restart or re-forwarding. Keep port 4500 and unapproved transient test ports private.',
  'Public Codespace ports test package: automatically restores public browser access after every restart while keeping the Codex control port internal.',
  'foundation_change_required',
  'Prevents working Studio and prospect URLs from unexpectedly requiring private Codespaces authentication after restart.',
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
    and existing.summary like 'Public Codespace ports test package:%'
);
