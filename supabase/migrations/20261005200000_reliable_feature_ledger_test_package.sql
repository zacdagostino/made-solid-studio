insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 31.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v31.0', base.foundation_version, base.foundation_checksum,
  'Feature Releases durably records every inspected completed Codex turn, reconciles the newest missing turns first in bounded batches, and never replays completed no-change conversations after a runtime restart. Generated feature wording uses a recognisable capability name and a multi-sentence owner-facing explanation, while manual wording remains immutable until the owner edits it again.',
  'Persist processed thread-and-turn keys with the private feature ledger, seed them from existing implementation history and cap retained reconciliation history. Reconcile a bounded newest-first batch and serialize overlapping maintenance passes. Treat Studio source as live in the editable development workspace, but require recorded deployment verification for the separate website and Clientspace development runtime. Never infer production deployment from workspace availability.',
  'Reliable feature ledger test package: keeps newly completed features current, improves their explanations and distinguishes the live Studio workspace from deployed environments.',
  'foundation_change_required',
  'Makes the Features tab a dependable owner record instead of a restart-sensitive best-effort list.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v31.0'
);
