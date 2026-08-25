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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.6',
  base.foundation_version, base.foundation_checksum,
  'The authenticated Studio owner can explicitly subscribe each supported phone to private Web Push notifications when a Studio-submitted Codex supervisor turn completes successfully.',
  'Offer phone notifications as a device-specific opt-in in Settings. On iPhone and iPad, explain that Studio must first be installed to the Home Screen. Persist subscriptions and an idempotent completion marker on the private runtime, send only after the exact tracked supervisor turn reaches completed, and never describe interrupted, cancelled, or failed work as finished. Keep lock-screen text generic, use a same-origin Codex route, remove expired subscriptions, retry durable pending delivery, and never cache private Studio data in the push-only service worker.',
  'Codex phone notifications test package: sends private, generic Web Push alerts after successful Studio chat completion.',
  'foundation_change_required',
  'Adds explicit per-phone completion alerts without exposing prospect or transcript content or depending on an open Studio tab.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.6'
);
