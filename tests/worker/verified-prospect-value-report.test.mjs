import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826280000_client_friendly_visual_value_reports.sql',
  import.meta.url,
);
const demonstrableMigrationUrl = new URL(
  '../../supabase/migrations/20260826290000_visually_demonstrable_client_report_themes.sql',
  import.meta.url,
);
const highPriorityMigrationUrl = new URL(
  '../../supabase/migrations/20260826300000_high_priority_visual_client_report_themes.sql',
  import.meta.url,
);
const comparisonMigrationUrl = new URL(
  '../../supabase/migrations/20260826320000_verified_design_comparison_reports.sql',
  import.meta.url,
);
const readyComparisonMigrationUrl = new URL(
  '../../supabase/migrations/20260826330000_verified_page_ready_comparison_reports.sql',
  import.meta.url,
);
const previewWorkerUrl = new URL('../../worker/report-preview-worker.mjs', import.meta.url);
const releaseVerifierUrl = new URL('../../scripts/verify-prospect-release.mjs', import.meta.url);
const reportParserUrl = new URL('../../src/lib/prospect-value-report.ts', import.meta.url);
const localRepositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const cloudRepositoryUrl = new URL('../../src/lib/cloud-repository.ts', import.meta.url);
const automatedReportPanelUrl = new URL(
  '../../src/components/AutomatedReportPanel.tsx',
  import.meta.url,
);

