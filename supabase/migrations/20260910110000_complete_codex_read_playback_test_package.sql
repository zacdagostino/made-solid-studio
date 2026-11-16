insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 25.4, 'test_ready', base.id, 'made-solid-studio-builder-agent-v25.4',
  base.foundation_version, base.foundation_checksum,
  'Natural Codex read playback preserves every numbered item, bullet, implementation paragraph, and verification detail from the selected reply. Markdown decoration remains quiet while the substantive visible text is spoken in document order through both private Google audio and device speech fallback.',
  'Do not remove, condense, or replace reply content based on list length or technical keywords. Keep each list item as a separate speech paragraph so chunking, read-along position, restart, and fallback playback retain the complete sequence. Literal mode may continue to announce structural labels, and Natural mode may continue to simplify Markdown syntax and omit fenced source code with an audible notice.',
  'Complete Codex read playback test package: Natural voice playback reads every list item and technical handoff detail in order.',
  'foundation_change_required', 'Prevents read playback from silently dropping substantive reply content while retaining the existing Natural and Literal presentation choices.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.id = (select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v25.3'
  order by candidate.version desc limit 1)
and not exists (select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v25.4');
