insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.3,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.3',
  base.foundation_version, base.foundation_checksum,
  'A validated newly created Codex conversation remains safely selectable across browser refreshes and live bridge reloads while Codex App Server 0.153.1 reports list_turns as unsupported for its still-empty transcript. The bridge persists only bounded thread identity, exact workspace scope and path, runtime status, and timestamps in private server storage, then removes that record when the conversation materializes or is deleted.',
  'Persist at most ten bridge-created empty-thread trust records atomically outside the feedback queue. Hydrate them before opening the App Server connection, validate their exact workspace path and scope on every use, and never persist transcript or prompt content. Treat an unsupported initial list_turns read as an empty transcript only for one of those trusted records. Remove the record after readable content appears or deletion succeeds; retain the existing safety warning for every untrusted thread read failure.',
  'Durable new Codex chat test package: keeps a validated empty chat usable across refreshes and bridge reloads while the live runtime finishes materializing it.',
  'foundation_change_required',
  'Makes New chat reliable against the exact Codex 0.153.1 empty-transcript response without weakening client-workspace isolation or persisting conversation content.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.3'
);
