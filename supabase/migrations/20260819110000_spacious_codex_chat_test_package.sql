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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.5',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex client prioritizes readable prompts and technical output with a wider desktop panel, a compact conversation header, and a two-row composer. Model, reasoning, and Agent team preferences remain keyboard-accessible behind one clearly labelled settings control instead of permanently reducing transcript space.',
  'Keep the empty or reviewing composer to a prompt row and a 44-pixel action toolbar. Expand the prompt only on deliberate focus, expose model, reasoning, and work mode in an anchored settings surface, close that surface with Escape, and preserve visible focus, accessible names, touch targets, and overflow-free layouts at every required viewport.',
  'Spacious Codex chat test package: gives prompts and code output more room with a compact header, two-row composer, and on-demand settings panel.',
  'foundation_change_required',
  'Makes long prompts and technical responses easier to read without removing any capture, model, reasoning, or Agent team controls.',
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
    and existing.summary like 'Spacious Codex chat test package:%'
);
