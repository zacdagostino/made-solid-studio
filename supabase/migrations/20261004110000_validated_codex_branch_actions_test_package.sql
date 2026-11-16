insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 29.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v29.5', base.foundation_version, base.foundation_checksum,
  'The dedicated Codex branch endpoint accepts only intentional branch and repair actions. Unknown actions fail before any conversation lookup or Codex work begins.',
  'Validate the dedicated branch endpoint action against branch-thread and repair-thread before calling the Codex bridge. Return a clear private validation error for every unknown action, while preserving the selected workspace and branch purpose for valid requests.',
  'Validated Codex branch actions test package: rejects unknown dedicated branch actions before Codex work begins.',
  'foundation_change_required',
  'Keeps branch and repair requests deterministic and prevents malformed Studio requests from being interpreted as intentional branches.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v29.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v29.5'
);
