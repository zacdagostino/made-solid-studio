insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v19.5',
  base.foundation_version, base.foundation_checksum,
  'Made Solid Workspace visibly remains the stable instant-development environment. Its opaque client frame receives a short-lived partitioned frame capability so same-client CSS, JavaScript, images, and live updates load without making the top-level capability cross-site, while the dedicated scoped Codex document is transformed by Vite before rendering.',
  'Present the current client preview and client-scoped Codex as explicit Workspace surfaces with Preview and Codex controls, a desktop split editing state, and one-surface-at-a-time mobile switching. Label navigation to Studio as an intentional exit. Keep the top-level capability cookie HttpOnly, Secure, and SameSite=Strict; use an HttpOnly, Secure, SameSite=None, Partitioned cookie only for the opaque client frame; reject ambiguous cross-client frame cookies; and constrain proxied client documents to same-origin framing. Preserve only the validated non-secret last workspace directory in a separate long-lived Strict cookie so an expired bare visit can ask authenticated Studio to issue a fresh capability for that client. Transform the dedicated Codex HTML through Vite so React refresh and the real editor render, while normal Studio pages remain non-frameable from Workspace.',
  'Reliable Workspace development surfaces test package: restores client assets and Codex rendering while making Preview, scoped Codex, instant updates, and Studio exit unambiguous.',
  'foundation_change_required',
  'Makes Workspace visibly and technically behave as the stable live client development environment without weakening client or Studio isolation.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v19.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v19.5'
);
