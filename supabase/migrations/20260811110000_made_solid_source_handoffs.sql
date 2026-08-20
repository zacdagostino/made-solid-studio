create table public.made_solid_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  builder_run_id uuid not null references public.builder_runs on delete cascade,
  requested_by uuid references auth.users on delete set null,
  source_repository_url text not null,
  source_branch text not null,
  source_commit text not null,
  source_edit_version integer not null check (source_edit_version > 0),
  source_manifest_id uuid references public.build_manifests on delete set null,
  source_agent_package_id uuid references public.agent_packages on delete set null,
  client_name text not null,
  contact_name text not null default '',
  client_email text not null default '',
  project_name text not null,
  handoff_notes text not null default '',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'cancelled')),
  progress_phase text not null default 'queued',
  progress_detail text not null default 'Waiting for the protected Made Solid handoff worker.',
  total_items integer not null default 3 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  website_handoff_id text,
  website_admin_url text,
  error_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id, source_commit)
);

create index made_solid_handoffs_queue_idx
  on public.made_solid_handoffs(status, lease_expires_at, created_at);
create index made_solid_handoffs_business_idx
  on public.made_solid_handoffs(business_id, created_at desc);

alter table public.worker_runtime_heartbeats
  drop constraint if exists worker_runtime_heartbeats_worker_kind_check;
alter table public.worker_runtime_heartbeats
  add constraint worker_runtime_heartbeats_worker_kind_check
  check (worker_kind in ('builder', 'github_workspace', 'made_solid_handoff'));

alter table public.made_solid_handoffs enable row level security;
create policy "Members can view Made Solid handoffs"
  on public.made_solid_handoffs for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.request_made_solid_handoff(
  target_builder_run_id uuid,
  target_source_repository_url text,
  target_source_branch text,
  target_source_commit text,
  target_source_edit_version integer,
  target_client_name text,
  target_contact_name text,
  target_client_email text,
  target_project_name text,
  target_handoff_notes text default ''
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
  if target_run.build_mode <> 'full_site' then
    raise exception 'A complete prospect build is required.';
  end if;
  select * into target_publication
  from public.github_workspace_publications
  where builder_run_id = target_run.id and status = 'ready'
  order by completed_at desc nulls last
  limit 1;
  if target_publication.id is null or target_publication.github_repository_url is null then
    raise exception 'The editable source repository must be ready before handoff.';
  end if;
  if trim(target_source_repository_url) <> trim(target_publication.github_repository_url) then
    raise exception 'The handoff repository does not match the verified editable source.';
  end if;
  if trim(target_source_commit) !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A complete Git commit SHA is required.';
  end if;
  if target_source_edit_version < 1 then raise exception 'A valid edit version is required.'; end if;
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
  if existing_handoff.id is not null and existing_handoff.status in ('queued', 'running', 'ready') then
    return next existing_handoff;
    return;
  end if;

  if existing_handoff.id is not null then
    return query update public.made_solid_handoffs
    set client_name = trim(target_client_name),
        contact_name = trim(coalesce(target_contact_name, '')),
        client_email = lower(trim(coalesce(target_client_email, ''))),
        project_name = trim(target_project_name),
        handoff_notes = trim(coalesce(target_handoff_notes, '')),
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
    client_email, project_name, handoff_notes
  ) values (
    target_run.organization_id, target_run.business_id, target_run.id, auth.uid(),
    trim(target_source_repository_url), trim(target_source_branch), lower(trim(target_source_commit)),
    target_source_edit_version, target_run.build_manifest_id, target_run.agent_package_id,
    trim(target_client_name), trim(coalesce(target_contact_name, '')),
    lower(trim(coalesce(target_client_email, ''))), trim(target_project_name),
    trim(coalesce(target_handoff_notes, ''))
  ) returning *;
end;
$$;

