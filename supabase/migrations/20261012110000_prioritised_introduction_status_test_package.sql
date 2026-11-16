insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.8, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.8', base.foundation_version, base.foundation_checksum,
  'After a first introduction is accepted, Clientspace Admin places the durable sent receipt immediately below the message templates and before the email editor and long website preview. The normal follow-up is the primary action; the protected rehearsal reset remains a quieter testing control with its explanation attached.',
  'Keep the sent time, recipient, subject and waiting-state explanation visible near the top of the email workspace. Do not make the reviewer scroll through the composed email, live website or homepage capture to discover the delivery result. Emphasize Prepare follow-up, visually subordinate Reset test introduction, and never expose rehearsal language for production projects.',
  'Prioritised introduction status test package: moves the sent receipt and test controls above the long email preview and clarifies the next-action hierarchy.',
  'foundation_change_required',
  'Makes the completed outreach state immediately discoverable while keeping routine follow-up distinct from destructive-looking test reset controls.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.7'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.8'
);
