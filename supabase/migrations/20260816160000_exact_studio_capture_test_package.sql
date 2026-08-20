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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.2',
  base.foundation_version, base.foundation_checksum,
  'The primary camera action captures the visible Studio tab rather than reopening an unauthenticated copy of Studio. The browser helper remains the chooser-free path when installed; without it, Studio requests the browser current-tab surface directly. Embedded local website workspaces may continue using the private server renderer because their page does not depend on the Studio authentication session. Every capture path exposes an immediate persisted UI phase while work is pending.',
  'Never use the server-side page renderer for a top-level Studio route because it cannot inherit the user browser authentication session or exact visible state. Prefer the installed capture helper, otherwise request getDisplayMedia synchronously from the camera activation with preferCurrentTab and browser-surface constraints. Use server rendering only when a validated embedded workspace context names the actual local website. Hide the composer and show an accessible capture-status message until area selection or a clear error is ready.',
  'Exact Studio capture test package: captures the real active Studio tab, avoids unauthenticated login screenshots, and adds immediate capture progress.',
  'foundation_change_required',
  'Makes visual feedback accurate and responsive in authenticated Studio prospect workspaces while preserving fast chooser-free capture where the helper is available.',
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
    and existing.summary like 'Exact Studio capture test package:%'
);
