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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.6',
  base.foundation_version, base.foundation_checksum,
  'When a reviewer switches Codex conversations or creates a new chat, the Studio immediately replaces the previous transcript with a stable, accessible loading surface and renders only the requested conversation after its data is ready.',
  'Use one request-scoped transition state for conversation switching and creation. Remove stale messages from the active transcript immediately, preserve transcript geometry with Codex-native skeletons, announce the verified loading state, prevent duplicate or misrouted chat actions, and provide a static prefers-reduced-motion presentation. Restore the previous chat with a clear error if switching fails.',
  'Codex conversation loading test package: adds a polished, stale-safe loading experience for chat switching and creation.',
  'foundation_change_required',
  'Keeps chat navigation clear and trustworthy while a selected or newly created Codex conversation is loading.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v17.6'
);
