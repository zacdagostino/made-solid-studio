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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v17.7',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex chat settings show the reviewer''s current subscription quota usage directly from the signed-in Codex App Server account. Each available quota window remains separate and includes its verified usage percentage, duration, and reset time; unavailable usage never interrupts chat or produces an estimated value.',
  'Read subscription quota from account/rateLimits/read and select the overall codex bucket rather than an arbitrary model-specific bucket. Validate and bound only the public usedPercent, windowDurationMins, and resetsAt fields. Render each primary or secondary window with an accessible progress meter and explicit reset detail in Chat settings. If the rate-limit read is unsupported or fails, keep chat operational and show a truthful unavailable state. Never derive subscription quota from conversation tokens or credit balances.',
  'Codex subscription usage test package: shows live quota percentages and reset windows in chat settings without estimating usage.',
  'foundation_change_required',
  'Gives reviewers a trustworthy view of their current Codex allowance at the point where they choose models, reasoning, Fast mode, and Agent teams.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.6'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v17.7'
);
