insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.0',
  base.foundation_version, base.foundation_checksum,
  'Studio source edits apply without restarting the reviewer workspace. The Codex bridge reloads independently from the Vite configuration lifecycle, and ordinary hot updates announce a brief accessible top status while the active route and rendered workspace remain mounted.',
  'Keep the frequently edited Codex feedback bridge outside the Vite config dependency graph and reload its runtime module by source modification time without interrupting active maintenance or delivery. Preserve transient started-thread state when replacing the bridge instance. Announce ordinary Vite hot updates through the existing Studio top synchronization status, keep the current route and content mounted, and provide a static prefers-reduced-motion presentation.',
  'Seamless Studio hydration test package: applies Studio source edits in place behind an accessible top loading notice without restarting the reviewer workspace.',
  'foundation_change_required',
  'Keeps Codex-driven Studio refinement usable during live source edits by separating bridge updates from the application server and making brief UI hydration visible without a disruptive reload.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v17.9'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.0'
);
