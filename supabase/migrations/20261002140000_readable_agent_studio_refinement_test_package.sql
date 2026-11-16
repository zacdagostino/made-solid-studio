insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.0', base.foundation_version, base.foundation_checksum,
  'Agent Studio advanced refinement remains a full-width, readable disclosure at every supported viewport and during live source updates. Earlier stacked refinement markup and the current disclosure layout may coexist briefly without collapsing explanatory text into a narrow grid column.',
  'Scope the current two-column summary layout to its explicit disclosure variant, retain a safe single-column base header for live-update compatibility, and verify the closed and open refinement states at 320 by 568, 375 by 812, 768 by 1024, and 1440 by 900 without horizontal overflow.',
  'Readable Agent Studio refinement test package: keeps advanced package guidance full-width through compact layouts and live source transitions.',
  'foundation_change_required',
  'Prevents Agent Studio refinement guidance from collapsing into one-word lines while the development UI receives a source update.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.0'
);
