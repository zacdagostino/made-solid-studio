insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.8,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.8',
  base.foundation_version, base.foundation_checksum,
  'Client-only Codex scope is active only inside the dedicated website editor. Prospect review and website-editing control pages retain the Universal Studio chat even when they refer to a specific client.',
  'Bind a client workspace directory only to the Codex instance rendered within the dedicated /website-editor route. Keep the persistent Studio chat universal on prospect tabs, including Website editing, so merely reviewing or preparing a client website never presents an editing-only notice or hides other Studio conversations.',
  'Editor-only client chat scope test package: limits the editing-only Codex notice and client workspace boundary to the dedicated website editor.',
  'foundation_change_required',
  'Makes the chat scope match the surface the reviewer actually opened and prevents an ordinary prospect page from looking like a live website-editing session.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.8'
);
