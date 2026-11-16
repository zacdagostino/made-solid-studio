insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.7, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.7', base.foundation_version, base.foundation_checksum,
  'AI-interpreted chat titles persist in a dedicated runtime record that legacy Studio processes cannot overwrite. Title generation runs as private background work after status responses, so the authenticated development gateway never waits on the model turn.',
  'Store interpreted conversation titles separately from shared legacy conversation state. Schedule at most one bounded AI-title batch after returning each normal chat status response, persist valid results atomically, and let later status polls continue the backfill and reveal completed titles. Never make the browser hold open a long title-generation request.',
  'Durable AI chat titles test package: prevents legacy state overwrites and moves title interpretation behind non-blocking status polling.',
  'foundation_change_required',
  'Makes AI-interpreted titles survive runtime restarts and appear reliably through the real development gateway.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.6'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.7'
);
