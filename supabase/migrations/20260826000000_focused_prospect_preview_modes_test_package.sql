insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.1,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.1',
  base.foundation_version, base.foundation_checksum,
  'The focused prospect website editor provides fit, exact 768px tablet, and exact 1440px desktop preview modes plus an in-app full-preview mode. Fixed viewports scale inside the available Studio surface without changing the website browsing context width or creating page overflow. Client-scoped Codex conversations and Universal Studio conversations remain visibly grouped, and leaving the website editing context restores the universal chat scope.',
  'Keep preview viewport selection separate from the generated website source. Render tablet and desktop modes at their exact CSS viewport widths and scale the visual surface down when the device is narrower, including after phone rotation. Full preview hides secondary editor chrome and the Codex column without entering browser Fullscreen or losing the selected mode. Label client conversation groups with the selected client, keep the Universal Studio group visible even when either group is empty, reject other-client conversations server-side, and remove the client workspace parameter whenever the user leaves the website editing or preview route.',
  'Focused prospect preview modes test package: adds fit, tablet, desktop, and full-preview views while making client and universal chat scope explicit and route-bound.',
  'foundation_change_required',
  'Makes responsive prospect review practical from phone, tablet, and desktop while keeping website-specific Codex work visibly separated from universal Studio work.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.1'
);
