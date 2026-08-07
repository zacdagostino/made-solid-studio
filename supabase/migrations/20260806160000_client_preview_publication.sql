create table public.client_preview_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  builder_run_id uuid not null references public.builder_runs on delete cascade unique,
  requested_by uuid references auth.users on delete set null,
  client_name text not null,
  contact_name text not null default '',
  client_email text not null,
  project_name text not null,
  final_balance_cents integer check (final_balance_cents is null or final_balance_cents >= 0),
  currency text not null default 'AUD',
  handoff_notes text not null default '',
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
  vercel_project_name text,
  vercel_deployment_id text,
  deployment_url text,
  clientspace_handoff_id text,
  error_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index client_preview_publications_queue_idx
  on public.client_preview_publications(status, lease_expires_at, created_at);
create index client_preview_publications_business_idx
  on public.client_preview_publications(business_id, created_at desc);

alter table public.client_preview_publications enable row level security;
create policy "Members can view client preview publications"
  on public.client_preview_publications for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace function public.request_client_preview_publication(
  target_builder_run_id uuid,
  target_client_name text,
  target_contact_name text,
  target_client_email text,
  target_project_name text,
  target_final_balance_cents integer default null,
  target_currency text default 'AUD',
  target_handoff_notes text default ''
)
returns setof public.client_preview_publications
language plpgsql
security definer
set search_path = public
as $$
declare
  target_run public.builder_runs;
  existing_publication public.client_preview_publications;
begin
  select * into target_run from public.builder_runs where id = target_builder_run_id;
  if target_run.id is null or not public.is_organization_member(target_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_run.build_mode <> 'full_site' or target_run.status <> 'ready' then
    raise exception 'A completed full-site build is required.';
  end if;
  if coalesce(target_run.quality_summary->>'status', '') <> 'passed' then
    raise exception 'The full-site build must pass quality review before client publishing.';
  end if;
  if not exists (
    select 1 from public.builder_artifacts
    where builder_run_id = target_run.id and kind = 'site_file' and label = 'index.html'
  ) then
    raise exception 'The completed website output is unavailable.';
  end if;
  if char_length(trim(target_client_name)) = 0 or char_length(trim(target_project_name)) = 0 then
    raise exception 'Client and project names are required.';
  end if;
  if trim(target_client_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid client email is required.';
  end if;
  if target_final_balance_cents is not null and target_final_balance_cents < 0 then
    raise exception 'The final balance cannot be negative.';
  end if;
  if trim(target_currency) !~ '^[A-Z]{3}$' then
    raise exception 'Use a three-letter currency code.';
  end if;

  select * into existing_publication
  from public.client_preview_publications
  where builder_run_id = target_run.id
  for update;

  if existing_publication.id is not null and existing_publication.status in ('queued', 'running', 'ready') then
    return next existing_publication;
    return;
  end if;

  if existing_publication.id is not null then
    return query
    update public.client_preview_publications
    set client_name = trim(target_client_name),
        contact_name = trim(coalesce(target_contact_name, '')),
        client_email = lower(trim(target_client_email)),
        project_name = trim(target_project_name),
        final_balance_cents = target_final_balance_cents,
        currency = trim(target_currency),
        handoff_notes = trim(coalesce(target_handoff_notes, '')),
        status = 'queued',
        progress_phase = 'queued',
        progress_detail = 'Waiting for the protected publishing worker.',
        total_items = 0,
        completed_items = 0,
        cancel_requested_at = null,
        worker_id = null,
        lease_expires_at = null,
        error_summary = null,
        completed_at = null,
        updated_at = now()
    where id = existing_publication.id
    returning *;
    return;
  end if;

  return query
  insert into public.client_preview_publications (
    organization_id, business_id, builder_run_id, requested_by,
    client_name, contact_name, client_email, project_name,
    final_balance_cents, currency, handoff_notes, progress_detail
  ) values (
    target_run.organization_id, target_run.business_id, target_run.id, auth.uid(),
    trim(target_client_name), trim(coalesce(target_contact_name, '')),
    lower(trim(target_client_email)), trim(target_project_name),
    target_final_balance_cents, trim(target_currency), trim(coalesce(target_handoff_notes, '')),
    'Waiting for the protected publishing worker.'
  ) returning *;
end;
$$;

create or replace function public.cancel_client_preview_publication(target_publication_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_publication public.client_preview_publications;
begin
  select * into target_publication from public.client_preview_publications where id = target_publication_id;
  if target_publication.id is null or not public.is_organization_member(target_publication.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if target_publication.status not in ('queued', 'running') then return; end if;
  update public.client_preview_publications
  set cancel_requested_at = now(),
      status = case when status = 'queued' then 'cancelled' else status end,
      progress_phase = case when status = 'queued' then 'cancelled' else progress_phase end,
      progress_detail = 'Cancellation requested. The worker will stop at the next safe checkpoint.',
      completed_at = case when status = 'queued' then now() else completed_at end,
      updated_at = now()
  where id = target_publication.id;
end;
$$;

create or replace function public.claim_next_client_preview_publication(worker_identity text)
returns setof public.client_preview_publications
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'A service-role worker is required.'; end if;

  update public.client_preview_publications
  set status = 'cancelled', progress_phase = 'cancelled',
      progress_detail = 'The publication was cancelled after its worker lease ended.',
      completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is not null and lease_expires_at < now();

  update public.client_preview_publications
  set status = 'failed', progress_phase = 'failed',
      progress_detail = 'The publication stopped after three worker attempts.',
      error_summary = 'The publication worker did not complete after three attempts.',
      completed_at = now(), worker_id = null, lease_expires_at = null, updated_at = now()
  where status = 'running' and cancel_requested_at is null
    and lease_expires_at < now() and attempt_count >= 3;

  return query
  with candidate as (
    select id from public.client_preview_publications
    where (status = 'queued' or (status = 'running' and lease_expires_at < now()))
      and cancel_requested_at is null and attempt_count < 3
    order by created_at for update skip locked limit 1
  )
  update public.client_preview_publications as publications
  set status = 'running', started_at = coalesce(started_at, now()),
      worker_id = trim(worker_identity), lease_expires_at = now() + interval '10 minutes',
      attempt_count = attempt_count + 1, progress_phase = 'loading_files',
      progress_detail = 'Loading the completed quality-approved website output.',
      error_summary = null, updated_at = now()
  from candidate where publications.id = candidate.id returning publications.*;
end;
$$;

revoke all on function public.request_client_preview_publication(uuid, text, text, text, text, integer, text, text) from public;
revoke all on function public.cancel_client_preview_publication(uuid) from public;
revoke all on function public.claim_next_client_preview_publication(text) from public;
grant execute on function public.request_client_preview_publication(uuid, text, text, text, text, integer, text, text) to authenticated;
grant execute on function public.cancel_client_preview_publication(uuid) to authenticated;
grant execute on function public.claim_next_client_preview_publication(text) to service_role;
