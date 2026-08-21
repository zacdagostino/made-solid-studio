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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.9',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat presents only the Agent team that belongs to the current or latest visible supervisor turn, labels each assignment from its actual agent path, and shows only child-owned result updates rather than inherited supervisor history.',
  'Map current App Server subAgentActivity records to their exact supervisor turn while retaining legacy compatibility. Exclude inherited parent turns from child status and transcript data, keep historical teams out of unrelated transcript windows, anchor the visible team to its initiating request, and summarize assigned, working, and complete counts once. A completed turn remains completed when a follow-up is queued.',
  'Agent-team clarity test package: removes inherited and historical chat noise, fixes exact turn placement, and reports one truthful team status.',
  'foundation_change_required',
  'Makes Agent team delegation understandable and trustworthy without exposing copied supervisor prompts or misleading lifecycle state.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Agent-team clarity test package:%'
);
