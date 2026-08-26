import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826210000_verified_prospect_value_reports.sql',
  import.meta.url,
);
const previewWorkerUrl = new URL('../../worker/report-preview-worker.mjs', import.meta.url);
const releaseVerifierUrl = new URL('../../scripts/verify-prospect-release.mjs', import.meta.url);
const reportParserUrl = new URL('../../src/lib/prospect-value-report.ts', import.meta.url);
const localRepositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);

test('freezes prospect reports against the exact verified edited website', async () => {
  const [migration, previewWorker, releaseVerifier, reportParser, localRepository] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(previewWorkerUrl, 'utf8'),
      readFile(releaseVerifierUrl, 'utf8'),
      readFile(reportParserUrl, 'utf8'),
      readFile(localRepositoryUrl, 'utf8'),
    ]);
  const reportRpc = migration.slice(
    migration.indexOf('create or replace function public.create_audit_report_version'),
    migration.indexOf('create or replace function public.request_report_preview'),
  );

  assert.match(migration, /'schemaVersion', 5/);
  assert.match(migration, /'reportKind', 'verified_redesign_value'/);
  assert.match(migration, /source_release_attestations/);
  assert.match(migration, /release_attestation_checks_passed/);
  assert.match(migration, /'sourceCommit', release_record\.source_commit/);
  assert.match(migration, /'sourceEditVersion', release_record\.source_edit_version/);
  assert.match(migration, /'valueThemes', themes/);
  assert.match(migration, /'deliveredWork', delivered_work/);
  assert.match(migration, /group by observations\.area/);
  assert.match(migration, /limit 5/);
  assert.match(reportRpc, /observations\.confidence in \('high', 'medium'\)/);
  assert.match(reportRpc, /observations\.review_state <> 'blocked'/);
  assert.match(reportRpc, /facts\.crawl_run_id = target_audit\.crawl_run_id/);
  assert.match(reportRpc, /artifacts\.crawl_run_id = target_audit\.crawl_run_id/);
  assert.doesNotMatch(reportRpc, /observations\.review_state = 'approved'/);
  assert.doesNotMatch(reportRpc, /Approve at least one/);
  assert.doesNotMatch(reportRpc, /selected by a human reviewer/);
  assert.match(reportRpc, /versions\.data#>>'\{redesign,attestationRowId\}'/);
  assert.match(reportRpc, /if report_id is not null then\s+return report_id;/);
  assert.match(
    migration,
    /This earlier report format must be regenerated before Clientspace preview/,
  );

  assert.match(previewWorker, /report\.schema_version !== 5/);
  assert.match(previewWorker, /verified_redesign_value/);
  assert.match(previewWorker, /source_release_attestations/);
  assert.match(previewWorker, /reportData\?\.valueThemes/);

  assert.match(releaseVerifier, /persistReleaseForReporting/);
  assert.match(releaseVerifier, /SITEFORGE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(releaseVerifier, /source_release_attestations/);
  assert.doesNotMatch(releaseVerifier, /VITE_SITEFORGE_SUPABASE_SERVICE_ROLE_KEY/);

  assert.match(reportParser, /prospectValueReportSchemaVersion = 5/);
  assert.match(reportParser, /reportUsesProspectValueContract/);
  assert.match(reportParser, /redesign\.status === 'passed'/);

  assert.match(localRepository, /'sourceReleaseAttestations'/);
  assert.match(localRepository, /report\.schemaVersion === 5/);
  assert.match(localRepository, /observation\.confidence !== 'low'/);
  assert.match(localRepository, /observation\.reviewState !== 'blocked'/);
  assert.match(localRepository, /observation\.area !== 'Platform'/);
  assert.match(localRepository, /report\.data\?\.reportKind === 'verified_redesign_value'/);
  assert.match(localRepository, /if \(existing\) return existing/);
  assert.match(localRepository, /id: `report-version-\$\{audit\.id\}-\$\{release\.id\}`/);
});
