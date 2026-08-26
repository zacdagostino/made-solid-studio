insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  23.3,
  'test_ready', base.id, 'made-solid-studio-builder-agent-v23.3',
  base.foundation_version, base.foundation_checksum,
  'Next.js development may rewrite next-env.d.ts from its committed route-types declaration to the byte-exact development route-types declaration. Studio treats only that deterministic framework-generated rewrite as runtime metadata, excludes it from pending-edit and release-dirty state, and restores the committed declaration after preview startup, preview recovery, or finalisation. Every other next-env.d.ts difference and every real source change remains a pending website edit.',
  'Compare next-env.d.ts with the exact committed file and recognise only the byte-exact Next.js development transformation from ./.next/types/routes.d.ts to ./.next/dev/types/routes.d.ts. Use one shared workspace-state contract for the Editing status, final edit, exact release verification, manual preview launch, and restored preview. Restore that generated transformation to the committed declaration before a checkpoint completes. Never ignore or overwrite any other next-env.d.ts difference, and keep every genuine source change pending.',
  'Generated Next environment hygiene test package: prevents byte-exact Next.js development metadata from appearing as a website edit or blocking exact release verification.',
  'foundation_change_required',
  'Keeps edit versions and release gates tied to intentional website work while preserving every manual environment declaration and genuine source change.',
  '["client-url-release-contract"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v23.2'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v23.3'
);
