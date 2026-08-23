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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.1',
  base.foundation_version, base.foundation_checksum,
  'The client website editor separates conversations for the current client from universal Studio conversations, hides every other client, and binds new client conversations to that website repository only.',
  'Resolve client chat scope on the server from the authenticated editable workspace. List only conversations whose exact working directory is the current client repository plus explicitly universal Studio conversations. Reject cross-client thread IDs for reads and mutations. Start client conversations with the exact client directory as their only writable runtime root, preserve that boundary through queued turns and interruption recovery, and label the scope persistently in the editor UI. Keep universal conversations available and clearly identified without presenting them as client-confined.',
  'Client-scoped Codex chats test package: isolates each website editor while retaining clearly labelled universal Studio conversations.',
  'foundation_change_required',
  'Lets reviewers run multiple website-specific chats without exposing or accidentally editing another client project.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.1'
);
