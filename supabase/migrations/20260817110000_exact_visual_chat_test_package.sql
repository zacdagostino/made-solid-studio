insert into public.agent_packages (
  id, organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids,
  created_by, created_at
)
select
  gen_random_uuid(), base.organization_id,
  (select coalesce(max(existing.version), 0) + 0.1
   from public.agent_packages as existing
   where existing.organization_id = base.organization_id),
  'test_ready', base.id, 'made-solid-studio-builder-agent-v13.4',
  base.foundation_version, base.foundation_checksum,
  'Visible logos and other public images are embedded before an authenticated mobile DOM capture, using a bounded same-origin public-image relay only when browser CORS prevents reuse. A visual message returns directly to the existing chat, clears the accepted draft, and renders its screenshot inline while queued and after delivery. Area selection and whole-screenshot delivery are equally available.',
  'Never replace a failed capture image with a placeholder. Await document fonts, retry failed font preparation, inline visible images, restore the live DOM after capture, and fail clearly when an image cannot be represented. Keep the chat open after accepting visual feedback, clear only an accepted draft, show the attachment inside the corresponding queued or delivered user message, and provide a direct whole-screenshot action beside region selection.',
  'Exact visual chat test package: preserves visible branding and fonts in mobile capture, adds whole-screenshot delivery, and keeps sent images inline in chat.',
  'foundation_change_required',
  'Makes screenshot feedback visually faithful and keeps the complete send result visible in the conversation without a disruptive confirmation dialog.',
  '["visual-codex-feedback"]'::jsonb,
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
    and existing.summary like 'Exact visual chat test package:%'
);
