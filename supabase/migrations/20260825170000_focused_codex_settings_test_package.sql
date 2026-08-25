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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v21.1',
  base.foundation_version, base.foundation_checksum,
  'Studio Codex chat separates request-level run setup from persistent usage, billing, speed, and read-aloud preferences so the compact composer no longer presents unrelated settings in one scrolling menu.',
  'Keep Model, Reasoning, and Agent team together behind the compact Run setup control beside the composer. Put subscription usage, API-credit billing, Fast service tier, and read-aloud preferences behind a distinct Chat settings cog with a labelled dialog, explicit close control, Escape dismissal, focus restoration, 44-pixel controls, and overflow-free mobile presentation.',
  'Focused Codex settings test package: separates per-request model and Agent team controls from persistent usage, billing, speed, and voice preferences.',
  'foundation_change_required',
  'Makes the Codex composer easier to scan while retaining every existing run, billing, usage, and listening control in a clearer hierarchy.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v21.0'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v21.1'
);
