insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v12.5',
  base.foundation_version, base.foundation_checksum,
  'Local Studio build, test, private-preview, and editing surfaces expose one visual-feedback control that captures a deliberately selected screen region, reviews the exact image and prompt, and queues both to the active local Codex thread without exposing the app-server publicly.',
  'Discover available Codex models and reasoning levels from app-server instead of hard-coding the picker. Store screenshots in a private ignored workspace directory, validate image and prompt limits, preserve queued feedback while Codex is busy, and never simulate terminal keystrokes or interrupt an active turn.',
  'Visual Codex feedback test package: sends reviewed screenshot regions and prompts from Studio to the shared tmux conversation with live model selection.',
  'foundation_change_required',
  'Adds a local rich-client bridge so visual website refinements can enter the real Codex thread with their exact image evidence and chosen model.',
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
    and existing.summary like 'Visual Codex feedback test package:%'
);
