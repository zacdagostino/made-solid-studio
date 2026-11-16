insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 32.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v32.4', base.foundation_version, base.foundation_checksum,
  'The first-email homepage GIF records the real loading introduction and live scroll-triggered website motion instead of animating crops from a frozen full-page screenshot. A media warm-up pass loads lazy company logos and other imagery before the clean loading sequence is replayed.',
  'Capture the verified homepage with normal motion at 100 millisecond intervals. Warm lazy media by traversing the page, reload to replay the authentic brand introduction, eagerly settle image assets, then record a linear downward browser scroll so viewport animations appear. Keep compressed source frames and the raw encoded stack bounded, preserve the exact-bottom hold and fade reset, and keep the finished GIF below 1.9 MB.',
  'Live animated homepage capture test package: records the loading animation, scroll-triggered motion and fully loaded company imagery in the saved email GIF.',
  'foundation_change_required',
  'Makes the email preview faithful to the real website experience without dropping lazy assets or exceeding the protected capture budget.',
  '["client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v32.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v32.4'
);
