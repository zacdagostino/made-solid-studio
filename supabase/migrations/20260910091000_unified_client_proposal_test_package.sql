insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.2, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.2',
  base.foundation_version, base.foundation_checksum,
  'Studio prepares one client proposal from the current committed website. Saved editable client details and one source-bound approved quote follow the prospect into the existing Clientspace handoff. Preparation, invitation, payment and launch remain distinct observable stages.',
  'Prefill from saved contacts and captured evidence, preserve explicit edits, serialize draft saves and explain failures. Retain approved pricing across refreshes only while scope, commercial terms and validity still match. Keep original-build review creation out of the main proposal flow and hide internal learning tools behind disclosure. Carry the approved quote into immutable Clientspace quote history without treating a proposed deposit as paid.',
  'Unified client proposal test package: one saved form and quote, existing handoff navigation, transparent payment setup and clear launch steps.',
  'foundation_change_required', 'Unifies the owner proposal workflow and preserves source-bound commercial history without silently changing payment state.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
-- Use the preceding installed package in each workspace; local development already has v25.1.
where base.id = (select candidate.id from public.agent_packages candidate where candidate.organization_id = base.organization_id and candidate.version < 25.2 order by candidate.version desc limit 1)
and not exists (select 1 from public.agent_packages existing where existing.organization_id = base.organization_id and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.2');
