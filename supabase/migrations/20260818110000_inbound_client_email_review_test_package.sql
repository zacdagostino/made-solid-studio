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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.2',
  base.foundation_version, base.foundation_checksum,
  'A prospect workspace includes a context-aware email desk for inbound client messages. Every suggested reply stays review-only, names the saved business context used, preserves direct human edits, supports instruction-led draft revision, and never sends automatically.',
  'Keep inbound messages and reply drafts attached to the exact prospect. Surface business stage, matched contact, verified research, open work, outreach safeguards, and explicit uncertainties. Alert a human when a draft needs review, preserve direct editing and revision history, and keep test fixtures visibly isolated from real delivery. Do not add or imply automatic sending.',
  'Inbound client email review test package: adds a contextual review inbox, editable suggested replies, prompted revisions, and a safe dummy-account test flow.',
  'foundation_change_required',
  'Demonstrates a human-controlled client email copilot using the prospect workspace as grounded context while keeping delivery outside the test boundary.',
  '["inbound-client-email-review"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Inbound client email review test package:%'
);
