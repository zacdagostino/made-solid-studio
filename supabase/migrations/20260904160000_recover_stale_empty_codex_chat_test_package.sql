insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.6,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.6',
  base.foundation_version, base.foundation_checksum,
  'A browser selection that points to an older empty Codex thread without a durable bridge record no longer traps the Studio owner behind a false safety warning. When the live App Server returns its specific unsupported list_turns response for that unmaterialized selection, Studio exposes none of the unknown thread and falls back to a separately validated listed conversation or an empty ready surface. A changed bridge waits for the current maintenance or queue flush checkpoint and then replaces the old instance instead of allowing recurring maintenance to starve live reload indefinitely.',
  'Continue to show the preserved-conversation safety warning for every genuine read error. Suppress it only when the requested untrusted identifier returns the App Server unmaterialized-thread signature. Do not adopt, display, send to, or infer a workspace for that orphan identifier; discard the stale selection and use only an independently listed, exact-workspace conversation. Keep durable trust records for all newly bridge-created empty chats. When bridge source mtime changes, await only the active maintenance or flush promise, retry bridge resolution immediately, transfer trusted started-thread state, and close the old instance.',
  'Stale empty Codex chat recovery test package: loads the current bridge and releases older orphaned New chat selections from the false safety warning without trusting or exposing them.',
  'foundation_change_required',
  'Ensures the live development endpoint adopts the recovery, letting affected browsers recover while retaining the exact safety boundary for real unreadable and cross-workspace conversations.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.6'
);
