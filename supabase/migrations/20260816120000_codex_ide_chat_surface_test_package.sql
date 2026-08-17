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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.8',
  base.foundation_version, base.foundation_checksum,
  'The compact local Codex client follows an IDE chat hierarchy with a quiet conversation header, a primary scrolling transcript, and one bordered composer that groups message input, screenshot attachments, model and reasoning controls, and send state without obscuring the Studio workspace. Observable active-thread and queue state appears in the transcript with a live elapsed timer and no fabricated progress percentage. When closed, the launcher shows real working state and changes to an unseen-completion bell only after an observed active turn finishes. Saved previews retain the panel in the Studio shell, and generated development workspaces mount the same Studio-hosted panel above their raw website server through a validated, development-only frame.',
  'Preserve Made Solid tokens, shared controls, keyboard operation, visible focus, accessible names, and responsive reflow while using the established Codex IDE interaction hierarchy. Do not copy proprietary extension assets or source. Keep the transcript readable and the composer available at compact mobile, tablet, and desktop viewports. Accepted text chat clears the composer and appears inline as a queued transcript entry; do not interrupt chat with a second confirmation dialog. Stage the development-only workspace panel in the locked Next foundation, validate postMessage source and origin, and expose the Studio origin only through the local launch environment so production exports render no control.',
  'Codex IDE chat-surface test package: keeps the same local client available in Studio previews and directly on raw prospect development websites.',
  'foundation_change_required',
  'Aligns the Studio chat with the familiar Codex IDE workflow while retaining the local bridge, history, model selection, and visual evidence controls.',
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
    and existing.summary like 'Codex IDE chat-surface test package:%'
);
