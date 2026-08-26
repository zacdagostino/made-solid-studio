insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  22.3,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v22.3',
  base.foundation_version, base.foundation_checksum,
  'A newly created Codex conversation starts with an empty activity timeline and cannot display progress from the previously selected conversation. A mounted chat refreshes its selected-thread status immediately when the document becomes visible, the page is shown, the browser regains focus, or the network returns, without waiting for a suspended polling interval.',
  'Clear messages, activities, agents, and queue state together when selecting a newly created conversation. Keep status rendering scoped to that selected thread. Retain bounded active and idle polling, but also request current selected-thread status after visibilitychange to visible, pageshow, window focus, and online events; ignore hidden-page events and preserve stale-response sequencing so an older request cannot replace the resumed state.',
  'Resume-aware Codex progress test package: prevents previous-chat progress flashes and refreshes loading conversations automatically after a phone, tab, browser, or network resumes.',
  'foundation_change_required',
  'Keeps conversation progress truthful at chat creation and across mobile browser suspension without requiring a manual refresh.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v22.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v22.3'
);
