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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.0',
  base.foundation_version, base.foundation_checksum,
  'Editable client websites run inside a Studio-owned workspace shell with a persistent return path and Studio Codex access; generated client source no longer contains the Codex panel or its host bridge.',
  'Keep workspace navigation and Codex controls in the authenticated Studio shell, outside the generated client project. Open the private client development server inside that shell, preserve a clear Back to Studio route across refresh and direct stable-host re-entry, and fall back to same-tab navigation when a browser blocks the requested preview tab. Do not add Studio iframe, bridge, chat, or navigation files to generated website source.',
  'Studio-owned workspace shell test package: keeps editable client previews recoverable while moving Codex and return navigation out of client project files.',
  'foundation_change_required',
  'Prevents the client dev server from trapping reviewers and keeps Studio editing tools separate from deliverable website source.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.0'
);
