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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.7',
  base.foundation_version, base.foundation_checksum,
  'The compact local Codex chat renders the selected tmux-backed conversation log, allows switching among saved Studio threads, and routes new text or image-assisted turns to the selected history entry. A local Chrome and Brave helper can capture the exact visible Studio tab without the desktop-sharing chooser; external tabs and windows retain the secure browser chooser.',
  'Keep thread history and message reads bounded, expose only user and assistant text, and never render tool payloads or hidden reasoning. Scope the Manifest V3 content script to local Studio and Codespaces port 5173 URLs, validate requests again in the service worker, and keep the chooser-based capture fallback. Codespace startup must recover missing app-server, Codex, or Studio tmux processes through explicit health checks.',
  'Codex conversation capture test package: adds tmux chat history, selectable threads, chooser-free current-tab capture for Chrome and Brave, and recoverable Codespace startup.',
  'foundation_change_required',
  'Makes the Studio control a durable local Codex client with bounded conversation history and exact Chromium tab evidence while retaining secure external-screen capture.',
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
    and existing.summary like 'Codex conversation capture test package:%'
);
