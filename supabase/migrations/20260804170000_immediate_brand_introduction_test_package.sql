-- Preserve responsive introduction craft v7.0 and register immediate brand assets
-- as the next immutable private test release.
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
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v7.1',
  base.foundation_version,
  base.foundation_checksum,
  'Let the builder choose concise, brand-appropriate introduction copy instead of inheriting a generic loading sentence. Declare accessible message ink against the exact intro surface. Treat header and compact-navigation logos as immediate interface assets that are decoded before their first visible state.',
  'Set data-siteforge-intro-copy, data-siteforge-intro-ink, and data-siteforge-intro-surface on the marked header logo. Prefer an approved slogan, otherwise use restrained evidence-grounded copy without inventing a claim. Load the intrinsically sized header logo eagerly with high fetch priority. Mark the drawer logo data-siteforge-navigation-logo and preload any distinct local drawer-logo source in the initial document through data-siteforge-navigation-logo-src. Verify refresh and first drawer open with an already decoded logo.',
  'Immediate brand introduction test package: builder-chosen loading copy, guaranteed readable intro text, and preloaded header and drawer logos without first-open delay.',
  'foundation_change_required',
  'Removes the fixed preparation sentence, safeguards message contrast, and prevents the approved logo appearing late on refresh or the first compact-navigation open.',
  '["brand-introduction", "responsive-sidebar", "contextual-logo-selection", "framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.status = 'test_ready'
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Immediate brand introduction test package:%'
  );
