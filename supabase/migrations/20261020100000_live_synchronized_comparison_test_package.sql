insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 34.4, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v34.4', base.foundation_version, base.foundation_checksum,
  'The signed before-and-after review renders the current public website and redesign as live sandboxed pages at exact phone, tablet and desktop widths. Both pages remain at the top while entrance animations finish, then travel down their full captured heights on one slow synchronized track. Wheel, vertical touch, or keyboard scrolling stops autoplay immediately. The centered reveal handle demonstrates horizontal dragging with a restrained reduced-motion-safe hint.',
  'Persist each captured page height with its device evidence and require that height before issuing the review. Expose the verified current public URL only through the signed review configuration, allow only its exact origin in Inspect frame-src, and keep forms and direct page interaction blocked in Compare mode. Map one normalized scroll progress to each live page''s own full height so different page lengths reach their bottoms together without cropping. Preserve interactive redesign Preview mode separately.',
  'Live synchronized comparison test package: replaces cropped screenshots with live pages, a centered animated reveal handle and user-cancellable slow scrolling.',
  'foundation_change_required',
  'Makes the comparison feel like the real websites while retaining exact device geometry, bounded signed access, safe sandboxing and accessible manual control.',
  '["client-introduction-outreach","client-url-release-contract"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v34.3'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v34.4'
);
