-- The v4 package is a legacy source-controlled baseline. This explicit test
-- release records the reviewed brand-introduction capability before it can be
-- promoted to the production package.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  approved_at
)
select
  published.organization_id,
  published.version + 1,
  'test_ready',
  published.id,
  published.builder_contract_version,
  published.foundation_version,
  published.foundation_checksum,
  '## Built-in brand introduction\n\nWhen an approved primary logo is available, the generated header marks its real logo target with `data-siteforge-brand-logo`. The local runtime may use that exact logo for a short first-visit introduction before carrying it into the header. It is not a fake loader, never adds claims or a generic wordmark, respects reduced motion, and never delays access to content or controls beyond the restrained transition.',
  'Mark the real approved header logo with `data-siteforge-brand-logo` and retain the deferred local `main.js` runtime. Choose an understated brand-appropriate treatment; use `data-siteforge-intro="quiet"` only where a quieter reveal suits the site. Do not create a separate loader or add dependencies.',
  'Derived v5 test package: verified brand-aware first-visit logo introduction with a safe header handoff.',
  'foundation_change_required',
  'The v5 foundation adds a local, dependency-free brand-introduction runtime and an automated quality check for the real header-logo target.',
  now()
from public.agent_packages as published
where published.status = 'published'
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = published.organization_id
      and existing.version = published.version + 1
  );
