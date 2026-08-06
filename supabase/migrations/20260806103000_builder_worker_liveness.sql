-- A build must never enter an unbounded queue. The worker advertises its
-- availability, renews a short active lease, and the workspace reconciles a
-- run to a clear failed state when that liveness disappears.
create table if not exists public.worker_runtime_heartbeats (
  worker_kind text primary key check (worker_kind in ('builder')),
  worker_id text not null check (char_length(worker_id) between 1 and 120),
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now()
);

alter table public.worker_runtime_heartbeats enable row level security;
revoke all on table public.worker_runtime_heartbeats from public, anon, authenticated;

alter table public.builder_runs
  add column if not exists heartbeat_at timestamptz;

create index if not exists builder_runs_runtime_heartbeat_idx
  on public.builder_runs (status, heartbeat_at);

create or replace function public.heartbeat_builder_worker(
  worker_identity text,
  active_builder_run_id uuid default null
)
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
  values ('builder', trim(worker_identity), now(), now())
  on conflict (worker_kind) do update
  set
    worker_id = excluded.worker_id,
    started_at = case
      when worker_runtime_heartbeats.worker_id = excluded.worker_id
        then worker_runtime_heartbeats.started_at
      else now()
    end,
    heartbeat_at = now();

  if active_builder_run_id is not null then
    update public.builder_runs
    set
      heartbeat_at = now(),
      lease_expires_at = now() + interval '2 minutes'
    where id = active_builder_run_id
      and status = 'running'
      and worker_id = trim(worker_identity)
      and cancel_requested_at is null;
  end if;
end;
$$;

revoke all on function public.heartbeat_builder_worker(text, uuid)
  from public, anon, authenticated;
grant execute on function public.heartbeat_builder_worker(text, uuid) to service_role;

create or replace function public.release_builder_worker(worker_identity text)
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
  where worker_kind = 'builder' and worker_id = trim(worker_identity);
end;
$$;

revoke all on function public.release_builder_worker(text) from public, anon, authenticated;
grant execute on function public.release_builder_worker(text) to service_role;

create or replace function public.guard_builder_queue_liveness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'queued' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'queued' then
    return new;
  end if;

  -- Serialize queue admission with worker claims. A single protected builder
  -- runtime processes one run at a time, so a second run must fail immediately
  -- instead of waiting behind an unknowably long build.
  perform pg_advisory_xact_lock(hashtext('made-solid-studio-builder-queue'));

  if not exists (
    select 1
    from public.worker_runtime_heartbeats
    where worker_kind = 'builder'
      and heartbeat_at >= now() - interval '30 seconds'
  ) then
    raise exception using
      message = 'The protected builder is offline. Start the builder worker and try again; no test was queued.',
      errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.builder_runs as active
    where active.id <> new.id
      and active.status in ('queued', 'running', 'paused')
      and active.cancel_requested_at is null
  ) then
    raise exception using
      message = 'The protected builder is already processing another build. Try again after it finishes; no test was queued.',
      errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists builder_runs_guard_queue_liveness on public.builder_runs;
create trigger builder_runs_guard_queue_liveness
before insert or update of status on public.builder_runs
for each row execute function public.guard_builder_queue_liveness();

create or replace function public.reconcile_builder_run_lifecycle(
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

  update public.builder_runs as runs
  set
    status = 'failed',
    worker_id = null,
    lease_expires_at = null,
    heartbeat_at = null,
    completed_at = now(),
    progress_phase = 'failed',
    progress_detail = case
      when runs.status = 'running'
        then 'The protected builder stopped responding and released this build.'
      else 'No protected builder was available to start this build.'
    end,
    error_summary = case
      when runs.status = 'running'
        then 'The builder worker stopped responding for more than two minutes.'
      else 'The build remained unclaimed because the builder worker was offline.'
    end,
    failure_code = 'builder_worker_unavailable',
    failure_stage = 'worker_runtime',
    failure_action = 'Start the protected builder worker, then create a new test from the same package.',
    failure_context = coalesce(runs.failure_context, '{}'::jsonb)
      || jsonb_build_object('reconciledAt', now())
  where (target_business_id is null or runs.business_id = target_business_id)
    and public.is_organization_member(runs.organization_id)
    and runs.cancel_requested_at is null
    and (
      (
        runs.status = 'running'
        and runs.lease_expires_at < now()
      )
      or (
        runs.status = 'queued'
        and runs.created_at < now() - interval '2 minutes'
        and not exists (
          select 1
          from public.worker_runtime_heartbeats
          where worker_kind = 'builder'
            and heartbeat_at >= now() - interval '30 seconds'
        )
      )
      or (
        runs.status = 'paused'
        and runs.retry_after < now() - interval '2 minutes'
        and not exists (
          select 1
          from public.worker_runtime_heartbeats
          where worker_kind = 'builder'
            and heartbeat_at >= now() - interval '30 seconds'
        )
      )
    );

  get diagnostics reconciled_count = row_count;
  return reconciled_count;
end;
$$;

revoke all on function public.reconcile_builder_run_lifecycle(uuid) from public, anon;
grant execute on function public.reconcile_builder_run_lifecycle(uuid) to authenticated;

create or replace function public.claim_next_website_build(worker_identity text)
returns setof public.builder_runs
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

  perform pg_advisory_xact_lock(hashtext('made-solid-studio-builder-queue'));
  perform public.heartbeat_builder_worker(worker_identity, null);

  update public.builder_runs
  set
    status = 'failed',
    completed_at = now(),
    worker_id = null,
    lease_expires_at = null,
    heartbeat_at = null,
    progress_phase = 'failed',
    progress_detail = 'The builder worker stopped responding after repeated attempts.',
    error_summary = 'Builder worker heartbeat expired after repeated attempts.',
    failure_code = 'worker_lease_expired',
    failure_stage = 'worker_runtime',
    failure_action = 'Start a new build from the same approved manifest after confirming the worker runtime is available.'
  where status = 'running'
    and cancel_requested_at is null
    and lease_expires_at < now()
    and attempt_count >= 2;

  return query
  with candidate as (
    select id
    from public.builder_runs
    where (
      status = 'queued'
      or (status = 'paused' and retry_after <= now())
      or (status = 'running' and lease_expires_at < now())
    )
      and cancel_requested_at is null
      and attempt_count < 2
    order by created_at
    for update skip locked
    limit 1
  )
  update public.builder_runs as runs
  set
    status = 'running',
    started_at = coalesce(runs.started_at, now()),
    worker_id = trim(worker_identity),
    heartbeat_at = now(),
    lease_expires_at = now() + interval '2 minutes',
    retry_after = null,
    attempt_count = runs.attempt_count + 1,
    progress_phase = 'preparing_workspace',
    progress_detail = 'Preparing an isolated website workspace for the approved Build Manifest.',
    error_summary = null,
    failure_code = null,
    failure_stage = null,
    failure_action = null,
    failure_context = case
      when runs.failure_code is not null then
        coalesce(runs.failure_context, '{}'::jsonb)
          || jsonb_build_object(
            'resumeFromFailureCode', coalesce(runs.failure_context ->> 'resumeFromFailureCode', runs.failure_code),
            'resumeFromFailureStage', coalesce(runs.failure_context ->> 'resumeFromFailureStage', runs.failure_stage)
          )
      else coalesce(runs.failure_context, '{}'::jsonb)
    end
  from candidate
  where runs.id = candidate.id
  returning runs.*;
end;
$$;

revoke all on function public.claim_next_website_build(text) from public, anon, authenticated;
grant execute on function public.claim_next_website_build(text) to service_role;
