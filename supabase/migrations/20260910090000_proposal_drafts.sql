create table if not exists public.proposal_drafts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.proposal_drafts enable row level security;
create policy "Members manage their proposal drafts" on public.proposal_drafts
  for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and public.is_organization_member(b.organization_id)))
  with check (exists (select 1 from public.businesses b where b.id = business_id and public.is_organization_member(b.organization_id)));
grant select, insert, update, delete on public.proposal_drafts to authenticated;
grant all on public.proposal_drafts to service_role;
