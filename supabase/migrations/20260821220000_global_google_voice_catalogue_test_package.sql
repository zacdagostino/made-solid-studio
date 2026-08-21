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
  'test_ready', base.id, 'made-solid-studio-builder-agent-v18.6',
  base.foundation_version, base.foundation_checksum,
  'Codex read-aloud settings expose the complete current Google Cloud Text-to-Speech voice catalogue rather than one locale. Reviewers filter by language and model, see plain quality and cost-position labels, preview a voice, and retain the exact selected voice for later replies.',
  'Fetch the authenticated Google voices:list catalogue server-side, cache it briefly, and return only sanitized voice metadata. Derive synthesis language from the selected allow-listed catalogue entry; never trust a client-supplied model or language. Present language, model quality, and voice as progressive filters, recommend Chirp 3 HD for natural chat reading, label specialist, legacy, preview, and lower-cost tiers without implying that price alone guarantees quality, and keep voice preview and device fallback behavior accessible.',
  'Global Google voice catalogue test package: adds every available language and voice with previewable, clearly labelled model-quality tiers.',
  'foundation_change_required',
  'Lets the reviewer compare Google voices worldwide and understand which models favor natural quality, narration, or lower cost before saving a choice.',
  '["visual-codex-feedback"]'::jsonb,
  base.created_by, now()
from public.agent_packages as base
where base.id = (
  select candidate.id from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.builder_contract_version = 'made-solid-studio-builder-agent-v18.5'
  order by candidate.version desc limit 1
)
and not exists (
  select 1 from public.agent_packages as existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v18.6'
);
