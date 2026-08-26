insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.2,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.2',
  base.foundation_version, base.foundation_checksum,
  'A newly created persistent Codex conversation remains a valid empty selection until its first user message materializes stored turn history. Temporary Quick Questions run in an ephemeral read-only thread and collect their answer from scoped app-server item and turn completion events instead of requesting stored turns that ephemeral threads do not support. The Quick Question surface uses the same dark visual system as the parent Codex chat.',
  'Keep the exact newly started thread in the visible conversation ledger while it is empty, and suppress only the expected not-materialized history-read response for that app-started thread; preserve genuine unreadable-conversation errors. Subscribe to app-server notifications before starting an ephemeral turn, treat the final completed agent-message item as authoritative, require a completed turn, remove the temporary thread and directory, and never add the exchange to conversation history. Render Quick Question with dark surfaces, accessible contrast, and unchanged focus, error, loading, and action semantics.',
  'Reliable Codex ephemeral chats test package: keeps new empty chats safe and makes dark Quick Questions complete through live turn events.',
  'foundation_change_required',
  'Removes two chat dead ends without weakening corrupt-history isolation or persisting temporary questions.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.1'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.2'
);
