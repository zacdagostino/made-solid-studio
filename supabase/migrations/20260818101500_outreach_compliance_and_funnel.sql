create table if not exists public.outreach_compliance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  consent_basis text not null default 'not_established'
    check (consent_basis in ('public_role_relevant', 'express_call', 'existing_relationship', 'not_established')),
  source_url text,
  source_note text not null default '',
  email_allowed boolean not null default false,
  phone_allowed boolean not null default false,
  do_not_call_checked_at timestamptz,
  do_not_call_clear boolean not null default false,
  sender_identification_confirmed boolean not null default false,
  unsubscribe_process_confirmed boolean not null default false,
  suppressed_at timestamptz,
  suppression_reason text,
  campaign_cohort text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is null or char_length(source_url) <= 2000),
  check (char_length(source_note) <= 2000),
  check (char_length(notes) <= 4000)
);

create table if not exists public.prospect_funnel_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (event_type in (
    'outreach_approved', 'contact_attempted', 'responded', 'proposal_presented',
    'proposal_accepted', 'won', 'lost', 'suppressed'
  )),
  channel text check (channel is null or channel in ('email', 'phone', 'referral', 'other')),
  value_cents integer check (value_cents is null or value_cents >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists prospect_funnel_events_business_time_idx
  on public.prospect_funnel_events(business_id, occurred_at desc);

alter table public.outreach_compliance enable row level security;
alter table public.prospect_funnel_events enable row level security;

drop policy if exists "Members can manage outreach compliance" on public.outreach_compliance;
create policy "Members can manage outreach compliance"
  on public.outreach_compliance for all to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

drop policy if exists "Members can manage prospect funnel events" on public.prospect_funnel_events;
create policy "Members can manage prospect funnel events"
  on public.prospect_funnel_events for all to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create or replace function public.approve_business_for_outreach_v2(target_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  compliance public.outreach_compliance;
  email_ready boolean;
  phone_ready boolean;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select organization_id into target_organization_id
  from public.businesses where id = target_business_id;
  if target_organization_id is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Organization membership is required';
  end if;
  if not exists (
    select 1 from public.audits where business_id = target_business_id and status = 'ready'
  ) or not exists (
    select 1 from public.redesign_concepts where business_id = target_business_id and status = 'ready'
  ) then return false; end if;

  select * into compliance from public.outreach_compliance
  where business_id = target_business_id;
  email_ready := compliance.email_allowed
    and compliance.sender_identification_confirmed
    and compliance.unsubscribe_process_confirmed
    and exists (
      select 1 from public.contacts
      where business_id = target_business_id
        and nullif(trim(coalesce(email, '')), '') is not null
    );
  phone_ready := compliance.phone_allowed
    and compliance.do_not_call_clear
    and compliance.do_not_call_checked_at is not null
    and exists (
      select 1 from public.contacts
      where business_id = target_business_id
        and nullif(trim(coalesce(phone, '')), '') is not null
    );
  if compliance.id is null
    or compliance.consent_basis = 'not_established'
    or nullif(trim(compliance.source_note), '') is null
    or compliance.suppressed_at is not null
    or (not email_ready and not phone_ready)
    or (compliance.consent_basis = 'public_role_relevant'
      and nullif(trim(coalesce(compliance.source_url, '')), '') is null)
  then return false; end if;

  update public.businesses
  set stage = 'outreach_pending', review_state = 'approved', updated_at = now()
  where id = target_business_id;
  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id, target_business_id, 'approved',
    'Research and channel compliance reviewed for the next human-controlled outreach step.'
  );
  insert into public.prospect_funnel_events (
    organization_id, business_id, event_type, channel, metadata
  ) values (
    target_organization_id, target_business_id, 'outreach_approved',
    case when email_ready then 'email' when phone_ready then 'phone' else null end,
    jsonb_build_object('campaignCohort', compliance.campaign_cohort)
  );
  return true;
end;
$$;

revoke all on function public.approve_business_for_outreach_v2(uuid) from public;
grant execute on function public.approve_business_for_outreach_v2(uuid) to authenticated;

comment on table public.outreach_compliance is
  'Human-reviewed contact source, channel safeguards and suppression state required before prospect outreach.';
comment on table public.prospect_funnel_events is
  'Append-only prospect conversion evidence for cohort and channel reporting.';

create or replace function public.record_prospect_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.suppressed_at is not null
     and (tg_op = 'INSERT' or old.suppressed_at is null) then
    insert into public.prospect_funnel_events (
      organization_id, business_id, event_type, metadata, occurred_at
    ) values (
      new.organization_id, new.business_id, 'suppressed',
      jsonb_build_object('reason', coalesce(new.suppression_reason, 'Do not contact')),
      new.suppressed_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists outreach_compliance_suppression_event on public.outreach_compliance;
create trigger outreach_compliance_suppression_event
after insert or update of suppressed_at on public.outreach_compliance
for each row execute function public.record_prospect_suppression();
