create or replace function public.release_attestation_checks_passed(candidate_checks jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_typeof(candidate_checks) = 'array'
    and jsonb_array_length(candidate_checks) >= 4
    and not exists (
      select 1
      from jsonb_array_elements(candidate_checks) as candidate(check_value)
      where coalesce(candidate.check_value->>'id', '') = ''
        or coalesce(candidate.check_value->>'label', '') = ''
        or coalesce(candidate.check_value->>'detail', '') = ''
        or coalesce(candidate.check_value->>'status', '') <> 'passed'
    )
    and exists (
      select 1 from jsonb_array_elements(candidate_checks) as candidate(check_value)
      where candidate.check_value->>'id' = 'source-verification'
    )
    and exists (
      select 1 from jsonb_array_elements(candidate_checks) as candidate(check_value)
      where candidate.check_value->>'id' = 'responsive-layout'
    )
    and exists (
      select 1 from jsonb_array_elements(candidate_checks) as candidate(check_value)
      where candidate.check_value->>'id' = 'responsive-navigation'
    )
    and exists (
      select 1 from jsonb_array_elements(candidate_checks) as candidate(check_value)
      where candidate.check_value->>'id' = 'accessibility'
    ), false);
$$;

create table public.source_release_attestations (
  id uuid primary key default gen_random_uuid(),
  attestation_id text not null check (attestation_id ~ '^[a-f0-9]{64}$'),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  source_builder_run_id uuid not null references public.builder_runs on delete restrict,
  source_manifest_id uuid not null references public.build_manifests on delete restrict,
  source_repository_url text not null,
  source_commit text not null check (source_commit ~ '^[a-f0-9]{40}$'),
  source_tree text not null check (source_tree ~ '^[a-f0-9]{40}$'),
  source_branch text not null,
  source_edit_version integer not null check (source_edit_version > 0),
  verification_profile text not null
    check (verification_profile = 'made-solid-edited-site-release-v1'),
  verified_at timestamptz not null,
  checks jsonb not null check (public.release_attestation_checks_passed(checks)),
  attestation jsonb not null,
  attestation_digest text not null check (attestation_digest ~ '^[a-f0-9]{64}$'),
  source_builder_status text not null,
  source_builder_quality_summary jsonb,
  created_at timestamptz not null default now(),
  unique (attestation_digest),
  check (coalesce((attestation->>'schemaVersion')::integer = 1, false)),
  check (coalesce(attestation->>'id' = attestation_id, false)),
  check (coalesce(attestation->>'status' = 'passed', false)),
  check (coalesce(attestation->>'businessId' = business_id::text, false)),
  check (coalesce(attestation->>'sourceBuilderRunId' = source_builder_run_id::text, false)),
  check (coalesce(attestation->>'sourceManifestId' = source_manifest_id::text, false)),
  check (coalesce(lower(attestation->>'sourceCommit') = source_commit, false)),
  check (coalesce(lower(attestation->>'sourceTree') = source_tree, false)),
  check (coalesce(attestation->>'sourceBranch' = source_branch, false)),
  check (coalesce((attestation->>'sourceEditVersion')::integer = source_edit_version, false)),
  check (coalesce(attestation->>'verificationProfile' = verification_profile, false)),
  check (coalesce((attestation->>'verifiedAt')::timestamptz = verified_at, false)),
  check (coalesce(attestation->>'digest' = attestation_digest, false)),
  check (coalesce(attestation->'checks' = checks, false))
);

create index source_release_attestations_business_verified_idx
  on public.source_release_attestations(business_id, verified_at desc);

alter table public.source_release_attestations enable row level security;
create policy "Members can view source release attestations"
  on public.source_release_attestations for select to authenticated
  using (public.is_organization_member(organization_id));

alter table public.made_solid_handoffs
  add column if not exists release_attestation_id uuid
    references public.source_release_attestations(id) on delete restrict;

create or replace function public.guard_made_solid_handoff_release_attestation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_attestation public.source_release_attestations;
begin
  if new.status <> 'ready' and new.website_handoff_id is null then
    return new;
  end if;

  select * into saved_attestation
  from public.source_release_attestations
  where id = new.release_attestation_id;

  if saved_attestation.id is null
     or saved_attestation.organization_id <> new.organization_id
     or saved_attestation.business_id <> new.business_id
     or saved_attestation.source_builder_run_id <> new.builder_run_id
     or saved_attestation.source_manifest_id is distinct from new.source_manifest_id
     or saved_attestation.source_repository_url <> new.source_repository_url
     or saved_attestation.source_commit <> lower(new.source_commit)
     or saved_attestation.source_branch <> new.source_branch
     or saved_attestation.source_edit_version <> new.source_edit_version then
    raise exception using
      message = 'A passed release attestation for this exact committed edit is required before Made Solid handoff completion.',
      errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_made_solid_handoff_release_attestation
  on public.made_solid_handoffs;
create trigger guard_made_solid_handoff_release_attestation
before insert or update of status, website_handoff_id, release_attestation_id
on public.made_solid_handoffs
for each row execute function public.guard_made_solid_handoff_release_attestation();

revoke all on function public.release_attestation_checks_passed(jsonb) from public;
grant execute on function public.release_attestation_checks_passed(jsonb) to authenticated, service_role;
revoke all on function public.guard_made_solid_handoff_release_attestation() from public;
