import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('requires a source-aware approved quote locked to the exact revision before handoff', async () => {
  const [migration, app, pricing, domain] = await Promise.all([
    readFile(
      new URL('supabase/migrations/20260817190500_versioned_build_pricing.sql', root),
      'utf8',
    ),
    readFile(new URL('src/App.tsx', root), 'utf8'),
    readFile(new URL('src/lib/pricing.ts', root), 'utf8'),
    readFile(new URL('src/lib/domain.ts', root), 'utf8'),
  ]);
  assert.match(migration, /request_client_preview_publication_v2/);
  assert.match(migration, /request_made_solid_handoff_v2/);
  assert.match(migration, /sourceManifestId/);
  assert.match(migration, /balanceCents/);
  assert.match(app, /<PricingCalculator/);
  assert.match(app, /pricingSnapshot: approvedQuote/);
  assert.match(pricing, /pricingScheduleVersion = 'made-solid-cold-prospect-v3\.0'/);
  assert.match(pricing, /'Preview-first website delivery'/);
  assert.match(pricing, /sourceScope: scope/);
  assert.match(pricing, /paymentSchedule: schedule/);
  assert.match(pricing, /automaticOfferCeilingCents/);
  assert.match(pricing, /offerChoices/);
  assert.match(pricing, /'managed-24-month'/);
  assert.match(domain, /pricingSnapshot: import\('\.\/pricing'\)\.PricingQuoteSnapshot/);
});

test('keeps original build quality history alongside the edited-commit release proof', async () => {
  const [migration, worker, domain] = await Promise.all([
    readFile(
      new URL('supabase/migrations/20260826170000_exact_commit_release_attestations.sql', root),
      'utf8',
    ),
    readFile(new URL('worker/made-solid-handoff-worker.mjs', root), 'utf8'),
    readFile(new URL('src/lib/domain.ts', root), 'utf8'),
  ]);

  assert.match(migration, /source_builder_status text not null/);
  assert.match(migration, /source_builder_quality_summary jsonb/);
  assert.match(migration, /unique \(attestation_digest\)/);
  assert.match(worker, /\.select\('status, quality_summary'\)/);
  assert.match(worker, /release_attestation_id: saved\.id/);
  assert.match(domain, /releaseAttestationId\?: string/);
});
