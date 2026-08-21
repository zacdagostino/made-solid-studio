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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.1',
  base.foundation_version, base.foundation_checksum,
  'Each waiting Studio Codex chat message can be deleted by its exact queue identifier before dispatch, with explicit confirmation and without changing sibling queued messages.',
  'Expose a labelled Delete action on every queued message, confirm the irreversible removal in an accessible dialog, and disable duplicate actions while it is pending. Claim a queued record before dispatch so deletion and delivery cannot race; a cancelled record must never be sent, interrupted, or presented as current queued work.',
  'Deletable queued Codex messages test package: removes an exact waiting message safely before Codex receives it.',
  'foundation_change_required',
  'Lets reviewers remove mistaken or obsolete queued directions without interrupting the active reply or affecting other waiting messages.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.1'
);
