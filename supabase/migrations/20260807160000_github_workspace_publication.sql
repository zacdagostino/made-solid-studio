create table public.github_workspace_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  builder_run_id uuid not null references public.builder_runs on delete cascade unique,
  requested_by uuid references auth.users on delete set null,
  repository_owner text not null,
  repository_name text not null,
  repository_description text not null default '',
  visibility text not null default 'private' check (visibility = 'private'),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'cancelled')),
  progress_phase text not null default 'queued',
  progress_detail text,
  total_items integer not null default 0 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  github_repository_id bigint,
  github_repository_url text,
  github_clone_url text,
  github_full_name text,
  github_default_branch text,
  error_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index github_workspace_publications_queue_idx
  on public.github_workspace_publications(status, lease_expires_at, created_at);
create index github_workspace_publications_business_idx
  on public.github_workspace_publications(business_id, created_at desc);

alter table public.github_workspace_publications enable row level security;
create policy "Members can view GitHub workspace publications"
  on public.github_workspace_publications for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.request_github_workspace_publication(
  target_builder_run_id uuid,
  target_repository_owner text,
  target_repository_name text,
  target_repository_description text default ''
)
returns setof public.github_workspace_publications
language plpgsql
security definer
set search_path = public
as $$
declare
  target_run public.builder_runs;
  existing_publication public.github_workspace_publications;
  normalized_owner text := trim(coalesce(target_repository_owner, ''));
  normalized_name text := trim(coalesce(target_repository_name, ''));
begin
  select * into target_run from public.builder_runs where id = target_builder_run_id;
  if target_run.id is null or not public.is_organization_member(target_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_run.build_mode <> 'full_site' or target_run.status not in ('ready', 'review_required') then
    raise exception 'A completed full-site build is required.';
  end if;
  if not exists (
    select 1 from public.builder_artifacts
    where builder_run_id = target_run.id
      and (
        kind = 'source_bundle'
        or (kind = 'draft_file' and coalesce(metadata->>'state', '') = 'final_source')
      )
  ) then
    raise exception 'The editable website source is unavailable.';
  end if;
  if normalized_owner !~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$' then
    raise exception 'Enter a valid GitHub account or organization name.';
  end if;
  if char_length(normalized_name) > 100 or normalized_name !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'Enter a valid GitHub repository name.';
  end if;
  if char_length(coalesce(target_repository_description, '')) > 350 then
    raise exception 'The GitHub repository description is too long.';
  end if;

  select * into existing_publication
  from public.github_workspace_publications
  where builder_run_id = target_run.id
  for update;

  if existing_publication.id is not null
    and existing_publication.status in ('queued', 'running', 'ready') then
    return next existing_publication;
    return;
  end if;

  if existing_publication.id is not null then
    return query
    update public.github_workspace_publications
    set repository_owner = normalized_owner,
        repository_name = normalized_name,
        repository_description = trim(coalesce(target_repository_description, '')),
        status = 'queued',
        progress_phase = 'queued',
        progress_detail = 'Waiting for the protected GitHub publishing worker.',
        total_items = 0,
        completed_items = 0,
        cancel_requested_at = null,
        worker_id = null,
        lease_expires_at = null,
        github_repository_id = null,
        github_repository_url = null,
        github_clone_url = null,
        github_full_name = null,
        github_default_branch = null,
        error_summary = null,
        started_at = null,
        completed_at = null,
        updated_at = now()
    where id = existing_publication.id
    returning *;
    return;
  end if;

  return query
  insert into public.github_workspace_publications (
    organization_id,
    business_id,
    builder_run_id,
    requested_by,
    repository_owner,
    repository_name,
    repository_description,
    progress_detail
  ) values (
    target_run.organization_id,
    target_run.business_id,
    target_run.id,
    auth.uid(),
    normalized_owner,
    normalized_name,
    trim(coalesce(target_repository_description, '')),
    'Waiting for the protected GitHub publishing worker.'
  ) returning *;
end;
$$;

create or replace function public.cancel_github_workspace_publication(target_publication_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_publication public.github_workspace_publications;
begin
  select * into target_publication
  from public.github_workspace_publications
  where id = target_publication_id;
  if target_publication.id is null
    or not public.is_organization_member(target_publication.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_publication.status not in ('queued', 'running') then return; end if;

  update public.github_workspace_publications
  set cancel_requested_at = now(),
      status = case when status = 'queued' then 'cancelled' else status end,
      progress_phase = case when status = 'queued' then 'cancelled' else progress_phase end,
      progress_detail = 'Cancellation requested. The worker will stop at the next safe checkpoint.',
      completed_at = case when status = 'queued' then now() else completed_at end,
      updated_at = now()
  where id = target_publication.id;
end;
$$;

create or replace function public.claim_next_github_workspace_publication(worker_identity text)
returns setof public.github_workspace_publications
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;

  update public.github_workspace_publications
  set status = 'cancelled',
      progress_phase = 'cancelled',
      progress_detail = 'The GitHub publication was cancelled after its worker lease ended.',
      completed_at = now(),
      worker_id = null,
      lease_expires_at = null,
      updated_at = now()
  where status = 'running'
    and cancel_requested_at is not null
    and lease_expires_at < now();

  update public.github_workspace_publications
  set status = 'failed',
      progress_phase = 'failed',
      progress_detail = 'The GitHub publication stopped after three worker attempts.',
      error_summary = 'The protected worker did not complete after three attempts.',
      completed_at = now(),
      worker_id = null,
      lease_expires_at = null,
      updated_at = now()
  where status = 'running'
    and cancel_requested_at is null
    and lease_expires_at < now()
    and attempt_count >= 3;

  return query
  with candidate as (
    select id
    from public.github_workspace_publications
    where (status = 'queued' or (status = 'running' and lease_expires_at < now()))
      and cancel_requested_at is null
      and attempt_count < 3
    order by created_at
    for update skip locked
    limit 1
  )
  update public.github_workspace_publications as publications
  set status = 'running',
      started_at = coalesce(started_at, now()),
      worker_id = trim(worker_identity),
      lease_expires_at = now() + interval '15 minutes',
      attempt_count = attempt_count + 1,
      progress_phase = 'loading_workspace',
      progress_detail = 'Loading the editable source and approved assets.',
      error_summary = null,
      updated_at = now()
  from candidate
  where publications.id = candidate.id
  returning publications.*;
end;
$$;

revoke all on function public.request_github_workspace_publication(uuid, text, text, text) from public;
revoke all on function public.cancel_github_workspace_publication(uuid) from public;
revoke all on function public.claim_next_github_workspace_publication(text) from public;
grant execute on function public.request_github_workspace_publication(uuid, text, text, text) to authenticated;
grant execute on function public.cancel_github_workspace_publication(uuid) to authenticated;
grant execute on function public.claim_next_github_workspace_publication(text) to service_role;
