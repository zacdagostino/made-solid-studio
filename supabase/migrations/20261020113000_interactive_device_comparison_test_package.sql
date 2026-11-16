insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.5, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.5', base.foundation_version, base.foundation_checksum,
  'Compare mode uses a signed, bounded HTML relay to request the current and redesigned websites with the selected phone, tablet or desktop browser identity. The sandboxed live documents retain links, animation and native scrolling; a narrow centered divider is the only drag interception surface. A bridge synchronizes real document scroll positions and stops autoplay on the first page interaction.',
  'Resolve both comparison documents only from the signed review configuration and exact approved preview target. Reject redirects, non-HTML responses, oversized documents, private-network destinations and unsigned relay requests. Keep form submission blocked. Reset reveal to 50 percent on compare entry, reload and device changes, and synchronize native document scrolling by normalized progress without replacing either document with captured imagery.',
  'Interactive device-correct comparison test package: renders the actual desktop, tablet or phone websites inside Compare with live interaction, synchronized native scrolling and a reliably centered divider.',
  'foundation_change_required',
  'Fixes mobile browsers receiving the original site''s phone-only server rendering and removes the page-sized interaction blocker that made live websites behave like static images.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.4'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.5'
);
