create or replace function public.delete_prospect_logo_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  source_asset public.artifacts%rowtype;
  deletion_ids uuid[];
  deletion_paths text[];
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

  select array_agg(id), array_agg(storage_path)
  into deletion_ids, deletion_paths
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

  delete from storage.objects
  where bucket_id = source_asset.storage_bucket
    and name = any(deletion_paths);

  delete from public.artifacts where id = any(deletion_ids);
end;
$$;

revoke all on function public.delete_prospect_logo_asset(uuid) from public;
grant execute on function public.delete_prospect_logo_asset(uuid) to authenticated;
