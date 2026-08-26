import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('moves only an exact committed edit through a protected persisted handoff', async () => {
  const [app, domain, cloud, worker, migration, fixMigration, releaseMigration, supervisor] =
    await Promise.all([
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
      readFile(
        new URL('supabase/migrations/20260826170000_exact_commit_release_attestations.sql', root),
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
  assert.match(worker, /verifyReleaseAttestation/);
  assert.match(worker, /persistReleaseAttestation/);
  assert.match(worker, /loadVerifiedValueReport/);
  assert.match(worker, /Create a current value report for this exact verified edit/);
  assert.match(worker, /report,/);
  assert.match(worker, /release-attestations/);
  assert.match(worker, /made-solid-edited-site-release-v1/);
  assert.match(worker, /'source-verification'/);
  assert.match(worker, /'responsive-layout'/);
  assert.match(worker, /'responsive-navigation'/);
  assert.match(worker, /'accessibility'/);
  assert.match(worker, /runWorkspaceCommand\('git', \['rev-parse', 'HEAD\^\{tree\}'\]/);
  assert.match(worker, /createHash\('sha256'\)/);
  assert.match(worker, /releaseAttestation,/);
  assert.match(worker, /deployExactSource/);
  assert.doesNotMatch(worker, /'deploy',\s*'--prod'/);
  assert.doesNotMatch(worker, /assignProspectDomain/);
  assert.doesNotMatch(worker, /MADE_SOLID_PROSPECT_DOMAIN/);
  assert.doesNotMatch(worker, /domains', 'add'/);
  assert.match(worker, /previewDeploymentUrl\(payload\.deployment\.url\)/);
  assert.match(worker, /previewUrl\.protocol !== 'https:'/);
  assert.match(worker, /labels\.length >= 3/);
  assert.match(worker, /endsWith\('\.vercel\.app'\)/);
  assert.match(worker, /labels\.some\(\(label\) => !dnsLabelPattern\.test\(label\)\)/);
  assert.match(worker, /reservedHostnameLabels\.has\(firstLabel\)/);
  assert.match(worker, /reservedHostnameLabels\.has\(projectName\)/);
  for (const label of [
    'www',
    'dev',
    'studio',
    'workspace',
    'preview',
    'app',
    'api',
    'admin',
    'portal',
    'client',
    'clients',
    'mail',
    'email',
    'status',
    'support',
    'docs',
    'assets',
    'static',
    'cdn',
    'auth',
    'dashboard',
    'test',
    'build',
  ]) {
    assert.match(worker, new RegExp(`'${label}'`));
  }
  assert.match(worker, /previewUrl: deployment\.previewUrl/);
  assert.match(worker, /Vercel did not return a ready exact-commit deployment/);
  assert.match(worker, /did not accept this revision/);
  assert.match(worker, /adminUrl\.origin !== handoffEndpoint\.origin/);
  assert.match(worker, /AbortSignal\.timeout\(60_000\)/);
  assert.match(worker, /final workspace verification was cancelled/);
  assert.match(worker, /heartbeat_made_solid_handoff_worker/);
  assert.match(migration, /unique \(business_id, source_commit\)/);
  assert.match(migration, /guard_made_solid_handoff_queue_liveness/);
  assert.match(migration, /made_solid_handoff_worker_available/);
  assert.match(migration, /target_publication\.github_repository_url/);
  assert.doesNotMatch(migration, /target_publication\.repository_url/);
  assert.match(fixMigration, /target_publication\.github_repository_url/);
  assert.match(releaseMigration, /create table public\.source_release_attestations/);
  assert.match(releaseMigration, /source_builder_status text not null/);
  assert.match(releaseMigration, /source_builder_quality_summary jsonb/);
  assert.match(releaseMigration, /attestation_id text not null/);
  assert.match(releaseMigration, /release_attestation_id uuid/);
  assert.match(releaseMigration, /guard_made_solid_handoff_release_attestation/);
  assert.match(releaseMigration, /status <> 'ready' and new\.website_handoff_id is null/);
  assert.match(
    releaseMigration,
    /A passed release attestation for this exact committed edit is required/,
  );
  assert.match(
    migration,
    /Cancellation requested\. The worker will stop at the next safe checkpoint/,
  );
  assert.match(supervisor, /MADE_SOLID_HANDOFF_URL/);
  assert.doesNotMatch(app, /website-admin connection is not configured/);
});
