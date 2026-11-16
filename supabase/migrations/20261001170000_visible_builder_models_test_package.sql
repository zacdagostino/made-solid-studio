insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.6', base.foundation_version, base.foundation_checksum,
  'Agent Studio and full website workflows show the effective Codex model before a build starts and retain the immutable model snapshot beside every saved generated website. Agent Studio separates primary website creation from optional package refinement.',
  'Keep the planned model summary above each build setup. Show the recorded model and reasoning level on every completed or stopped website entry, never substituting current preferences for historical run data. Group the primary Agent Studio creation flow separately from collapsed advanced package capabilities and directions.',
  'Visible builder models test package: surfaces the planned and recorded Codex model throughout cleaner, grouped website creation workflows.',
  'foundation_change_required',
  'Makes model choice verifiable before building and preserves that execution fact while reducing Agent Studio setup clutter.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.6'
);
