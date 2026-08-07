alter table public.worker_runtime_heartbeats
  drop constraint if exists worker_runtime_heartbeats_worker_kind_check;
alter table public.worker_runtime_heartbeats
  add constraint worker_runtime_heartbeats_worker_kind_check
  check (worker_kind in ('builder', 'github_workspace'));

create or replace function public.heartbeat_github_workspace_worker(worker_identity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;
  if char_length(trim(worker_identity)) = 0 or char_length(trim(worker_identity)) > 120 then
    raise exception 'A valid worker identity is required.';
  end if;

  insert into public.worker_runtime_heartbeats (worker_kind, worker_id, started_at, heartbeat_at)
  values ('github_workspace', trim(worker_identity), now(), now())
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

create or replace function public.release_github_workspace_worker(worker_identity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;
  delete from public.worker_runtime_heartbeats
  where worker_kind = 'github_workspace'
    and worker_id = trim(worker_identity);
end;
$$;

create or replace function public.github_workspace_worker_available()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  return exists (
    select 1
    from public.worker_runtime_heartbeats
    where worker_kind = 'github_workspace'
      and heartbeat_at >= now() - interval '45 seconds'
  );
end;
$$;

create or replace function public.guard_github_workspace_queue_liveness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'queued' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'queued' then return new; end if;

  if not exists (
    select 1
    from public.worker_runtime_heartbeats
    where worker_kind = 'github_workspace'
      and heartbeat_at >= now() - interval '45 seconds'
  ) then
    raise exception using
      message = 'GitHub publishing is not connected. Configure the protected GitHub worker and try again; no repository was queued.',
      errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists github_workspace_publications_guard_queue_liveness
  on public.github_workspace_publications;
create trigger github_workspace_publications_guard_queue_liveness
before insert or update of status on public.github_workspace_publications
for each row execute function public.guard_github_workspace_queue_liveness();

create or replace function public.reconcile_github_workspace_publications(
  target_business_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reconciled_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  update public.github_workspace_publications as publications
  set status = 'failed',
      progress_phase = 'failed',
      progress_detail = case
        when publications.status = 'running'
          then 'The protected GitHub worker stopped responding and released this publication.'
        else 'No protected GitHub worker was available to create this repository.'
      end,
      error_summary = case
        when publications.status = 'running'
          then 'The GitHub publishing worker lease expired before the source push completed.'
        else 'The GitHub publishing worker was offline, so no repository was created.'
      end,
      worker_id = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where (target_business_id is null or publications.business_id = target_business_id)
    and public.is_organization_member(publications.organization_id)
    and publications.cancel_requested_at is null
    and (
      (publications.status = 'running' and publications.lease_expires_at < now())
      or (
        publications.status = 'queued'
        and publications.created_at < now() - interval '2 minutes'
        and not exists (
          select 1
          from public.worker_runtime_heartbeats
          where worker_kind = 'github_workspace'
            and heartbeat_at >= now() - interval '45 seconds'
        )
      )
    );

  get diagnostics reconciled_count = row_count;
  return reconciled_count;
end;
$$;

revoke all on function public.heartbeat_github_workspace_worker(text)
  from public, anon, authenticated;
revoke all on function public.release_github_workspace_worker(text)
  from public, anon, authenticated;
revoke all on function public.github_workspace_worker_available() from public, anon;
revoke all on function public.reconcile_github_workspace_publications(uuid) from public, anon;
grant execute on function public.heartbeat_github_workspace_worker(text) to service_role;
grant execute on function public.release_github_workspace_worker(text) to service_role;
grant execute on function public.github_workspace_worker_available() to authenticated;
grant execute on function public.reconcile_github_workspace_publications(uuid) to authenticated;
