insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 33.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v33.2', base.foundation_version, base.foundation_checksum,
  'The first introduction embeds two verified comparison animations: one true 1440 by 900 desktop capture and one true 375 by 812 mobile capture. Each keeps the current website and redesign side by side, scrolls both pages together at a slow percentage-matched pace, holds the bottom and fades directly back to the opening frame.',
  'Do not stretch mobile content into a desktop canvas, crop the current desktop site, or use a reveal wipe. Warm and verify media before capture, replay the redesign loading and hero entrance beside the current-site opening frame, then scroll both sides by relative page progress for about 22 seconds. Store and require both bounded GIFs before enabling the first email.',
  'Paired device comparison email test package: separates desktop and mobile into smooth side-by-side GIFs with correct proportions, complete current-site framing and a slow fade-reset loop.',
  'foundation_change_required',
  'Makes the emailed comparison readable and faithful on each device without restoring the stretched single-GIF presentation or weakening the verified capture boundary.',
  '["client-introduction-outreach", "client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v33.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v33.2'
);
