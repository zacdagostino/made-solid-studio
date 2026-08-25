import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('moves only an exact committed edit through a protected persisted handoff', async () => {
  const [app, domain, cloud, worker, migration, fixMigration, supervisor] = await Promise.all([
    readFile(new URL('src/App.tsx', root), 'utf8'),
    readFile(new URL('src/lib/domain.ts', root), 'utf8'),
    readFile(new URL('src/lib/cloud-repository.ts', root), 'utf8'),
    readFile(new URL('worker/made-solid-handoff-worker.mjs', root), 'utf8'),
    readFile(
      new URL('supabase/migrations/20260811110000_made_solid_source_handoffs.sql', root),
      'utf8',
    ),
    readFile(
      new URL(
        'supabase/migrations/20260811180000_made_solid_handoff_repository_column_fix.sql',
        root,
      ),
      'utf8',
    ),
    readFile(new URL('worker/supervisor.mjs', root), 'utf8'),
  ]);

  assert.match(app, /Push committed edit to Made Solid/);
  assert.match(app, /Open in Made Solid/);
  assert.match(app, /sourceCommit: state\.commit/);
  assert.match(app, /madeSolidHandoffWorkerSource/);
  assert.match(app, /Made Solid handoff worker/);
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /capturedPublicEmail\(workspace\.researchPacket\)/);
  assert.match(app, /Prefilled from the public email captured in this Research Packet/);
  assert.match(domain, /type MadeSolidHandoffStatus = 'queued' \| 'running' \| 'ready'/);
  assert.match(cloud, /request_made_solid_handoff_v2/);
  assert.match(cloud, /target_pricing_snapshot: input\.pricingSnapshot/);
  assert.match(cloud, /warnOptionalIntegrationError\('Made Solid handoff history'/);
  assert.match(cloud, /Core prospect and Agent Studio builds are still available/);
  assert.doesNotMatch(
    cloud,
    /clientPreviewPublications,\s+madeSolidHandoffs,\s+\]\.forEach\(\(result\) => throwIfError/,
  );
  assert.match(worker, /handoffKind: 'source_revision'/);
  assert.match(worker, /sourceCommit: job\.source_commit/);
  assert.match(worker, /pricingSnapshot: job\.pricing_snapshot/);
  assert.match(worker, /verifyExactSourceWorkspace/);
  assert.match(worker, /deployExactSource/);
  assert.match(worker, /assignProspectDomain/);
  assert.match(worker, /MADE_SOLID_PROSPECT_DOMAIN/);
  assert.match(worker, /domains', 'add', hostname, deployment\.projectName/);
  assert.match(worker, /its HTTPS check did not become ready in time/);
  assert.match(worker, /previewUrl,/);
  assert.match(worker, /Vercel did not return a ready exact-commit deployment/);
  assert.match(worker, /did not accept this revision/);
  assert.match(worker, /AbortSignal\.timeout\(60_000\)/);
  assert.match(worker, /final workspace verification was cancelled/);
  assert.match(worker, /heartbeat_made_solid_handoff_worker/);
  assert.match(migration, /unique \(business_id, source_commit\)/);
  assert.match(migration, /guard_made_solid_handoff_queue_liveness/);
  assert.match(migration, /made_solid_handoff_worker_available/);
  assert.match(migration, /target_publication\.github_repository_url/);
  assert.doesNotMatch(migration, /target_publication\.repository_url/);
  assert.match(fixMigration, /target_publication\.github_repository_url/);
  assert.match(
    migration,
    /Cancellation requested\. The worker will stop at the next safe checkpoint/,
  );
  assert.match(supervisor, /MADE_SOLID_HANDOFF_URL/);
  assert.doesNotMatch(app, /website-admin connection is not configured/);
});
