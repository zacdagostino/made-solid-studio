insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.8,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.8',
  base.foundation_version, base.foundation_checksum,
  'The Codex control on the Made Solid development website is rendered only after the website server confirms the exact authenticated Studio admin account and staff record. The embedded Studio panel resynchronizes its remembered open state after the host bridge is ready, so returning to an already-open chat expands it instead of leaving it trapped in the launcher frame.',
  'Keep the website Codex iframe and its bridge script absent from signed-out and non-admin responses. Reuse the server-side Studio admin authorization boundary rather than relying on client-side hiding. On iframe load, request the current embedded panel state and accept resize messages only from the configured Studio origin and exact iframe contentWindow. Preserve the owner gateway and runtime authorization checks.',
  'Owner-only website Codex panel test package: hides the development-site chat from every non-owner and reliably restores an already-open owner chat.',
  'foundation_change_required',
  'Makes the development website chat both owner-private and dependable across remembered chat state without weakening the Studio runtime boundary.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.7'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.8'
);
