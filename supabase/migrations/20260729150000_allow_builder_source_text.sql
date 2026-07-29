-- Next.js private builds persist TypeScript and TSX working source as durable
-- draft artifacts. The worker intentionally labels those source files as plain
-- text, so the protected bucket must accept that MIME type.
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime_type)
  from unnest(
    coalesce(allowed_mime_types, '{}') || array['text/plain']
  ) as mime_type
)
where id = 'siteforge-artifacts';
