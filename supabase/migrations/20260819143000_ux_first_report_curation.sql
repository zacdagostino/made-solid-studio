-- Keep exhaustive page-level audit evidence private while freezing a concise UX-led client story.
-- Repeated observations with the same specialist/area/title become one theme. The frozen report
-- retains private screenshot references for the publication worker to copy into client storage.
create or replace function public.curate_ux_first_report_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  source_findings jsonb := coalesce(new.data->'findings', '[]'::jsonb);
  curated_findings jsonb := '[]'::jsonb;
  grouped_items jsonb;
  representative jsonb;
  combined_sources jsonb;
  combined_artifact_ids jsonb;
  evidence_reference jsonb;
  platform_finding jsonb;
  platform_report jsonb;
  top_priorities jsonb;
  action_plan jsonb := '[]'::jsonb;
  group_record record;
  client_theme_count integer := 0;
begin
  for group_record in
    select
      concat_ws(':',
        coalesce(finding->>'specialistKind', 'legacy'),
        coalesce(finding->>'area', 'Website experience'),
        regexp_replace(lower(coalesce(finding->>'title', 'finding')), '[^a-z0-9]+', '-', 'g')
      ) as group_key,
      jsonb_agg(finding order by
        case finding->>'severity' when 'high' then 1 when 'medium' then 2 else 3 end
      ) as items
    from jsonb_array_elements(source_findings) finding
    where coalesce(finding->>'area', '') <> 'Platform'
    group by 1
    order by min(case finding->>'severity' when 'high' then 1 when 'medium' then 2 else 3 end), min(finding->>'title')
  loop
    client_theme_count := client_theme_count + 1;
    if client_theme_count > 8 then
      raise exception 'Choose no more than eight client-facing UX themes before creating the report.';
    end if;
    grouped_items := group_record.items;
    representative := grouped_items->0;
    select coalesce(jsonb_agg(distinct source_url), '[]'::jsonb)
      into combined_sources
      from jsonb_array_elements(grouped_items) member
      cross join lateral jsonb_array_elements_text(coalesce(member->'sourceUrls', '[]'::jsonb)) source_values(source_url);
    select coalesce(jsonb_agg(distinct artifact_id), '[]'::jsonb)
      into combined_artifact_ids
      from jsonb_array_elements(grouped_items) member
      cross join lateral jsonb_array_elements_text(coalesce(member->'evidenceArtifactIds', '[]'::jsonb)) artifact_values(artifact_id);
    select jsonb_build_object(
      'artifactId', artifacts.id,
      'storageBucket', artifacts.storage_bucket,
      'storagePath', artifacts.storage_path,
      'caption', artifacts.label,
      'viewport', artifacts.metadata->'viewport',
      'evidenceKind', artifacts.metadata->>'evidenceKind',
      'sourceUrl', artifacts.metadata->>'sourceUrl',
      'markers', '[]'::jsonb
    ) into evidence_reference
    from public.artifacts artifacts
    where artifacts.business_id = new.business_id
      and artifacts.crawl_run_id = new.crawl_run_id
      and artifacts.kind = 'screenshot'
      and exists (
        select 1 from jsonb_array_elements_text(combined_artifact_ids) evidence_ids(evidence_id)
        where evidence_id = artifacts.id::text
      )
    order by case when artifacts.metadata->>'evidenceKind' = 'page-overview' then 2 else 1 end,
      artifacts.created_at
    limit 1;
    curated_findings := curated_findings || jsonb_build_array(
      representative || jsonb_build_object(
        'reportGroupKey', group_record.group_key,
        'occurrenceCount', jsonb_array_length(grouped_items),
        'sourceUrls', combined_sources,
        'evidenceArtifactIds', combined_artifact_ids,
        'evidence', evidence_reference
      )
    );
  end loop;

  select finding into platform_finding
    from jsonb_array_elements(source_findings) finding
    where finding->>'area' = 'Platform'
    order by case finding->>'severity' when 'high' then 1 when 'medium' then 2 else 3 end
    limit 1;
  if platform_finding is not null then
    platform_report := jsonb_build_object(
      'name', coalesce(platform_finding->'measurement'->>'platform', 'Current platform'),
      'summary', platform_finding->>'observation',
      'strengths', '[]'::jsonb,
      'tradeoffs', jsonb_build_array(platform_finding->>'impact'),
      'recommendation', platform_finding->>'recommendation'
    );
  end if;

  select coalesce(jsonb_agg(priority), '[]'::jsonb) into top_priorities
    from (select value as priority from jsonb_array_elements(curated_findings) limit 3) ranked;

  select coalesce(jsonb_agg(stage), '[]'::jsonb) into action_plan
  from (
    select jsonb_build_object(
      'id', priority,
      'label', case priority when 'high' then 'Fix first' when 'medium' then 'Improve next' else 'Future opportunity' end,
      'items', coalesce((
        select jsonb_agg(distinct finding->>'recommendation')
        from jsonb_array_elements(curated_findings) finding
        where finding->>'severity' = priority and nullif(finding->>'recommendation', '') is not null
      ), '[]'::jsonb)
    ) as stage
    from (values ('high', 1), ('medium', 2), ('low', 3)) priorities(priority, sequence)
    where exists (
      select 1 from jsonb_array_elements(curated_findings) finding
      where finding->>'severity' = priority
    )
    order by sequence
  ) stages;

  new.schema_version := 2;
  new.data := new.data || jsonb_build_object(
    'schemaVersion', 2,
    'summary', 'A UX-led review of the clearest opportunities to make the website easier to understand, navigate, and act on.',
    'findings', curated_findings,
    'topPriorities', top_priorities,
    'platform', platform_report,
    'actionPlan', action_plan,
    'reportPrinciples', jsonb_build_array(
      'The main report contains no more than eight reviewed themes.',
      'Repeated page-level cases are grouped while their evidence remains traceable.',
      'Screenshots are current evidence, not a proposed after-state.'
    )
  );
  return new;
end; $$;

drop trigger if exists curate_ux_first_report_version on public.decision_report_versions;
create trigger curate_ux_first_report_version
  before insert on public.decision_report_versions
  for each row execute procedure public.curate_ux_first_report_version();
