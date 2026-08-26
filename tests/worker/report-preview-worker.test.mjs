import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const worker = await readFile(
  new URL('../../worker/report-preview-worker.mjs', import.meta.url),
  'utf8',
);
const migration = await readFile(
  new URL(
    '../../supabase/migrations/20260819183000_private_report_preview_jobs.sql',
    import.meta.url,
  ),
  'utf8',
);
const valueReportMigration = await readFile(
  new URL(
    '../../supabase/migrations/20260826210000_verified_prospect_value_reports.sql',
    import.meta.url,
  ),
  'utf8',
);

test('report preview is a durable, cancellable exact-version worker job', () => {
  assert.match(migration, /report_version_id uuid not null/);
  assert.match(migration, /unique \(report_version_id\)/);
  assert.match(migration, /claim_next_report_preview/);
  assert.match(migration, /cancel_report_preview/);
  assert.match(migration, /preview_expires_at > now\(\)/);
  assert.match(migration, /target_report\.audit_id/);
  assert.match(migration, /target_report\.crawl_run_id/);
  assert.match(valueReportMigration, /target_report\.schema_version <> 5/);
  assert.match(valueReportMigration, /target_attestation public\.source_release_attestations/);
});

test('worker keeps the secret server-side and resolves canonical screenshot provenance', () => {
  assert.match(worker, /MADE_SOLID_REPORT_PREVIEW_URL/);
  assert.match(worker, /STUDIO_HANDOFF_SECRET/);
  assert.match(worker, /sourceReportId: source\.report\.id/);
  assert.match(worker, /report\.schema_version !== 5/);
  assert.match(worker, /source_release_attestations/);
  assert.match(worker, /\.eq\('business_id', job\.business_id\)/);
  assert.match(worker, /\.eq\('crawl_run_id', report\.crawl_run_id\)/);
  assert.match(worker, /\.eq\('kind', 'screenshot'\)/);
  assert.match(worker, /previewUrl\.origin !== new URL\(previewEndpoint\)\.origin/);
  assert.match(worker, /preview_expires_at: preview\.expiresAt/);
  assert.match(worker, /async function rendererAvailable/);
  assert.match(worker, /return response\.status === 400/);
  assert.match(worker, /while \(!\(await rendererAvailable\(\)\)\)/);
  assert.match(worker, /Releasing a best-effort worker lease/);
  assert.doesNotMatch(worker, /\.rpc\([^;]+\)\s*\.catch/s);
  assert.doesNotMatch(worker, /VITE_/);
});
