create or replace function public.prospect_logo_deletion_paths(p_asset_id uuid)
returns table (storage_bucket text, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  source_asset public.artifacts%rowtype;
  deletion_ids uuid[];
begin
  select * into source_asset
  from public.artifacts
  where id = p_asset_id
    and kind = 'asset'
    and coalesce(metadata ->> 'assetType', '') = 'logo';

  if not found then
    raise exception 'The organisation logo could not be found.';
  end if;

  if not public.is_organization_member(source_asset.organization_id) then
    raise exception 'You do not have permission to delete this logo.';
  end if;

  select array_agg(id)
  into deletion_ids
  from public.artifacts
  where business_id = source_asset.business_id
    and (
      id = source_asset.id
      or (
        kind = 'asset'
        and metadata ->> 'derivedFromAssetId' = source_asset.id::text
      )
    );

  if exists (
    select 1
    from public.brand_kits
    where business_id = source_asset.business_id
      and status = 'approved'
      and (
        primary_logo_artifact_id = any(deletion_ids)
        or editable_logo_artifact_id = any(deletion_ids)
        or approved_asset_ids && deletion_ids
      )
  ) then
    raise exception 'This logo is part of an approved Brand Kit and is retained as historical evidence.';
  end if;

  return query
  select artifacts.storage_bucket, artifacts.storage_path
  from public.artifacts
  where id = any(deletion_ids);
end;
$$;

create or replace function public.delete_prospect_logo_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_asset public.artifacts%rowtype;
  deletion_ids uuid[];
begin
  select * into source_asset
  from public.artifacts
  where id = p_asset_id
    and kind = 'asset'
    and coalesce(metadata ->> 'assetType', '') = 'logo'
  for update;

  if not found then
    raise exception 'The organisation logo could not be found.';
  end if;

  if not public.is_organization_member(source_asset.organization_id) then
    raise exception 'You do not have permission to delete this logo.';
  end if;

  select array_agg(id)
  into deletion_ids
  from public.artifacts
  where business_id = source_asset.business_id
    and (
      id = source_asset.id
      or (
        kind = 'asset'
        and metadata ->> 'derivedFromAssetId' = source_asset.id::text
      )
    );

  if exists (
    select 1
    from public.brand_kits
    where business_id = source_asset.business_id
      and status = 'approved'
      and (
        primary_logo_artifact_id = any(deletion_ids)
        or editable_logo_artifact_id = any(deletion_ids)
        or approved_asset_ids && deletion_ids
      )
  ) then
    raise exception 'This logo is part of an approved Brand Kit and is retained as historical evidence.';
  end if;

  update public.brand_kits
  set
    primary_logo_artifact_id = case
      when primary_logo_artifact_id = any(deletion_ids) then null
      else primary_logo_artifact_id
    end,
    editable_logo_artifact_id = case
      when editable_logo_artifact_id = any(deletion_ids) then null
      else editable_logo_artifact_id
    end,
    approved_asset_ids = array(
      select asset_id
      from unnest(approved_asset_ids) as asset_id
      where asset_id <> all(deletion_ids)
    )
  where business_id = source_asset.business_id
    and status = 'draft';

  delete from public.artifacts where id = any(deletion_ids);
end;
$$;

create policy "Members can delete their organisation logo files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'siteforge-artifacts'
  and exists (
    select 1
    from public.artifacts
    where artifacts.storage_bucket = storage.objects.bucket_id
      and artifacts.storage_path = storage.objects.name
      and artifacts.kind = 'asset'
      and coalesce(artifacts.metadata ->> 'assetType', '') = 'logo'
      and public.is_organization_member(artifacts.organization_id)
  )
);

revoke all on function public.prospect_logo_deletion_paths(uuid) from public;
grant execute on function public.prospect_logo_deletion_paths(uuid) to authenticated;
