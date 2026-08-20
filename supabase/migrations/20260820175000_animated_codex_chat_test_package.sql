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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v16.4',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat enters and exits with a restrained, directional panel transition while preserving the dialog lifecycle, focus restoration, and immediate access to the workspace trigger.',
  'Animate both the opening and closing dialog states with short opacity, translation, and scale transitions anchored to the launcher edge. Keep the exit state mounted until its animation completes and disable all panel and overlay motion for prefers-reduced-motion.',
  'Animated Codex chat test package: adds polished open and close transitions with a reduced-motion fallback.',
  'foundation_change_required',
  'Makes opening and dismissing the Studio chat feel spatially connected to its launcher without delaying interaction or overriding accessibility preferences.',
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
    and existing.summary like 'Animated Codex chat test package:%'
);
