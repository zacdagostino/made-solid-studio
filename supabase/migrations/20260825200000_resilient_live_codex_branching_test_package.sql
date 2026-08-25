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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.4',
  base.foundation_version, base.foundation_checksum,
  'Authenticated live Studio branching allows enough time for a long Codex thread fork to complete, while an interrupted upstream response provides clear recovery guidance without claiming whether the fork completed.',
  'Keep live Codex branch requests bound to the authenticated owner, exact conversation, and current workspace while allowing the protected fork operation to run through its longer bounded response window. Never claim success without a returned branch result. When the upstream response is interrupted, explain: Branching was interrupted before Studio returned a result. Check Conversations for the new branch, then retry if it is not listed.',
  'Resilient live Codex branching test package: supports longer authenticated branch operations and gives interrupted responses clear check-before-retry guidance.',
  'foundation_change_required',
  'Prevents valid long-running branches from timing out early and makes an uncertain interrupted response safe to verify before retrying.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.4'
);
