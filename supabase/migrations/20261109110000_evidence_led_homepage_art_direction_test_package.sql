insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 35.2, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v35.2', base.foundation_version, base.foundation_checksum,
  'Homepage art direction starts from an explicit evidence-grounded company context and a recorded hero decision. Hero media is optional: it must be reviewed photography or a verified dossier-content component, while logo-only builds use a deliberate typographic or information-led composition without decorative fallback media.',
  'Read the complete staged homepage dossier before choosing typography or composition. Record what the organisation does, its audience, supported differentiators, primary visitor action, cited source evidence, hero concept, composition, media mode, and avoided generic formula in DESIGN_DECISIONS.json. Do not repeat the dark split, eyebrow, oversized serif-and-italic heading, CTA, and decorative media-panel formula without specific brand or content evidence. Omit hero media when no approved photograph or verified content component supports it; do not add effects or motion to satisfy a quota.',
  'Evidence-led homepage art direction test package: grounds every hero in company context, makes photography availability explicit, and rejects decorative fallback media and unsubstantiated generic hero formulas.',
  'foundation_change_required',
  'Adds deterministic company-context and hero-media quality checks while removing composition quotas that caused unrelated homepage tests to converge.',
  '["next-component-architecture","motion-runtime","framework-quality-gates"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.1'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v35.2'
);
