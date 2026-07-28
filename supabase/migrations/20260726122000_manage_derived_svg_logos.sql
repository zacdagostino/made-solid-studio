create policy "Members can update derived editable logo SVGs"
on storage.objects for update to authenticated
using (
  bucket_id = 'siteforge-artifacts'
  and name like '%/derived/editable-logo-%.svg'
  and public.is_organization_member(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'siteforge-artifacts'
  and name like '%/derived/editable-logo-%.svg'
  and public.is_organization_member(split_part(name, '/', 1)::uuid)
);

create policy "Members can delete derived logo SVGs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'siteforge-artifacts'
  and (name like '%/derived/editable-logo-%.svg' or name like '%/derived/vector-suggestion-%.svg')
  and public.is_organization_member(split_part(name, '/', 1)::uuid)
);
