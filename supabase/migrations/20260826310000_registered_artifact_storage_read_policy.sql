-- Audit screenshots and other registered artifacts do not all use an organisation-prefixed
-- storage path. Authorise them by their immutable artifact record instead of inferring ownership
-- from the first path segment.

create policy "Organization members can read registered artifacts"
on storage.objects for select to authenticated
using (
  bucket_id = 'siteforge-artifacts'
  and exists (
    select 1
    from public.artifacts artifacts
    join public.organization_members members
      on members.organization_id = artifacts.organization_id
    where members.user_id = auth.uid()
      and artifacts.storage_bucket = storage.objects.bucket_id
      and artifacts.storage_path = storage.objects.name
  )
);
