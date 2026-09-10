create or replace function public.request_made_solid_handoff_v3(
  target_builder_run_id uuid,
  target_source_repository_url text,
  target_source_branch text,
  target_source_commit text,
  target_source_edit_version integer,
  target_client_name text,
  target_contact_name text,
  target_client_email text,
  target_project_name text,
  target_handoff_notes text,
  target_pricing_snapshot jsonb
)
returns setof public.made_solid_handoffs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_run public.builder_runs;
  target_publication public.github_workspace_publications;
  existing_handoff public.made_solid_handoffs;
begin
  select * into target_run from public.builder_runs where id = target_builder_run_id;
  if target_run.id is null or not public.is_organization_member(target_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_run.build_mode <> 'full_site' then raise exception 'A complete prospect build is required.'; end if;
  select * into target_publication from public.github_workspace_publications
  where builder_run_id = target_run.id and status = 'ready'
  order by completed_at desc nulls last limit 1;
  if target_publication.id is null or target_publication.github_repository_url is null then
    raise exception 'The editable source repository must be ready before handoff.';
  end if;
  if trim(target_source_repository_url) <> trim(target_publication.github_repository_url) then
    raise exception 'The handoff repository does not match the verified editable source.';
  end if;
  if trim(target_source_commit) !~ '^[A-Fa-f0-9]{40}$' then raise exception 'A complete Git commit SHA is required.'; end if;
  if target_source_edit_version < 1 then raise exception 'A valid edit version is required.'; end if;
  if target_pricing_snapshot is null
     or coalesce(target_pricing_snapshot->>'status', '') <> 'approved'
     or coalesce(target_pricing_snapshot->>'sourceManifestId', '') <> target_run.build_manifest_id::text then
    raise exception 'An approved quote for the exact Build Manifest is required.';
  end if;
  if target_pricing_snapshot->'sourceScope'->>'source' is distinct from 'committed_source'
    or target_pricing_snapshot->'sourceScope'->>'sourceCommit' is distinct from lower(trim(target_source_commit))
    or target_pricing_snapshot->'sourceScope'->>'sourceEditVersion' is distinct from target_source_edit_version::text
    or (target_pricing_snapshot->>'validUntil')::timestamptz <= now() then
    raise exception 'Approve a current quote for this exact committed website.';
  end if;
  if char_length(trim(target_client_name)) = 0 or char_length(trim(target_project_name)) = 0 then
    raise exception 'Client and project names are required.';
  end if;
  if trim(coalesce(target_client_email, '')) <> '' and
     trim(target_client_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid client email or leave it blank for later confirmation.';
  end if;

  select * into existing_handoff from public.made_solid_handoffs
  where business_id = target_run.business_id and source_commit = lower(trim(target_source_commit))
  for update;
  if existing_handoff.id is not null and (existing_handoff.status in ('queued', 'running') or (existing_handoff.status = 'ready' and existing_handoff.pricing_snapshot = target_pricing_snapshot and existing_handoff.client_name = trim(target_client_name) and existing_handoff.contact_name = trim(coalesce(target_contact_name, '')) and existing_handoff.client_email = lower(trim(coalesce(target_client_email, ''))) and existing_handoff.project_name = trim(target_project_name) and existing_handoff.handoff_notes = trim(coalesce(target_handoff_notes, '')))) then
    return next existing_handoff;
    return;
  end if;
  if existing_handoff.id is not null then
    return query update public.made_solid_handoffs
    set client_name = trim(target_client_name), contact_name = trim(coalesce(target_contact_name, '')),
        client_email = lower(trim(coalesce(target_client_email, ''))),
        project_name = trim(target_project_name), handoff_notes = trim(coalesce(target_handoff_notes, '')),
        pricing_snapshot = target_pricing_snapshot,
        status = 'queued', progress_phase = 'queued',
        progress_detail = 'Waiting for the protected Made Solid handoff worker.',
        completed_items = 0, cancel_requested_at = null, worker_id = null,
        lease_expires_at = null, website_handoff_id = null, website_admin_url = null,
        error_summary = null, completed_at = null, updated_at = now()
    where id = existing_handoff.id returning *;
    return;
  end if;

  return query insert into public.made_solid_handoffs (
    organization_id, business_id, builder_run_id, requested_by,
    source_repository_url, source_branch, source_commit, source_edit_version,
    source_manifest_id, source_agent_package_id, client_name, contact_name,
    client_email, project_name, handoff_notes, pricing_snapshot
  ) values (
    target_run.organization_id, target_run.business_id, target_run.id, auth.uid(),
    trim(target_source_repository_url), trim(target_source_branch), lower(trim(target_source_commit)),
    target_source_edit_version, target_run.build_manifest_id, target_run.agent_package_id,
    trim(target_client_name), trim(coalesce(target_contact_name, '')),
    lower(trim(coalesce(target_client_email, ''))), trim(target_project_name),
    trim(coalesce(target_handoff_notes, '')), target_pricing_snapshot
  ) returning *;
end;
$$;


revoke all on function public.request_made_solid_handoff_v3(uuid, text, text, text, integer, text, text, text, text, text, jsonb) from public;
grant execute on function public.request_made_solid_handoff_v3(uuid, text, text, text, integer, text, text, text, text, text, jsonb) to authenticated;
