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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.8',
  base.foundation_version, base.foundation_checksum,
  'The Studio Codex transcript follows incremental output only while the reviewer remains at its latest edge. A manual upward scroll disables following across idle polling and active output updates until the reviewer activates the visible Back to latest control or returns to the bottom.',
  'Derive transcript-follow state from the real scroll position. Never force scrollTop during status polling or message rendering after the reviewer has moved away from the latest edge. Keep new messages live-announced, expose a keyboard-accessible Back to latest action, and reset following deliberately when opening or switching conversations.',
  'Codex transcript position test package: preserves manual chat reading position and provides an explicit return-to-latest control.',
  'foundation_change_required',
  'Lets reviewers read earlier Codex messages without idle refreshes or active output pulling the transcript away from them.',
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
    and existing.summary like 'Codex transcript position test package:%'
);
