import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerUrl = new URL('../../worker/client-preview-worker.mjs', import.meta.url);
const migrationUrl = new URL(
  '../../supabase/migrations/20260806160000_client_preview_publication.sql',
  import.meta.url,
);
const privateReviewMigrationUrl = new URL(
  '../../supabase/migrations/20260825220000_private_client_review_capabilities.sql',
  import.meta.url,
);
const reviewRevocationMigrationUrl = new URL(
  '../../supabase/migrations/20260825240000_revoke_private_client_review_capabilities.sql',
  import.meta.url,
);
const appUrl = new URL('../../src/App.tsx', import.meta.url);

test('publishes only an expiring private review capability through the Clientspace worker path', async () => {
  const source = await readFile(workerUrl, 'utf8');
  assert.match(source, /requiredEnvironment\('PREVIEW_PUBLIC_ORIGIN'\)/);
  assert.match(source, /requiredEnvironment\('CLIENTSPACE_HANDOFF_SECRET'\)/);
  assert.match(source, /randomBytes\(32\)\.toString\('hex'\)/);
  assert.match(source, /createHash\('sha256'\)\.update\(token\)\.digest\('hex'\)/);
  assert.match(source, /preview_mode: 'review'/);
  assert.match(source, /7 \* 24 \* 60 \* 60_000/);
  assert.match(source, /\/review\/\$\{job\.builder_run_id\}\/\$\{token\}\//);
  assert.match(source, /revoked_at: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(source, /api\.vercel\.com/);
  assert.doesNotMatch(source, /VERCEL_ACCESS_TOKEN/);
  assert.doesNotMatch(source, /vercelRequest/);
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net/);
  assert.match(source, /sourceProjectId: job\.business_id/);
  assert.match(source, /pricingSnapshot: job\.pricing_snapshot/);
  assert.match(source, /\.from\('decision_report_versions'\)/);
  assert.match(source, /\.eq\('schema_version', 10\)/);
  assert.match(source, /\.eq\('review_state', 'approved'\)/);
  assert.match(source, /verified_redesign_value/);
  assert.match(source, /gpt-5\.6-sol-dynamic-design-showcase-v3/);
  assert.match(source, /\.\.\.reportData/);
  assert.match(source, /reviewedAt: report\.created_at/);
  assert.match(source, /schemaVersion: report\.schema_version/);
  assert.match(source, /loadReportMedia/);
  assert.match(source, /finding\?\.afterEvidence/);
  assert.match(source, /\.slice\(0, 14\)/);
  assert.match(source, /reportMedia/);
  assert.match(source, /6 \* 1024 \* 1024/);
  assert.doesNotMatch(source, /VITE_(?:VERCEL|CLIENTSPACE)/);
});

test('queues only quality-passed full-site builds and keeps the worker service-role-only', async () => {
  const [source, privateReviewSource] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(privateReviewMigrationUrl, 'utf8'),
  ]);
  assert.match(source, /target_run\.build_mode <> 'full_site'/);
  assert.match(source, /target_run\.status <> 'ready'/);
  assert.match(source, /quality_summary->>'status'.*<> 'passed'/);
  assert.match(source, /kind = 'site_file' and label = 'index\.html'/);
  assert.match(source, /auth\.role\(\) <> 'service_role'/);
  assert.match(
    source,
    /grant execute on function public\.claim_next_client_preview_publication\(text\) to service_role/,
  );
  assert.match(privateReviewSource, /preview_mode in \('ready', 'draft', 'review'\)/);
  assert.match(privateReviewSource, /expiring, revocable Clientspace-only links/);
});

test('lets an organization member revoke a ready private review capability immediately', async () => {
  const [source, appSource] = await Promise.all([
    readFile(reviewRevocationMigrationUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(source, /target_publication\.status not in \('queued', 'running', 'ready'\)/);
  assert.match(source, /update public\.builder_preview_access/);
  assert.match(source, /preview_mode = 'review'/);
  assert.match(source, /revoked_at = coalesce\(revoked_at, stopped_at\)/);
  assert.match(source, /status = case when status in \('queued', 'ready'\) then 'cancelled'/);
  assert.match(
    source,
    /grant execute on function public\.cancel_client_preview_publication\(uuid\) to authenticated/,
  );
  assert.match(appSource, /Revoke review link/);
  assert.match(appSource, /Anyone using the current link will lose access/);
});
