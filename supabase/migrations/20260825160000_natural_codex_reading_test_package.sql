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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.0',
  base.foundation_version, base.foundation_checksum,
  'Studio Codex read aloud interprets rightward arrow glyphs as a useful spoken transition. Natural reading keeps verification introductions audible while omitting only their long technical result lists; Literal reading preserves every listed item.',
  'Convert common rightward arrow glyphs to the spoken transition “then” before either Natural or Literal synthesis. In Natural mode only, omit a Markdown list when nearby text identifies it as verification, checks, tests, lint, typecheck, build, audit, quality-gate, command, or diagnostic output and the list contains at least four items or 320 characters. Keep the preceding introduction and all later prose. Continue reading ordinary lists, short check lists, and every list in Literal mode.',
  'Natural Codex reading test package: speaks right arrows meaningfully and skips long technical verification lists without hiding them in chat.',
  'foundation_change_required',
  'Makes long Codex replies easier to follow by voice while preserving complete visible detail and an explicit Literal option.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.0'
);
