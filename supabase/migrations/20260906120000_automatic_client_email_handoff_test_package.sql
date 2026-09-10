insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  24.9,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v24.9',
  base.foundation_version, base.foundation_checksum,
  'Every Clientspace handoff surface resolves one client email from the latest immutable Research Packet and its page-level public evidence, unless a saved prospect contact takes priority. Contact-page and general business addresses rank ahead of weaker candidates, rejected and no-reply values are excluded, and equally strong alternatives require a visible choice.',
  'Use the existing website capture instead of scraping again during handoff. Keep the selected address synchronized while evidence loads, stop automatic replacement after the reviewer edits it, show its source and alternatives, and never treat prefilling as permission to send email or create an account automatically.',
  'Automatic client email handoff test package: carries the best captured public address into both Clientspace handoff paths with visible provenance and ambiguity controls.',
  'foundation_change_required',
  'Removes repeated email entry while making the captured source, competing addresses, and no-send boundary clear before Clientspace creation.',
  '["framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v24.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v24.9'
);
