insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 27.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v27.6', base.foundation_version, base.foundation_checksum,
  'A verified source handoff may assign only its dedicated preview.<project>.madesolid.com.au hostname to the exact immutable Vercel preview deployment. The branded preview remains separate from the project live hostname and production release.',
  'Register the branded preview as a project custom domain, pin its alias to the exact source-commit deployment, verify the alias resolves to that deployment, and prove it is publicly reachable without a provider login before saving it to Clientspace. Fail closed instead of exposing a Vercel URL or moving the live client domain.',
  'Branded exact client preview test package: gives client review emails a Made Solid preview hostname pinned to the verified website version.',
  'foundation_change_required',
  'Keeps Vercel deployment addresses internal while preserving exact-version review and a separate, deliberate live launch.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v27.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v27.6'
);
