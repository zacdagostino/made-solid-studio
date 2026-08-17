insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.3',
  base.foundation_version, base.foundation_checksum,
  'When mobile Chrome does not expose getDisplayMedia and cannot run the desktop capture helper, the Studio camera renders the current authenticated viewport directly from the live DOM. The capture preserves internal workspace scroll and current form values, excludes Codex controls, embeds local fonts and visible images, and produces a bounded crisp PNG without sending authentication state to a separate browser.',
  'Warm the mobile DOM capture engine after startup when screen capture is unavailable. Capture only the stable viewport root after the Codex composer has painted hidden, preserve and restore the internal main-scroll offset, cap output at two device pixels per CSS pixel, reuse cached font and image requests, and stop with a specific error on timeout, invalid PNG output, or a failed image decode. Never substitute an unauthenticated server-rendered Studio page or silently accept an incomplete screenshot.',
  'Mobile Studio capture test package: adds fast authenticated in-page screenshots for mobile Chrome with exact pixel, scroll, and failure safeguards.',
  'foundation_change_required',
  'Makes visual Codex feedback dependable on phones without weakening Studio authentication or returning a screenshot of the wrong page.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Mobile Studio capture test package:%'
);
