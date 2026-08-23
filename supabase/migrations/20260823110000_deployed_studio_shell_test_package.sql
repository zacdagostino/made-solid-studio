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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.0',
  base.foundation_version, base.foundation_checksum,
  'The public Studio shell always runs the exact reviewed Railway image release while Codex keeps both persistent Git workspaces available for repository-scoped editing, commits, builds, and deployment.',
  'Serve Studio application code and runtime middleware from the immutable Railway image. Keep /data/workspaces/siteforge-os and /data/workspaces/made-solid-website as the exact Codex workspace roots. A Codex source change becomes production only after it is reviewed, committed, pushed, built, and deployed; an uncommitted persistent checkout must never pin the public shell to an obsolete release.',
  'Deployed Studio shell test package: prevents persistent uncommitted work from leaving the live owner interface on an obsolete release.',
  'foundation_change_required',
  'Makes every successful Railway deployment visible immediately without deleting or weakening either persistent editable repository.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.0'
);
