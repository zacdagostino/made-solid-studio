-- Generated builds may include a private BUILD_NOTES.md handoff for approved
-- capabilities that need production services. Preserve it alongside the site
-- source instead of rejecting the completed build at the storage boundary.
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime_type)
  from unnest(
    coalesce(allowed_mime_types, '{}') || array['text/markdown']
  ) as mime_type
)
where id = 'siteforge-artifacts';
