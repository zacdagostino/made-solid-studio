insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.7, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.7',
  base.foundation_version, base.foundation_checksum,
  'The development chat displays failures correctly even when its status API is served by an older packaged runtime.',
  'Recognize only the known complete Studio transport suffix when cleaning legacy user messages. Preserve message formatting and unrelated text. Use lastTurnStatus to show a generic failed-turn notice when the older runtime supplies no failure detail. Never retry or bypass blocked turns.',
  'Compatible Codex failure display test package: clean legacy failed messages and report failures from the packaged status API.',
  'foundation_change_required', 'Explains missing replies without leaking transport instructions or bypassing provider safety decisions.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.6'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.7');