test('freezes prospect reports against the exact verified edited website', async () => {
  const [
    migration,
    previewWorker,
    releaseVerifier,
    reportParser,
    localRepository,
    cloudRepository,
    automatedReportPanel,
    demonstrableMigration,
    highPriorityMigration,
    comparisonMigration,
    readyComparisonMigration,
  ] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(previewWorkerUrl, 'utf8'),
    readFile(releaseVerifierUrl, 'utf8'),
    readFile(reportParserUrl, 'utf8'),
    readFile(localRepositoryUrl, 'utf8'),
    readFile(cloudRepositoryUrl, 'utf8'),
    readFile(automatedReportPanelUrl, 'utf8'),
    readFile(demonstrableMigrationUrl, 'utf8'),
    readFile(highPriorityMigrationUrl, 'utf8'),
    readFile(comparisonMigrationUrl, 'utf8'),
    readFile(readyComparisonMigrationUrl, 'utf8'),
  ]);
  const reportRpc = migration.slice(
    migration.indexOf('create or replace function public.create_audit_report_version'),
    migration.indexOf('create or replace function public.request_report_preview'),
  );

  assert.match(migration, /'schemaVersion', 6/);
  assert.match(migration, /'reportKind', 'verified_redesign_value'/);
  assert.match(migration, /create_audit_report_version_v5/);
  assert.match(migration, /'redesign', v5_report\.data->'redesign'/);
  assert.match(migration, /'valueThemes', themes/);
  assert.match(migration, /'deliveredWork', delivered_work/);
  assert.match(migration, /limit 3/);
  assert.match(migration, /artifacts\.metadata->>'sourceUrl' = any\(observations\.source_urls\)/);
  assert.match(migration, /viewport,width/);
  assert.match(migration, /viewport,height/);
  assert.match(migration, /'whatToNotice'/);
  assert.match(migration, /'designPriority'/);
  assert.match(migration, /'internalEvidence'/);
  assert.match(migration, /'internalTechnicalEvidence'/);
  assert.match(migration, /'editedSiteProof', null/);
  assert.match(reportRpc, /observations\.confidence in \('high', 'medium'\)/);
  assert.match(reportRpc, /observations\.review_state <> 'blocked'/);
  assert.match(reportRpc, /artifacts\.crawl_run_id = v5_report\.crawl_run_id/);
  assert.doesNotMatch(reportRpc, /observations\.review_state = 'approved'/);
  assert.doesNotMatch(reportRpc, /Approve at least one/);
  assert.doesNotMatch(reportRpc, /selected by a human reviewer/);
  assert.match(reportRpc, /versions\.data#>>'\{redesign,attestationRowId\}'/);
  assert.match(reportRpc, /if report_id is not null then\s+return report_id;/);
  assert.match(
    migration,
    /This earlier report format must be regenerated before Clientspace preview/,
  );

  assert.match(previewWorker, /report\.schema_version !== 8/);
  assert.match(previewWorker, /verified_redesign_value/);
  assert.match(previewWorker, /source_release_attestations/);
  assert.match(previewWorker, /reportData\?\.valueThemes/);

  assert.match(releaseVerifier, /persistReleaseForReporting/);
  assert.match(releaseVerifier, /SITEFORGE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(releaseVerifier, /source_release_attestations/);
  assert.doesNotMatch(releaseVerifier, /VITE_SITEFORGE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(releaseVerifier, /return \{ status: 'unavailable' \}/);
  assert.match(releaseVerifier, /Studio cannot save its release record for reporting/);
  assert.match(releaseVerifier, /persistDesignComparisonScreenshots/);
  assert.match(releaseVerifier, /siteforge-source-url/);
  assert.match(releaseVerifier, /release-comparisons/);
  assert.match(releaseVerifier, /waitForComparisonPageReady/);
  assert.match(releaseVerifier, /verified-comparison-page-ready-v1/);
  assert.match(releaseVerifier, /loaderVisible/);
  assert.match(releaseVerifier, /horizontalOverflowPx > 1/);

  assert.match(reportParser, /prospectValueReportSchemaVersion = 8/);
  assert.match(reportParser, /reportUsesProspectValueContract/);
  assert.match(reportParser, /redesign\.status === 'passed'/);

  assert.match(localRepository, /'sourceReleaseAttestations'/);
  assert.match(localRepository, /report\.schemaVersion === 8/);
  assert.match(localRepository, /observation\.confidence !== 'low'/);
  assert.match(localRepository, /observation\.reviewState !== 'blocked'/);
  assert.match(localRepository, /observation\.area !== 'Platform'/);
  assert.match(localRepository, /report\.data\?\.reportKind === 'verified_redesign_value'/);
  assert.match(localRepository, /if \(existing\) return existing/);
  assert.match(
    localRepository,
    /id: `report-version-v8-ready-design-comparison-\$\{audit\.id\}-\$\{release\.id\}`/,
  );
  assert.match(localRepository, /\.slice\(0, 3\)/);
  assert.match(localRepository, /observation\.sourceUrls\.includes\(sourceUrl\)/);
  assert.match(localRepository, /artifactViewport\.width === viewport\.width/);
  assert.match(localRepository, /artifactViewport\.height === viewport\.height/);
  assert.match(localRepository, /afterEvidence/);
  assert.match(localRepository, /designPriority/);
  assert.match(localRepository, /observation\.severity === 'high'/);
  assert.match(localRepository, /verified-ready-design-comparison-v2/);

  assert.match(demonstrableMigration, /finding_class = 'observed_defect'/);
  assert.match(demonstrableMigration, /screenshot-demonstrable-v2/);
  assert.match(demonstrableMigration, /create_audit_report_version_v6_unfiltered/);
  assert.match(highPriorityMigration, /observations\.severity = 'high'/);
  assert.match(highPriorityMigration, /high-priority-screenshot-v3/);
  assert.match(comparisonMigration, /'schemaVersion', 7/);
  assert.match(comparisonMigration, /verified-design-comparison-v1/);
  assert.match(comparisonMigration, /afterEvidence/);
  assert.match(comparisonMigration, /requiresSameViewport/);
  assert.match(comparisonMigration, /target_report\.schema_version <> 7/);
  assert.match(readyComparisonMigration, /'schemaVersion', 8/);
  assert.match(readyComparisonMigration, /verified-ready-design-comparison-v2/);
  assert.match(readyComparisonMigration, /verified-comparison-page-ready-v1/);
  assert.match(readyComparisonMigration, /loaderVisible/);
  assert.match(readyComparisonMigration, /horizontalOverflowPx/);
  assert.match(readyComparisonMigration, /target_report\.schema_version <> 8/);

  assert.match(cloudRepository, /sourceReleaseAttestationAvailability/);
  assert.match(cloudRepository, /PGRST205/);
  assert.match(cloudRepository, /schema_unavailable/);
  assert.match(automatedReportPanel, /Studio update required/);
  assert.match(automatedReportPanel, /not asking for another verification/);
  assert.match(automatedReportPanel, /!releaseReady && !releaseSchemaUnavailable/);
});
