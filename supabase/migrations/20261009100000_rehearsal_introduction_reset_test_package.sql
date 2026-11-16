insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.6, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.6', base.foundation_version, base.foundation_checksum,
  'After a first-introduction email is accepted, Clientspace Admin shows a persistent sent receipt and waiting state instead of leaving an active duplicate-send control. A rehearsal-only reset preserves send history, advances the Clientspace welcome version and returns only the test invitation to pending.',
  'Keep accepted outreach records immutable. Show recipient, subject and sent time, state that no follow-up sends automatically, and allow a deliberate follow-up draft. Expose Reset test introduction only when the selected project is a verified rehearsal. The protected reset must clear the rehearsal invitation timestamp, restore pending invitation status, increment the welcome version and never affect a production client.',
  'Rehearsal introduction reset test package: adds a truthful post-send UI and safely replays the test client welcome before another introduction email.',
  'foundation_change_required',
  'Makes repeated end-to-end introduction testing possible without weakening production outreach safeguards or deleting the audit trail.',
  '["client-introduction-outreach"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.5'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.6'
);
