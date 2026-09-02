-- Preserve actionable specialist failure state and let members retry one failed section without
-- discarding the other five completed sections or creating a duplicate audit version.
alter table public.audit_specialist_tasks
  add column if not exists error_code text,
  add column if not exists retryable boolean,
  add column if not exists recovery_action text;

create or replace function public.retry_audit_specialist_task(target_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task public.audit_specialist_tasks;
  latest_audit_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  select * into target_task from public.audit_specialist_tasks
  where id = target_task_id for update;
  if target_task.id is null
    or not public.is_organization_member(target_task.organization_id) then
    raise exception 'The specialist audit task is unavailable.';
  end if;
  if target_task.status <> 'failed' then
    raise exception 'Only a failed specialist section can be retried.';
  end if;

  select audits.id into latest_audit_id from public.audits
  where audits.business_id = target_task.business_id
  order by audits.version desc, audits.created_at desc limit 1;
  if latest_audit_id is distinct from target_task.audit_id then
    raise exception 'This specialist belongs to an earlier audit. Retry the current audit instead.';
  end if;

  delete from public.audit_observations where specialist_task_id = target_task.id;
  update public.audit_specialist_tasks
  set status = 'queued', worker_id = null, lease_expires_at = null, attempt_count = 0,
      progress_phase = 'retry_queued',
      progress_detail = 'Retry requested. Only this specialist section will run again.',
      total_items = 0, completed_items = 0, cancel_requested_at = null,
      error_summary = null, error_code = null, retryable = null, recovery_action = null
  where id = target_task.id;

  update public.audits
  set status = 'running', worker_id = null, lease_expires_at = null,
      progress_phase = 'specialist_analysis',
      progress_detail = format('Retrying %s. Completed specialist results are retained.', replace(target_task.specialist_kind, '_', ' ')),
      error_summary = null
  where id = target_task.audit_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (target_task.organization_id, target_task.business_id, 'note',
    format('Retry requested for the failed %s specialist section. Other completed sections were retained.', replace(target_task.specialist_kind, '_', ' ')));
  return target_task.id;
end;
$$;

revoke all on function public.retry_audit_specialist_task(uuid) from public, anon;
grant execute on function public.retry_audit_specialist_task(uuid) to authenticated;
