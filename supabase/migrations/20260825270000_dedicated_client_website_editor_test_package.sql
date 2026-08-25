insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  21.9,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.9',
  base.foundation_version, base.foundation_checksum,
  'Website editing opens a dedicated new-tab client editor scoped to one prospect, with the latest live website and that client’s Codex workspace visible together while review and checkpoint controls remain in Studio. A working preview is reusable only when its persisted workspace identity matches the canonical editable checkout selected by Studio; an older healthy process from another checkout must be replaced without deleting either source tree.',
  'Open the client website editor in a separate tab and keep its preview, client identity, return route, and client-scoped Codex context together. Resolve refinement history, final-edit state, live launch, recovery, committed snapshots, and Codex against one canonical prospect checkout. Persist the resolved workspace identity with every active working preview, reject a healthy registry entry whose workspace identity does not match, and restart from the canonical checkout. Preserve dirty or alternate checkouts for human recovery; never reset, overwrite, delete, or silently promote them. Keep committed edit previews bound to their exact Git revision and require the normal verified checkpoint workflow before a later HEAD becomes a new committed edit version.',
  'Dedicated client website editor test package: opens each client website with scoped Codex in a new tab and binds live preview recovery to the canonical checkout.',
  'foundation_change_required',
  'Keeps focused client editing easy to understand while preventing a healthy but stale Railway process from serving a different checkout than Studio’s ledger and checkpoint controls.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.9'
);
