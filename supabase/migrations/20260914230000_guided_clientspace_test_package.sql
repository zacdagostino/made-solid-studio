insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.1, 'test_ready', base.id, 'made-solid-studio-builder-agent-v27.1',
  base.foundation_version, base.foundation_checksum,
  'A Clientspace rehearsal remains an internal child of its original prospect instead of appearing in the sales pipeline. Studio resolves the existing rehearsal before offering creation, displays the protected recipient and current Clientspace invitation lifecycle, and prevents accidental duplicate test records.',
  'Present one state-aware safe-test workflow on the original prospect. Keep internal rehearsal records out of prospect metrics and lists, query Clientspace read-only for account and invitation status, state exactly whether anything was sent, and place internal identifiers behind technical details.',
  'Guided Clientspace test package: replaces duplicate-looking rehearsal prospects with one truthful, state-aware test flow.',
  'foundation_change_required',
  'Makes first-client rehearsal understandable without weakening recipient isolation, billing blocks, launch blocks or deliberate invitation controls.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.0'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.1');
