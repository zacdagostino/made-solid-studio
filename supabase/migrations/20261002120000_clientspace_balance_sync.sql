create or replace function public.sync_clientspace_balance_revision(
  target_revision jsonb,
  target_pricing_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_handoff public.made_solid_handoffs;
  current_draft jsonb;
  revision_document jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'A service-role integration worker is required.';
  end if;
  if coalesce(target_revision->>'sourceProjectId', '') !~ '^[0-9a-f-]{36}$'
     or coalesce(target_revision->>'handoffId', '') !~ '^[0-9a-f-]{36}$'
     or coalesce(target_revision->>'id', '') !~ '^[0-9a-f-]{36}$'
     or coalesce(target_pricing_snapshot->>'status', '') <> 'approved'
     or coalesce(target_pricing_snapshot->>'currency', '') <> 'AUD'
     or (target_pricing_snapshot->>'balanceCents')::integer <= 0
     or target_pricing_snapshot->>'quoteReference' is distinct from target_revision->>'quoteReference'
     or target_pricing_snapshot->>'balanceCents' is distinct from target_revision->>'balanceCents' then
    raise exception 'The Clientspace balance revision is invalid.';
  end if;

  select * into target_handoff
  from public.made_solid_handoffs
  where business_id = (target_revision->>'sourceProjectId')::uuid
    and website_handoff_id = target_revision->>'handoffId'
    and source_commit = lower(target_revision->>'sourceCommit')
    and source_edit_version = (target_revision->>'sourceEditVersion')::integer
    and status = 'ready'
  for update;
  if target_handoff.id is null
     or target_pricing_snapshot->'sourceScope'->>'sourceCommit' is distinct from target_handoff.source_commit
     or target_pricing_snapshot->'sourceScope'->>'sourceEditVersion' is distinct from target_handoff.source_edit_version::text
     or target_pricing_snapshot->>'sourceManifestId' is distinct from target_handoff.source_manifest_id::text then
    raise exception 'The Clientspace balance revision does not match the ready Studio handoff.';
  end if;

  revision_document := jsonb_build_object(
    'schemaVersion', 1,
    'id', target_revision->>'id',
    'requestId', target_revision->>'requestId',
    'clientspaceProjectId', target_revision->>'projectId',
    'clientspaceHandoffId', target_revision->>'handoffId',
    'previousBalanceCents', (target_revision->>'previousBalanceCents')::integer,
    'balanceCents', (target_revision->>'balanceCents')::integer,
    'currency', target_revision->>'currency',
    'reason', target_revision->>'reason',
    'quoteReference', target_revision->>'quoteReference',
    'createdAt', target_revision->>'createdAt',
    'syncedAt', now()
  );

  update public.made_solid_handoffs
  set pricing_snapshot = target_pricing_snapshot,
      progress_detail = 'Clientspace amended the final balance and Studio imported the same quote revision.',
      updated_at = now()
  where id = target_handoff.id;

  select draft into current_draft
  from public.proposal_drafts
  where business_id = target_handoff.business_id
  for update;
  if current_draft is null then current_draft := '{}'::jsonb; end if;
  current_draft := jsonb_set(current_draft, '{approvedQuote}', target_pricing_snapshot, true);
  current_draft := jsonb_set(
    current_draft,
    '{clientspaceBalanceRevision}',
    revision_document,
    true
  );
  insert into public.proposal_drafts(business_id, draft, updated_at)
  values (target_handoff.business_id, current_draft, now())
  on conflict (business_id) do update
  set draft = excluded.draft, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.sync_clientspace_balance_revision(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_clientspace_balance_revision(jsonb, jsonb) to service_role;
