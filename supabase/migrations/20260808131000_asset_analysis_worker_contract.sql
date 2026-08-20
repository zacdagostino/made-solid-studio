alter table public.asset_analysis_jobs
  add column if not exists worker_contract_version integer not null default 2
  check (worker_contract_version >= 1);

create or replace function public.claim_next_asset_analysis(worker_identity text)
returns setof public.asset_analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;

  update public.asset_analysis_jobs
  set
    status = 'failed',
    lease_expires_at = null,
    heartbeat_at = null,
    progress_phase = 'cancelled',
    progress_detail = 'Asset analysis cancelled before a worker could safely stop.',
    error_summary = 'Asset analysis cancelled by a workspace user.'
  where status = 'running'
    and cancel_requested_at is not null;

  return query
  with candidate as (
    select id
    from public.asset_analysis_jobs
    where worker_contract_version < 2
      and (
        status = 'queued'
        or (
          status = 'running'
          and (
            lease_expires_at < now()
            or heartbeat_at is null
            or heartbeat_at < now() - interval '90 seconds'
          )
        )
      )
      and cancel_requested_at is null
      and attempt_count < 3
    order by created_at
    for update skip locked
    limit 1
  )
  update public.asset_analysis_jobs jobs
  set
    status = 'running',
    worker_id = trim(worker_identity),
    lease_expires_at = now() + interval '20 minutes',
    heartbeat_at = now(),
    attempt_count = jobs.attempt_count + 1,
    progress_phase = 'preparing',
    progress_detail = 'Loading captured visual assets for private analysis.',
    error_summary = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

create or replace function public.claim_next_asset_analysis_v2(
  worker_identity text,
  supported_contract_version integer
)
returns setof public.asset_analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;
  if supported_contract_version < 2 then
    raise exception 'Asset-analysis worker contract 2 or newer is required.';
  end if;

  update public.asset_analysis_jobs
  set
    status = 'failed',
    lease_expires_at = null,
    heartbeat_at = null,
    progress_phase = 'cancelled',
    progress_detail = 'Asset analysis cancelled before a worker could safely stop.',
    error_summary = 'Asset analysis cancelled by a workspace user.'
  where status = 'running'
    and cancel_requested_at is not null;

  return query
  with candidate as (
    select id
    from public.asset_analysis_jobs
    where worker_contract_version <= supported_contract_version
      and (
        status = 'queued'
        or (
          status = 'running'
          and (
            lease_expires_at < now()
            or heartbeat_at is null
            or heartbeat_at < now() - interval '90 seconds'
          )
        )
      )
      and cancel_requested_at is null
      and attempt_count < 3
    order by created_at
    for update skip locked
    limit 1
  )
  update public.asset_analysis_jobs jobs
  set
    status = 'running',
    worker_id = trim(worker_identity),
    lease_expires_at = now() + interval '20 minutes',
    heartbeat_at = now(),
    attempt_count = jobs.attempt_count + 1,
    progress_phase = 'preparing',
    progress_detail = 'Loading captured visual assets for private analysis.',
    error_summary = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_next_asset_analysis_v2(text, integer) from public, anon, authenticated;
grant execute on function public.claim_next_asset_analysis_v2(text, integer) to service_role;
