import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('registers the scale-aware cold prospect offer package and compliance gate', async () => {
  const [pricing, repository, app, complianceMigration, packageMigration] = await Promise.all([
    readFile(new URL('src/lib/pricing.ts', root), 'utf8'),
    readFile(new URL('src/lib/repository.ts', root), 'utf8'),
    readFile(new URL('src/App.tsx', root), 'utf8'),
    readFile(
      new URL('supabase/migrations/20260818101500_outreach_compliance_and_funnel.sql', root),
      'utf8',
    ),
    readFile(
      new URL('supabase/migrations/20260818102000_cold_prospect_offer_test_package.sql', root),
      'utf8',
    ),
  ]);
  assert.match(pricing, /made-solid-cold-prospect-v3\.0/);
  assert.match(pricing, /automaticOfferCeilingCents = 990_000/);
  assert.match(pricing, /managed-24-month/);
  assert.match(pricing, /essentials-launch/);
  assert.match(repository, /localColdProspectOffersPackage/);
  assert.match(repository, /version: 15\.1/);
  assert.match(app, /commercial-offer-strategy/);
  assert.match(app, /PipelineFunnel/);
  assert.match(complianceMigration, /approve_business_for_outreach_v2/);
  assert.match(complianceMigration, /unsubscribe_process_confirmed/);
  assert.match(complianceMigration, /do_not_call_checked_at/);
  assert.match(packageMigration, /Cold prospect offer test package:/);
  assert.match(packageMigration, /'test_ready'/);
});
