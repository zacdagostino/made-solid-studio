create or replace function public.request_structured_visual_content(target_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  latest_capture_id uuid;
  requested_job_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select organization_id into target_organization_id
  from public.businesses where id = target_business_id;
  if target_organization_id is null
    or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  select runs.id into latest_capture_id
  from public.crawl_runs runs
  join public.websites websites on websites.id = runs.website_id
  where websites.business_id = target_business_id
    and runs.status = 'ready'
  order by runs.completed_at desc nulls last, runs.requested_at desc
  limit 1;
  if latest_capture_id is null then
    raise exception 'A completed capture is required before image content can be structured.';
  end if;

  update public.visual_content_candidates
  set structure_status = 'pending', structure_error = null
  where crawl_run_id = latest_capture_id
    and review_state = 'needs_review';

  insert into public.visual_content_jobs (
    organization_id,
    business_id,
    crawl_run_id,
    status,
    progress_phase,
    progress_detail
  )
  values (
    target_organization_id,
    target_business_id,
    latest_capture_id,
    'queued',
    'queued',
    'Waiting to interpret saved image content as structured information.'
  )
  on conflict (crawl_run_id) do update set
    status = 'queued',
    model = null,
    worker_id = null,
    lease_expires_at = null,
    attempt_count = 0,
    error_summary = null,
    progress_phase = 'queued',
    progress_detail = 'Waiting to interpret saved image content as structured information.',
    current_candidate_id = null,
    total_items = 0,
    completed_items = 0,
    cancel_requested_at = null
  returning id into requested_job_id;

  return requested_job_id;
end;
$$;
