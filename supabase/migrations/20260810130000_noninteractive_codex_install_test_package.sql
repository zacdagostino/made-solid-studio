-- Register non-interactive Codex installation without changing production.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v10.2',
  base.foundation_version,
  base.foundation_checksum,
  'Codex CLI installation in an automatic editing workspace must set the installer-supported CODEX_NON_INTERACTIVE flag so the background startup can never wait on the Start Codex now terminal prompt.',
  'Pipe the official installer into CODEX_NON_INTERACTIVE=1 sh, retain bounded download retries, and start Codex only inside the named tmux window after setup completes.',
  'Non-interactive Codex install test package: prevents first-run Codespace setup from waiting at the installer launch prompt.',
  'foundation_change_required',
  'Makes automatic startup deterministic after dependency installation while preserving the official Codex installer and normal tmux login flow.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Non-interactive Codex install test package:%'
  );
