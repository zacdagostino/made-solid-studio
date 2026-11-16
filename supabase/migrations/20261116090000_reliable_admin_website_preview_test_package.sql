insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 36.0, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v36.0', base.foundation_version, base.foundation_checksum,
  'Verified private website previews permit embedding by the explicitly configured Clientspace origin as well as the existing Studio and Inspect origins. Expiring capabilities, draft restrictions and all other preview protections remain enforced.',
  'Keep the Admin email website preview project-scoped, show loading and delayed-load feedback, and offer a keyboard-accessible retry and the existing external website review. Never treat the iframe load event as proof of cross-origin rendering or allow arbitrary framing origins.',
  'Reliable admin website preview test package: fixes Clientspace framing permissions for private previews and adds loading feedback and retry to the email website preview.',
  'foundation_change_required',
  'Prevents supported private previews from being silently blocked in Clientspace Admin and lets staff recover from a delayed or blank embedded website.',
  '["client-introduction-outreach"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v35.9'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v36.0'
);
