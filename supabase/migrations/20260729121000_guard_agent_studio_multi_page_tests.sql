-- A site_test is a feature-only revision of an existing multi-page source. Keep
-- one-page homepage/page tests movable into Agent Studio for future focused
-- features, but prevent them from accidentally expanding into a whole website.
create or replace function public.validate_agent_studio_site_test_source()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_mode text;
  selected_page_count integer;
begin
  if new.build_mode <> 'site_test' then return new; end if;

  select build_mode into source_mode
  from public.builder_runs
  where id = new.parent_builder_run_id
    and organization_id = new.organization_id
    and business_id = new.business_id;

  if source_mode not in ('full_site', 'site_test') then
    raise exception 'A multi-page Agent Studio test requires a complete website source.';
  end if;

  select jsonb_array_length(coalesce(data -> 'selectedPages', '[]'::jsonb))
  into selected_page_count
  from public.build_manifests
  where id = new.build_manifest_id
    and organization_id = new.organization_id
    and business_id = new.business_id;

  if coalesce(selected_page_count, 0) < 2 then
    raise exception 'A multi-page Agent Studio test requires at least two selected pages.';
  end if;

  return new;
end;
$$;

drop trigger if exists builder_runs_validate_agent_studio_site_test on public.builder_runs;

create trigger builder_runs_validate_agent_studio_site_test
before insert or update of build_mode, parent_builder_run_id, build_manifest_id
on public.builder_runs
for each row
execute function public.validate_agent_studio_site_test_source();
