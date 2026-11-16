insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.6, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.6',
  base.foundation_version, base.foundation_checksum,
  'Failed Codex turns preserve the original user message and show an explicit failure notice. Safety-blocked turns are identified without exposing raw provider output or automatically retrying them.',
  'Use saved feedback records to remove transport context from failed and dispatching messages. Derive a safe failure notice from the latest failed turn; clear it when a newer turn supersedes it. Keep safety controls intact and never replay blocked requests automatically.',
  'Visible Codex failures test package: clean failed messages and explicit turn failure notices.',
  'foundation_change_required', 'Explains missing replies without leaking transport instructions or bypassing provider safety decisions.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.5'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.6');
