insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 26.0, 'test_ready', base.id, 'made-solid-studio-builder-agent-v26.0',
  base.foundation_version, base.foundation_checksum,
  'Client handoff presents website and report readiness, saved client details, quote approval and a final review in a responsive guided workflow.',
  'Preserve exact release and quote checks, draft persistence and explicit invitation approval. Summarise the current client, project and contact before private preparation; keep technical history and launch guidance in accessible disclosures.',
  'Guided client handoff test package: clearer readiness, client details, quote approval and final review across mobile, tablet and desktop.',
  'foundation_change_required',
  'Makes the next handoff action understandable while preserving private preparation and deliberate client invitations.',
  '["framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v25.9'
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v26.0');
