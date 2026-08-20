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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.6',
  base.foundation_version, base.foundation_checksum,
  'Studio chat distinguishes concise Codex progress commentary from final answers, asks for useful context at meaningful transitions, and gives new user, assistant, queued, and working states restrained directional easing with a static reduced-motion fallback.',
  'During longer work, provide concise verified commentary before long tool runs and after meaningful findings or changes. Explain what is being checked, what changed, and what remains without exposing hidden reasoning or fabricating progress. Preserve message roles and commentary phases in the transcript, animate newly rendered states with restrained directional easing, and disable non-essential motion for prefers-reduced-motion.',
  'Contextual Codex chat test package: adds meaningful progress notes and polished, accessible message motion.',
  'foundation_change_required',
  'Makes longer Codex turns feel responsive and understandable while preserving truthful status, transcript semantics, and reduced-motion access.',
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
    and existing.summary like 'Contextual Codex chat test package:%'
);
