insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.9,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.9',
  base.foundation_version, base.foundation_checksum,
  'The owner-only Codex panel on dev.madesolid.com.au uses the existing owner-authenticated Development Studio session and an explicit website-Codex marker. Only that marked iframe from the exact development website origin may be framed; normal Studio documents remain non-frameable.',
  'Keep the iframe itself behind the exact hello@madesolid.com.au website server authorization and never place a Supabase access token in browser markup or a URL. Authorize framing only when the explicit iframe marker, Fetch Metadata, exact development website referrer, and owner-authenticated Development Studio cookie all match. Reject every other iframe parent and retain owner-cookie protection for the document and its modules.',
  'Authenticated website Codex embed test package: replaces the broken frame with a narrowly frameable owner session while keeping the rest of Development Studio non-frameable.',
  'foundation_change_required',
  'Makes the authorized development-website launcher load reliably without weakening the existing owner-only Studio boundary.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.8'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.9'
);
