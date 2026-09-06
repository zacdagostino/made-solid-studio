insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.1,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.1',
  base.foundation_version, base.foundation_checksum,
  'A newly created Codex conversation remains the selected safe empty chat while the live App Server is still materializing its first transcript. The bridge binds the sparse thread/start result to the already validated universal or client workspace and does not turn a temporary initial thread/read failure into an unreadable-conversation warning.',
  'Normalize every successful thread/start response with the exact requested workspace path and scope before storing or returning it. Preserve those trusted fields when thread/list or thread/read temporarily omits them. While the bridge still owns a newly started empty thread, treat a failed initial read as an empty transcript and retry through normal polling; retain the existing safety warning for every established or untrusted thread read failure.',
  'Reliable new Codex chat test package: keeps a fresh empty conversation usable while the live runtime materializes it instead of showing a false safety error.',
  'foundation_change_required',
  'Makes New chat dependable against sparse and temporarily unreadable App Server responses without weakening workspace isolation for existing conversations.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.1'
);
