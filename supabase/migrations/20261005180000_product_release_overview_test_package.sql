insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 30.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v30.8', base.foundation_version, base.foundation_checksum,
  'Feature Releases provides one owner-facing release overview with separate Made Solid Studio, public website, Clientspace and Clientspace admin surfaces. Each surface compares development with production, counts pending product features and lists the recorded revisions that determine its status. Internal research and documentation remain visible without inflating product release counts.',
  'Classify changed paths into product surfaces while preserving their owning repository and exact source lineage. Treat a verified deployment as current only when it still matches the recorded committed revision; when newer local or committed work exists, label the deployment as an earlier live revision. Keep each product summary expandable, keyboard accessible and usable in the compact Codex panel from phone through desktop.',
  'Product release overview test package: shows what is current or pending across Studio, website, Clientspace and Clientspace admin.',
  'foundation_change_required',
  'Turns the feature ledger into a clear cross-product release dashboard without losing revision-level evidence.',
  '["visual-codex-feedback"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v30.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v30.8'
);
