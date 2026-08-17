import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerUrl = new URL('../../worker/client-preview-worker.mjs', import.meta.url);
const migrationUrl = new URL(
  '../../supabase/migrations/20260806160000_client_preview_publication.sql',
  import.meta.url,
);

test('publishes only through the protected Vercel and Clientspace worker path', async () => {
  const source = await readFile(workerUrl, 'utf8');
  assert.match(source, /requiredEnvironment\('VERCEL_ACCESS_TOKEN'\)/);
  assert.match(source, /requiredEnvironment\('CLIENTSPACE_HANDOFF_SECRET'\)/);
  assert.match(source, /Authorization: `Bearer \$\{vercelToken\}`/);
  assert.match(source, /X-Robots-Tag/);
  assert.match(source, /noindex, nofollow, noarchive/);
  assert.match(source, /frame-ancestors/);
  assert.match(source, /form-action 'none'/);
  assert.match(source, /\/review-bridge\.js/);
  assert.match(source, /homepage-ready/);
  assert.match(source, /data-made-solid-parent-origin/);
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(source, /target: 'production'/);
  assert.match(source, /data-made-solid-review-bridge/);
  assert.match(source, /sourceProjectId: job\.business_id/);
  assert.match(source, /pricingSnapshot: job\.pricing_snapshot/);
  assert.doesNotMatch(source, /VITE_(?:VERCEL|CLIENTSPACE)/);
});

test('queues only quality-passed full-site builds and keeps the worker service-role-only', async () => {
  const source = await readFile(migrationUrl, 'utf8');
  assert.match(source, /target_run\.build_mode <> 'full_site'/);
  assert.match(source, /target_run\.status <> 'ready'/);
  assert.match(source, /quality_summary->>'status'.*<> 'passed'/);
  assert.match(source, /kind = 'site_file' and label = 'index\.html'/);
  assert.match(source, /auth\.role\(\) <> 'service_role'/);
  assert.match(
    source,
    /grant execute on function public\.claim_next_client_preview_publication\(text\) to service_role/,
  );
});
