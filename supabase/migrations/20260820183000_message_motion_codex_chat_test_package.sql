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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.8',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat moves an outgoing message from the active composer into the transcript immediately, restores the exact draft after delivery failure, and presents active Codex generation as a restrained animated assistant-side message.',
  'Render an optimistic outgoing message synchronously when Send is activated, clear and collapse the submitted composer, reconcile the optimistic record with the accepted turn, and restore its text and images on failure. Keep the generating treatment on the assistant side, announce working state once through status semantics, and disable all decorative message motion for prefers-reduced-motion.',
  'Message-motion Codex chat test package: adds immediate composer-to-thread delivery motion and a compact animated assistant response state.',
  'foundation_change_required',
  'Makes sending and waiting feel spatially connected to the conversation while retaining failure recovery and reduced-motion access.',
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
    and existing.summary like 'Message-motion Codex chat test package:%'
);
