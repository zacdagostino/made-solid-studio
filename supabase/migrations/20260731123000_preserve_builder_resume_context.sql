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

  update public.builder_runs
  set
    status = 'failed',
    completed_at = now(),
    lease_expires_at = null,
    progress_phase = 'failed',
    progress_detail = 'The builder worker lease expired after repeated attempts.',
    error_summary = 'Builder worker lease expired after repeated attempts.',
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
    lease_expires_at = now() + interval '45 minutes',
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
            'resumeFromFailureCode',
            coalesce(
              runs.failure_context ->> 'resumeFromFailureCode',
              runs.failure_code
            ),
            'resumeFromFailureStage',
            coalesce(
              runs.failure_context ->> 'resumeFromFailureStage',
              runs.failure_stage
            )
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
