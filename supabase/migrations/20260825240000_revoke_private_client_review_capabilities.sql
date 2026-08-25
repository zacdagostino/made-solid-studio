create or replace function public.cancel_client_preview_publication(target_publication_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_publication public.client_preview_publications;
  stopped_at timestamptz := now();
begin
  select * into target_publication
  from public.client_preview_publications
  where id = target_publication_id;

  if target_publication.id is null
    or not public.is_organization_member(target_publication.organization_id) then
    raise exception 'Organization membership is required.';
  end if;

  if target_publication.status not in ('queued', 'running', 'ready') then
    return;
  end if;

  update public.builder_preview_access
  set revoked_at = coalesce(revoked_at, stopped_at)
  where builder_run_id = target_publication.builder_run_id
    and preview_mode = 'review'
    and revoked_at is null;

  update public.client_preview_publications
  set cancel_requested_at = stopped_at,
      status = case when status in ('queued', 'ready') then 'cancelled' else status end,
      progress_phase = case when status = 'ready' then 'revoked'
                            when status = 'queued' then 'cancelled'
                            else progress_phase end,
      progress_detail = case when status = 'ready'
        then 'The private client review link was revoked and can no longer be opened.'
        when status = 'queued'
        then 'The private client review was cancelled before its worker started.'
        else 'Cancellation requested. The worker will stop at the next safe checkpoint.' end,
      completed_at = case when status in ('queued', 'ready') then stopped_at else completed_at end,
      updated_at = stopped_at
  where id = target_publication.id;
end;
$$;

revoke all on function public.cancel_client_preview_publication(uuid) from public;
grant execute on function public.cancel_client_preview_publication(uuid) to authenticated;
