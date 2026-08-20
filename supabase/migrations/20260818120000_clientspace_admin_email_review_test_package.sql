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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v15.3',
  base.foundation_version, base.foundation_checksum,
  'The context-aware inbound email review capability is available in both the Studio prospect workspace and the selected project''s Clientspace Admin Emails section. Clientspace keeps its reply inbox separate from the existing outbound composer and grounds every review-only draft in current project, commercial, release, message, document, and assistant state.',
  'Default Clientspace Admin Emails to Inbox and replies while preserving Compose outbound as a separate view. Isolate dummy messages and drafts per project, persist the selected admin section in the URL, show the exact project context boundary, reset review after direct or prompted edits, and never route a test inbox reply through outbound delivery.',
  'Clientspace Admin email review test package: extends contextual inbound replies into each admin client Email workspace without changing outbound delivery.',
  'foundation_change_required',
  'Gives Made Solid staff the same human-controlled reply review workflow at the client-administration stage with richer project and commercial context.',
  '["inbound-client-email-review"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.summary like 'Clientspace Admin email review test package:%'
);
