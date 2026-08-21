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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.4',
  base.foundation_version, base.foundation_checksum,
  'A ready image attachment is sufficient content for a Studio Codex message. The composer enables Send and submits the image in selection order even when the text field is empty. Pending attachment previews remain scoped to their originating conversation while delivery is reconciled.',
  'Treat trimmed message text or at least one ready image attachment as valid composer content. Keep Send disabled only when both are absent, and preserve the existing model capability, preparation, conversation-transition, and delivery guards. Submit an empty prompt with the ready screenshots when no text was entered. Record the originating thread on every optimistic message and render or reconcile it only against that exact thread.',
  'Image-only Codex message test package: sends uploaded visual context without typed text and keeps its preview in the originating conversation.',
  'foundation_change_required',
  'Lets reviewers use a screenshot or photo as the complete Codex request when the visual itself contains the needed context.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.3'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.4'
);
