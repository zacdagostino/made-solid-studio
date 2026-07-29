-- Agent package contract identifiers are release identifiers, not inherited
-- builder-foundation versions. Keep the immutable package content unchanged
-- while correcting the brand and matching the identifier to the package version.
create or replace function public.set_agent_package_contract_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.builder_contract_version :=
    'made-solid-studio-builder-agent-v' || new.version::text;
  return new;
end;
$$;

drop trigger if exists set_agent_package_contract_version on public.agent_packages;
create trigger set_agent_package_contract_version
before insert or update of version on public.agent_packages
for each row execute procedure public.set_agent_package_contract_version();

update public.agent_packages
set builder_contract_version =
  'made-solid-studio-builder-agent-v' || version::text
where builder_contract_version is distinct from
  'made-solid-studio-builder-agent-v' || version::text;

update public.agent_packages
set foundation_version =
  regexp_replace(foundation_version, '^siteforge-', 'made-solid-studio-')
where foundation_version like 'siteforge-%';
