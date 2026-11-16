insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.6', base.foundation_version, base.foundation_checksum,
  'The first introduction email embeds one still image of the new website homepage hero. The image comes from the saved verified desktop redesign comparison, and the signed Inspect link still opens the complete responsive old-and-new review.',
  'Do not attach old or new website GIFs to the introduction email. Read the new homepage JPEG from the protected saved capture, attach it inline once, and keep the interactive review as a link. Other email templates and the plain-text reply path remain unchanged.',
  'Still homepage email test package: replaces the paired introduction GIFs with one verified new-homepage hero image.',
  'foundation_change_required',
  'Makes the first prospect email faster to understand while keeping the complete old-and-new website review one click away.',
  '["client-introduction-outreach"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.6'
);
