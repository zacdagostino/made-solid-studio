insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.5', base.foundation_version, base.foundation_checksum,
  'Studio chat and workspace refreshes remain non-blocking: a new chat accepts a focused draft while its durable thread is created, live transcript updates never blur that draft, and a cached app resume uses compact top status instead of the full-screen loading presentation.',
  'Keep new-chat creation honest and compact without fabricated transcript rows. Preserve focused draft input across streamed transcript updates. Use the synchronous cache hint only to choose presentation; IndexedDB and the repository remain the saved-data sources of truth and hydrate the mounted route dynamically.',
  'Uninterrupted Studio chat test package: keeps new-chat drafting, live typing and cached mobile resume usable during background work.',
  'foundation_change_required',
  'Removes blocking chat and resume states without weakening durable conversation or workspace hydration.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v31.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.5'
);
