insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.3', base.foundation_version, base.foundation_checksum,
  'A signed first-email website review includes one restrained Made Solid response action outside the website viewport. The action uses contact details from the signed Clientspace review configuration, opens the visitor''s email application with a business-specific subject, and never accepts a recipient from editable Inspect URL parameters. It is absent from owner-only previews and hidden with every other review control in full screen.',
  'Render Email Zac only when the signed website-review configuration supplies a validated contact email and subject. Keep the original-email reply as the preferred way to retain conversation threading, do not add a form or Clientspace gate, preserve the exact website viewport geometry, and hide the response bar in focused full screen. Accept the preceding signed comparison contract during the coordinated runtime rollout.',
  'Inspect email reply CTA test package: adds a polished signed Email Zac action after the prospect reviews the redesign, without adding an account or feedback form.',
  'foundation_change_required',
  'Closes the cold-introduction review journey with a clear low-friction response path while preserving signed-review security and normal email replies.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.3'
);
