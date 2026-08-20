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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.9',
  base.foundation_version, base.foundation_checksum,
  'Made Solid Studio has a permanent Railway runtime in Singapore with a production-built authenticated web surface, supervised workers, loopback-only Codex App Server, persisted ChatGPT login and editable repositories, and expiring private build and workspace preview domains.',
  'Serve Studio runtime actions only after validating the current Supabase session and organization membership. Persist Codex state, editable repositories, prospect workspaces, and private preview state on the mounted runtime volume. Keep the App Server on loopback, strip OpenAI API keys, force ChatGPT login, preserve dirty repositories during restart, and issue expiring capabilities for every separate preview origin.',
  'Permanent Railway Studio runtime test package: keeps Studio, subscription-backed Codex, builds, workers, repositories, and private previews available after the browser closes.',
  'foundation_change_required',
  'Replaces the disposable Codespace lifecycle with a secured, persistent Studio runtime while retaining Supabase authorization and the existing ChatGPT subscription billing boundary.',
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
    and existing.summary like 'Permanent Railway Studio runtime test package:%'
);
