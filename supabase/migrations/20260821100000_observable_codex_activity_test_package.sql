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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.4',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat logs chronological observable activity entries inline between conversation messages, so verified workspace actions, lifecycle states, and results remain attached to the point in the exchange where they occurred. Activity is derived only from observable runtime events and never exposes or invents private model reasoning.',
  'Interleave observable activity entries with user, assistant-progress, and final messages using their real turn and item order. Present concise verified action labels, details, status, and duration with distinctive accessible styling and restrained motion plus a static prefers-reduced-motion variant. Do not collect the entries into a persistent bottom workbench, and never present hidden chain-of-thought or inferred internal reasoning.',
  'Observable Codex activity test package: logs verified chronological workspace activity inline with the chat without exposing private reasoning.',
  'foundation_change_required',
  'Keeps a clear, animated history of observable Codex work in its conversational context while preserving the boundary around private reasoning.',
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
    and existing.summary like 'Observable Codex activity test package:%'
);
