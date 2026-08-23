insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.4',
  base.foundation_version, base.foundation_checksum,
  'Every editable client workspace installs the complete dependency graph pinned by its lockfile, including development tooling, even when the Railway container itself runs with NODE_ENV=production.',
  'Run npm ci with --include=dev whenever Studio prepares a cloned client repository, an exported completed build, or an immutable committed-preview worktree. Keep NODE_ENV=development for the website development server, and never allow Next.js to repair, install, or upgrade missing TypeScript tooling in client project files.',
  'Locked workspace development dependencies test package: preserves client lockfiles and prevents Next.js from mutating editable website projects on Railway.',
  'foundation_change_required',
  'Makes every client website workspace reproducible on Railway by installing its exact locked development toolchain before Next.js starts.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.4'
);
