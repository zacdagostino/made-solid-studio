-- Register resilient final-edit verification without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v11.1',
  base.foundation_version,
  base.foundation_checksum,
  'Final-edit verification captures meaningful command output instead of returning only a framework worker footer. A transient Next.js export-worker or global-error failure receives one bounded complete-verification retry before the checkpoint fails. The push uses the stored write-capable GitHub CLI credential instead of a read-only Codespaces token.',
  'Retain enough redacted verification output to explain a final-edit failure. Retry the complete verification once only when Next reports an export-worker or global-error termination, then continue bundling, committing, and pushing only after the retry passes. Remove GITHUB_TOKEN from the push environment after configuring the stored GitHub CLI credential.',
  'Resilient final edit test package: retries transient Next export-worker failures once and returns the useful build context when verification still fails.',
  'foundation_change_required',
  'Prevents a temporary static-export worker stop or read-only Codespaces token from abandoning an otherwise valid final edit while keeping deterministic verification failures visible and uncommitted.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Resilient final edit test package:%'
  );