create or replace function public.cancel_made_solid_handoff(target_handoff_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_handoff public.made_solid_handoffs;
begin
  select * into target_handoff from public.made_solid_handoffs where id = target_handoff_id;
  if target_handoff.id is null or not public.is_organization_member(target_handoff.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_handoff.status not in ('queued', 'running') then return; end if;
  update public.made_solid_handoffs
  set cancel_requested_at = now(),
      status = case when status = 'queued' then 'cancelled' else status end,
      progress_phase = case when status = 'queued' then 'cancelled' else progress_phase end,
      progress_detail = 'Cancellation requested. The worker will stop at the next safe checkpoint.',
      completed_at = case when status = 'queued' then now() else completed_at end,
      updated_at = now()
  where id = target_handoff.id;
end;
$$;

create or replace function public.claim_next_made_solid_handoff(worker_identity text)
returns setof public.made_solid_handoffs
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  update public.made_solid_handoffs
  set status = 'cancelled', progress_phase = 'cancelled',
      progress_detail = 'The handoff was cancelled after its worker lease ended.',
      completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is not null and lease_expires_at < now();
  update public.made_solid_handoffs
  set status = 'failed', progress_phase = 'failed',
      progress_detail = 'The handoff stopped after three worker attempts.',
      error_summary = 'The Made Solid website connection did not complete after three attempts.',
      completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is null
    and lease_expires_at < now() and attempt_count >= 3;
  return query with candidate as (
    select id from public.made_solid_handoffs
    where (status = 'queued' or (status = 'running' and lease_expires_at < now()))
      and cancel_requested_at is null and attempt_count < 3
    order by created_at for update skip locked limit 1
  ) update public.made_solid_handoffs as handoffs
    set status = 'running', started_at = coalesce(started_at, now()),
        worker_id = trim(worker_identity), lease_expires_at = now() + interval '5 minutes',
        attempt_count = attempt_count + 1, progress_phase = 'preparing',
        progress_detail = 'Preparing the exact committed revision for Made Solid admin.',
        error_summary = null, updated_at = now()
    from candidate where handoffs.id = candidate.id returning handoffs.*;
end;
$$;

revoke all on function public.request_made_solid_handoff(uuid, text, text, text, integer, text, text, text, text, text) from public;
revoke all on function public.cancel_made_solid_handoff(uuid) from public;
revoke all on function public.claim_next_made_solid_handoff(text) from public;
grant execute on function public.request_made_solid_handoff(uuid, text, text, text, integer, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_made_solid_handoff(uuid) to authenticated;
grant execute on function public.claim_next_made_solid_handoff(text) to service_role;

create or replace function public.heartbeat_made_solid_handoff_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  if char_length(trim(worker_identity)) = 0 or char_length(trim(worker_identity)) > 120 then
    raise exception 'A valid worker identity is required.';
  end if;
  insert into public.worker_runtime_heartbeats (worker_kind, worker_id, started_at, heartbeat_at)
  values ('made_solid_handoff', trim(worker_identity), now(), now())
  on conflict (worker_kind) do update
  set worker_id = excluded.worker_id,
      started_at = case
        when worker_runtime_heartbeats.worker_id = excluded.worker_id
          then worker_runtime_heartbeats.started_at
        else now()
      end,
      heartbeat_at = now();
end;
$$;

create or replace function public.release_made_solid_handoff_worker(worker_identity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;
  delete from public.worker_runtime_heartbeats
  where worker_kind = 'made_solid_handoff' and worker_id = trim(worker_identity);
end;
$$;

create or replace function public.made_solid_handoff_worker_available()
returns boolean language plpgsql security definer set search_path = public stable as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  return exists (
    select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'made_solid_handoff'
      and heartbeat_at >= now() - interval '45 seconds'
  );
end;
$$;

create or replace function public.guard_made_solid_handoff_queue_liveness()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'queued' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'queued' then return new; end if;
  if not exists (
    select 1 from public.worker_runtime_heartbeats
    where worker_kind = 'made_solid_handoff'
      and heartbeat_at >= now() - interval '45 seconds'
  ) then
    raise exception using
      message = 'Made Solid handoff is not connected. Configure the protected handoff worker and try again; no transfer was queued.',
      errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_made_solid_handoff_queue_liveness
  on public.made_solid_handoffs;
create trigger guard_made_solid_handoff_queue_liveness
before insert or update of status on public.made_solid_handoffs
for each row execute function public.guard_made_solid_handoff_queue_liveness();

revoke all on function public.heartbeat_made_solid_handoff_worker(text) from public;
revoke all on function public.release_made_solid_handoff_worker(text) from public;
revoke all on function public.made_solid_handoff_worker_available() from public, anon;
grant execute on function public.heartbeat_made_solid_handoff_worker(text) to service_role;
grant execute on function public.release_made_solid_handoff_worker(text) to service_role;
grant execute on function public.made_solid_handoff_worker_available() to authenticated;
