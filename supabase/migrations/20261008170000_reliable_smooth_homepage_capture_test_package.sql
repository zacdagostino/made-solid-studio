insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.3', base.foundation_version, base.foundation_checksum,
  'The smooth first-email homepage GIF must finish inside the protected Clientspace capture lifecycle. The capture worker starts with an email-sized high-frame-rate profile, uses bounded page-settling waits and the fastest GIF encoding effort, while retaining the loading reveal, slow one-way scroll, exact-bottom hold and fade reset.',
  'Keep raw frames capped at 64 MB and the finished email GIF below 1.9 MB. Begin with the 420-pixel 24-colour profile instead of repeatedly encoding larger files that cannot fit the email budget, bound network-idle and visible-media waits, use the fastest CPU-effort palette pass, and allow the protected receiver up to 120 seconds so it can persist the finished animation instead of leaving the earlier capture in place.',
  'Reliable smooth homepage capture test package: finishes and persists the new loading-to-bottom fade loop within the protected capture window.',
  'foundation_change_required',
  'Prevents a receiver timeout from silently leaving the old laggy GIF visible after the smooth animation runtime has been deployed.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.3'
);
