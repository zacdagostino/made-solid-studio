insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.7',
  base.foundation_version, base.foundation_checksum,
  'A completed final Codex reply can create a durable branched conversation through that exact completed turn while retaining the original conversation unchanged.',
  'Use the native Codex thread fork contract at completed turn boundaries. Preserve the source thread, its native context, cleaned Studio prompts, approved image attachments, client or universal workspace scope, and recorded source lineage. Never offer a branch from progress output or an in-progress turn, never copy queued or running feedback records, and keep branch creation failure on the original selected conversation with a clear retryable error.',
  'Branchable Codex conversations test package: creates durable alternate chats from completed replies without changing the original conversation.',
  'foundation_change_required',
  'Adds native context-preserving Codex chat branches with exact turn boundaries, evidence continuity, accessible controls, and workspace isolation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.7'
);
