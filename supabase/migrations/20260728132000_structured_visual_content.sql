alter table public.visual_content_candidates
  drop constraint visual_content_candidates_content_type_check;

alter table public.visual_content_candidates
  add constraint visual_content_candidates_content_type_check
  check (
    content_type in (
      'testimonial',
      'service',
      'contact',
      'pricing',
      'faq',
      'process',
      'table',
      'list',
      'general'
    )
  );

alter table public.visual_content_candidates
  add column structured_content jsonb not null default '{}'::jsonb,
  add column human_structured_content jsonb not null default '{}'::jsonb,
  add column structure_status text not null default 'pending'
    check (structure_status in ('pending', 'ready', 'failed')),
  add column structure_error text;

create table public.visual_content_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs on delete cascade unique,
  status public.job_status not null default 'queued',
  model text,
  worker_id text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_summary text,
  progress_phase text not null default 'queued',
  progress_detail text,
  current_candidate_id uuid references public.visual_content_candidates on delete set null,
  total_items integer not null default 0 check (total_items >= 0),
  completed_items integer not null default 0 check (completed_items >= 0),
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visual_content_jobs_business_idx
  on public.visual_content_jobs (business_id, created_at desc);

alter table public.visual_content_jobs enable row level security;

create policy "Members can manage structured visual content jobs"
  on public.visual_content_jobs for all to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create trigger set_visual_content_jobs_updated_at
  before update on public.visual_content_jobs
  for each row execute procedure public.set_updated_at();

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

  perform public.request_visual_content_extraction(target_business_id);

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

create or replace function public.cancel_structured_visual_content(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
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
  update public.visual_content_jobs
  set cancel_requested_at = coalesce(cancel_requested_at, now()),
    progress_detail = 'Cancellation requested. The worker will stop before the next saved image.'
  where business_id = target_business_id
    and status in ('queued', 'running');
end;
$$;

create or replace function public.claim_next_structured_visual_content(worker_identity text)
returns setof public.visual_content_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role worker is required.';
  end if;
  return query
  with candidate as (
    select id
    from public.visual_content_jobs
    where (
      status = 'queued'
      or (status = 'running' and lease_expires_at < now())
    )
      and cancel_requested_at is null
      and attempt_count < 3
    order by created_at
    for update skip locked
    limit 1
  )
  update public.visual_content_jobs jobs
  set status = 'running',
    worker_id = trim(worker_identity),
    lease_expires_at = now() + interval '20 minutes',
    attempt_count = jobs.attempt_count + 1,
    error_summary = null,
    progress_phase = 'loading_saved_assets',
    progress_detail = 'Loading candidates and private images from the completed capture.'
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

grant execute on function public.request_structured_visual_content(uuid) to authenticated;
grant execute on function public.cancel_structured_visual_content(uuid) to authenticated;
revoke all on function public.claim_next_structured_visual_content(text)
  from public, anon, authenticated;
grant execute on function public.claim_next_structured_visual_content(text) to service_role;
