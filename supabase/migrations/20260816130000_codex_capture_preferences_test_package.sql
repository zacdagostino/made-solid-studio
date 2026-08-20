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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.9',
  base.foundation_version, base.foundation_checksum,
  'The embedded Codex capture surface expands to the full development-preview viewport while a region is selected, automatically advances a valid drag to visual-feedback review, and gives explicit selection guidance. Current-tab capture waits until the composer is hidden and the browser has repainted, so the captured image cannot contain a frozen copy of its own camera control. When the optional browser helper is unavailable, the private Studio service captures only the validated current local workspace URL at its reported viewport and scroll position, hides the Codex control, and returns the image without invoking the Chrome or Brave sharing popup. The conversation header can create a new persistent Codex thread with the currently selected model and reasoning and immediately select it. One unsent composer draft is shared across Studio, preview, build, test, and raw development-workspace routes. Codex model and per-model reasoning choices persist locally across panel closure and browser reload. Messages sent during an active turn stack as compact queued transcript cards that can be expanded, edited, or individually promoted with an Interrupt action. Compact lifecycle UI measures the current active turn only and distinguishes working, approval/input waits, queued work, interruption, completion, and failure without fabricated progress. Icon-only control hover states retain neutral, legible foreground and background contrast instead of combining white glyphs with the accent surface.',
  'Persist only the local unsent draft, model identifier, and per-model reasoning preference map; validate model preferences against currently discovered capabilities and clear the shared draft only after accepted delivery. Hide the composer, wait for two animation frames and a bounded compositor-settle interval, and only then request chooser-free current-tab capture. When browser-helper permission is absent, keep the camera enabled and capture through a same-origin private endpoint instead of getDisplayMedia. Accept only localhost or the current Codespaces ports 3000, 5173, and 8788, translate them to loopback server targets, bound viewport and scroll inputs, hide the Codex UI from the captured page, and close every isolated capture page. Reserve getDisplayMedia and its mandatory chooser for the separately labelled another-tab/window action. Create new conversations through app-server thread/start with the selected discovered model, a validated reasoning configuration, the current workspace directory, persistent history, and the existing full-access/no-approval local profile. Expand the validated development iframe only for active region selection, restore compact panel geometry for review, and preserve origin and contentWindow checks. Messages always queue safely during an active turn. A queued card may be edited before delivery, and its Interrupt action must call the app-server turn/interrupt method with the exact active thread and turn and promote that selected record to the front of the queue. Derive elapsed working time only from the active turn startedAt value; when it is unavailable, show Working now instead of reusing an old thread timestamp. Keep icon hover, focus, active, and disabled states neutral and contrast-safe across chat, capture, review, and completion surfaces.',
  'Codex capture preferences test package: adds popup-free workspace capture, new chats, shared drafts, durable model choices, editable queue interruption, accurate active-turn timing, and neutral icon hovers.',
  'foundation_change_required',
  'Makes screenshot feedback and active-turn steering dependable across every Studio workspace while retaining drafts, reviewer configuration, and consistent IDE control styling.',
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
    and existing.summary like 'Codex capture preferences test package:%'
);
