insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.4,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.4',
  base.foundation_version, base.foundation_checksum,
  'Authenticated Studio Codex chat preferences persist on the private runtime volume for the owner and restore after browser cookies or site data are deleted.',
  'Keep browser storage as an immediate offline cache, then hydrate model, per-model reasoning, Agent team, Fast, Auto-read, language, voice, reading style, and speed from one bounded owner-scoped runtime record after authentication. Migrate the browser choice when no runtime record exists, write atomically, and never expose preferences before the existing Studio owner authorization succeeds.',
  'Persistent Codex preferences test package: restores owner chat settings after cookies or browser site data are cleared.',
  'foundation_change_required',
  'Keeps the reviewer''s Codex setup consistent across cleared browser sessions and signed-in devices without weakening private runtime access.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.4'
);
