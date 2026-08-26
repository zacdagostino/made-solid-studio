insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.7,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.7',
  base.foundation_version, base.foundation_checksum,
  'Website editing presents one client-named current website editor. The private source repository and local preview runtime are separate supporting controls and must never be described as another editor or an ambiguous editable workspace.',
  'Name the exact client website in the editing page and focused editor. Use Open [client] editor only for the combined preview and client-scoped Codex surface. Label repository and runtime actions as website source controls and Start local website preview, explain that they power the editor rather than replace it, and keep those technical actions visually secondary.',
  'Unambiguous website editing test package: names the client editor and separates it clearly from source repository and local preview controls.',
  'foundation_change_required',
  'Removes the false impression that Studio exposes two editors while preserving private source, preview runtime, and refinement-ledger operations.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.7'
);
