insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, approved_at
)
select
  base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1 from public.agent_packages existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v20.5',
  base.foundation_version, base.foundation_checksum,
  'A reviewer can select text within one Codex assistant reply and use that exact excerpt in a temporary question, append it to the current draft, or send it immediately without losing the existing draft.',
  'Capture selections only inside a single rendered assistant reply. Offer Quick question, Add to prompt, Send now, and Dismiss with keyboard-accessible 44-pixel controls on popup and page chat surfaces. Quote excerpts with a clear Codex attribution and retain any existing composer draft when sending immediately. Run quick questions outside conversation history in a server-created empty temporary directory with no workspace roots, an ephemeral thread, read-only thread and turn sandboxes, bounded inputs, and guaranteed thread and directory cleanup.',
  'Selected Codex excerpt actions test package: restores quick read-only questions, draft quoting, immediate sending, and dismissal across popup and page chat.',
  'foundation_change_required',
  'Lets reviewers act on precise Codex output without copying text manually or granting a temporary question access to Studio or client files.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages base
where base.id = (
  select candidate.id from public.agent_packages candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v20.4'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v20.5'
);
