insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.2', base.foundation_version, base.foundation_checksum,
  'Agent Studio tests and complete website builds run one bounded automatic Codex repair pass when the first automated quality suite does not pass, then compile and execute the complete suite again. The first results remain immutable repair input, and an unsuccessful repair preserves the original private preview and evidence.',
  'Repair only the exact recorded quality findings within the existing manifest, factual, asset, route, file-scope, and locked-foundation boundaries. Do not suppress checks, remove required content, add dependencies, broaden claims, or redesign unrelated work. Run at most one automatic pass; if findings remain or repair cannot finish, keep the build private and surface the original and final evidence with a focused human next action.',
  'Automatic builder quality repair test package: fixes recorded Agent Studio and full-site quality failures once, then reruns the complete suite.',
  'foundation_change_required',
  'Reduces manual repair loops while keeping bounded cost, immutable evidence, safe fallback source, and honest review-required outcomes.',
  '["visual-codex-feedback", "framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.2'
);
