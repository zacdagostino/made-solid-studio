-- A client screenshot must demonstrate an observed defect. Design judgements remain frozen
-- internally, but do not become visual client themes merely because a page screenshot exists.

alter function public.create_audit_report_version(uuid, uuid)
  rename to create_audit_report_version_v6_unfiltered;
revoke all on function public.create_audit_report_version_v6_unfiltered(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.create_audit_report_version(
  target_business_id uuid,
  target_audit_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_id uuid;
  source_report public.decision_report_versions;
  report_id uuid;
  next_version integer;
  filtered_themes jsonb;
  revised_data jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  source_id := public.create_audit_report_version_v6_unfiltered(
    target_business_id,
    target_audit_id
  );
  select * into source_report
  from public.decision_report_versions
  where id = source_id;

  select versions.id into report_id
  from public.decision_report_versions versions
  where versions.business_id = target_business_id
    and versions.audit_id = target_audit_id
    and versions.crawl_run_id = source_report.crawl_run_id
    and versions.schema_version = 6
    and versions.data->>'generatorRevision' = 'screenshot-demonstrable-v2'
    and versions.data#>>'{redesign,attestationRowId}' =
      source_report.data#>>'{redesign,attestationRowId}'
  order by versions.version desc
  limit 1;
  if report_id is not null then return report_id; end if;

  select coalesce(jsonb_agg(theme order by ordinality), '[]'::jsonb)
  into filtered_themes
  from jsonb_array_elements(source_report.data->'valueThemes')
    with ordinality themes(theme, ordinality)
  where exists (
    select 1
    from public.audit_observations observations
    where observations.id = (theme#>>'{internalEvidence,observationIds,0}')::uuid
      and observations.audit_id = target_audit_id
      and observations.business_id = target_business_id
      and observations.crawl_run_id = source_report.crawl_run_id
      and observations.finding_class = 'observed_defect'
  );

  if jsonb_array_length(filtered_themes) = 0 then
    raise exception 'The current audit has no observed visual defects with exact screenshot evidence.';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.decision_report_versions
  where business_id = target_business_id;

  revised_data := source_report.data
    || jsonb_build_object(
      'generatorRevision', 'screenshot-demonstrable-v2',
      'generatedAt', now(),
      'version', next_version,
      'valueThemes', filtered_themes
    );

  insert into public.decision_report_versions (
    organization_id, business_id, audit_id, crawl_run_id, version, schema_version,
    review_state, summary, data, created_by
  ) values (
    source_report.organization_id, target_business_id, source_report.audit_id,
    source_report.crawl_run_id, next_version, 6, 'approved',
    format('%s visually demonstrable client themes generated from the verified website lineage.',
      jsonb_array_length(filtered_themes)),
    revised_data, auth.uid()
  ) returning id into report_id;

  return report_id;
end;
$$;

revoke all on function public.create_audit_report_version(uuid, uuid) from public, anon;
grant execute on function public.create_audit_report_version(uuid, uuid) to authenticated;
