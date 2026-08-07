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
    from public.builder_artifacts
    where builder_run_id = new.builder_run_id
      and (
        (
          kind = 'source_bundle'
          and jsonb_typeof(metadata->'localDevelopmentHandoffVersion') = 'number'
        )
        or (kind = 'draft_file' and coalesce(metadata->>'state', '') = 'final_source')
      )
  ) then
    raise exception using
      message = 'This completed build has no safe local-development source package. Create a clean full-site rebuild; no repository was queued.',
      errcode = 'P0001';
  end if;

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
