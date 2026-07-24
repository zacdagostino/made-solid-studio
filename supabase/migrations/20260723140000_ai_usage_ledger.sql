create table public.ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  builder_run_id uuid references public.builder_runs on delete set null,
  source text not null check (source in ('asset_analysis', 'capability_analysis', 'codex_build')),
  provider text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  reasoning_tokens integer not null default 0 check (reasoning_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  cost_usd numeric(14, 8),
  cost_source text not null check (cost_source in ('provider_reported', 'configured_rate', 'unavailable')),
  pricing_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ai_usage_records_business_created_idx
  on public.ai_usage_records (business_id, created_at desc);
create index ai_usage_records_builder_run_idx
  on public.ai_usage_records (builder_run_id, created_at desc)
  where builder_run_id is not null;

alter table public.ai_usage_records enable row level security;

create policy "Members can view AI usage records" on public.ai_usage_records
  for select to authenticated
  using (public.is_organization_member(organization_id));
