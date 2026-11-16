insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.9, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.9', base.foundation_version, base.foundation_checksum,
  'The first cold introduction is a direct Zac-to-client email and must not introduce, link to or create Clientspace access before the recipient expresses interest. It presents a complete redesign offer as four icon-led commitments and embeds one bounded current-to-redesign desktop/mobile animation linked to the verified redesign.',
  'Keep the first-email heading outcome-focused, explain that verified public pages, content and existing functionality were carried across, and promise to add anything important missed from the current website at no additional cost while excluding genuinely new functionality. Offer a normal email reply with no account or setup. Capture the verified current homepage and redesign into one labelled GIF: desktop before, wipe to redesign, real loading and hero motion, a short slow scroll, mobile before-and-after wipe, redesigned hold and fade reset. Keep it at 420 pixels wide, under 1.9 MB and within the 64 MB raw-frame budget.',
  'Direct reply comparison introduction test package: removes the premature Clientspace invitation, clarifies the complete redesign offer and delivers one bounded desktop-and-mobile before/after GIF.',
  'foundation_change_required',
  'Lets a cold prospect understand the finished offer and reply naturally before any portal workflow is introduced, without increasing attachment count or weakening verified-preview safeguards.',
  '["client-introduction-outreach", "client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.8'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.9'
);
