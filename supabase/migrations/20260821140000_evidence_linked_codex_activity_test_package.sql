insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.8',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex transcript can associate structural observable outcomes and explicit assistant commentary chronologically within the turn where they occurred. Each outcome remains evidence-linked to its observable runtime event and exposes only bounded public metadata; it never presents inferred conclusions, raw command output, diffs, tool results, or private reasoning.',
  'Build chronological chat activity only from explicit assistant commentary and allowlisted structural outcomes emitted by the Codex App Server, preserving their real turn and item order and stable evidence association. Structural outcomes may identify bounded facts such as a lifecycle change, affected-file count, completed check, browser verification, or delegated task state. Do not infer conclusions from those events, and never render raw command output, file diffs, tool-call inputs or results, hidden chain-of-thought, or private reasoning.',
  'Evidence-linked Codex activity test package: associates structural work outcomes with explicit commentary in chronological chat order while keeping private execution data hidden.',
  'foundation_change_required',
  'Makes observable Codex work more useful and auditable by linking concise structural outcomes to the commentary that explains them without exposing private execution detail.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v17.8'
);
