insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.4',
  base.foundation_version, base.foundation_checksum,
  'Studio Codex chat is available on its own route and as a persistent popup whose launcher and open conversation survive initial capability checks, refresh restoration, and in-place Studio source updates.',
  'Expose universal Codex chat as a normal authenticated Studio route while retaining the floating launcher on other Studio routes. Reuse one conversation, draft, preference, and transcript-position contract across both surfaces without rendering duplicate chat owners. Keep the launcher mounted in a truthful connecting or unavailable state instead of removing it during capability checks. An open popup, selected thread, draft, and transcript position must survive Studio update notifications and remount restoration; update indicators must never implicitly close the chat.',
  'Persistent Codex chat surfaces test package: adds a dedicated Studio chat page and keeps the popup launcher and open conversation stable through refresh and source updates.',
  'foundation_change_required',
  'Makes Codex continuously reachable during Studio work while preserving the same authenticated conversation state across page and popup presentations.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.4'
);
