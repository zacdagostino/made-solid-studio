insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.5', base.foundation_version, base.foundation_checksum,
  'Responsive navigation quality replay completes the normal Escape-dismissal exit before changing the browser to reduced motion and testing the same trigger again. An invisible outgoing backdrop may never be mistaken for a broken compact trigger.',
  'Verify normal pointer opening, Escape dismissal, focus restoration, completed exit-layer removal, and reduced-motion reopening in that order. Report a persistent outgoing layer separately from a trigger activation failure, and never switch motion preferences during an active exit transition.',
  'Settled navigation quality test package: removes a false compact-menu failure caused by changing motion preferences during exit.',
  'foundation_change_required',
  'Keeps genuine blocked menu interactions reviewable while allowing valid responsive navigation to pass the complete browser suite.',
  '["visual-codex-feedback", "framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.5'
);
