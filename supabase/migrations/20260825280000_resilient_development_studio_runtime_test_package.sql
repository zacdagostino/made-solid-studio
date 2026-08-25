insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.0,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.0',
  base.foundation_version, base.foundation_checksum,
  'The editable development Studio serves optimized dependencies from a runtime-owned cache that build verification cannot remove. Its supervisor probes both the Vite client and a real React dependency, restarts an unhealthy live server automatically, and the document shell remains visible with one bounded reconnect attempt plus a manual recovery action when application modules cannot start.',
  'Keep live-serve and build optimizer caches physically separate. Run the Railway development Vite server with a runtime-owned cache outside the editable checkout, and probe both /@vite/client and the optimized React dependency while its process is alive. Restart after two consecutive failed probes. Ship a dependency-free startup shell in the HTML document, attempt one session-scoped reload after a module startup failure, and then show a clear reload action that states saved source is safe. Never leave a blank document as the failure state.',
  'Resilient development Studio runtime test package: prevents build checks from blanking the live app and recovers visibly when frontend modules fail.',
  'foundation_change_required',
  'Separates verification from the live module graph and adds automatic plus user-visible recovery for development Studio startup failures.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.0'
);
