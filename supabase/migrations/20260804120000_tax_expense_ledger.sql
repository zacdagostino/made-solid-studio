create table public.tax_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  incurred_on date not null,
  supplier text not null check (char_length(trim(supplier)) between 1 and 160),
  description text not null check (char_length(trim(description)) between 1 and 400),
  category text not null check (
    category in (
      'software_subscriptions',
      'hosting_domains',
      'professional_services',
      'advertising_marketing',
      'equipment',
      'office_supplies',
      'travel_transport',
      'education_training',
      'insurance_fees',
      'phone_internet',
      'other'
    )
  ),
  amount_cents integer not null check (amount_cents > 0),
  gst_cents integer not null default 0 check (gst_cents >= 0 and gst_cents <= amount_cents),
  deductible_percent smallint not null default 100 check (deductible_percent between 0 and 100),
  payment_method text not null default '' check (char_length(payment_method) <= 80),
  receipt_reference text not null default '' check (char_length(receipt_reference) <= 240),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tax_expenses_organization_date_idx
  on public.tax_expenses (organization_id, incurred_on desc, created_at desc);

alter table public.tax_expenses enable row level security;

create policy "Members can manage tax expenses" on public.tax_expenses
  for all to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

grant select, insert, update, delete on table public.tax_expenses to authenticated;

create trigger set_tax_expenses_updated_at before update on public.tax_expenses
  for each row execute procedure public.set_updated_at();
