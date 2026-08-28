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
const agentReportMigrationUrl = new URL(
  '../../supabase/migrations/20260826340000_agent_curated_report_generation_jobs.sql',
  import.meta.url,
);
const reportUsageMigrationUrl = new URL(
  '../../supabase/migrations/20260826350000_report_generation_ai_usage_source.sql',
  import.meta.url,
);
const designShowcaseMigrationUrl = new URL(
  '../../supabase/migrations/20260826360000_design_showcase_value_reports.sql',
  import.meta.url,
);
const reportGenerationWorkerUrl = new URL(
  '../../worker/report-generation-worker.mjs',
  import.meta.url,
);
const reportAgentContractUrl = new URL(
  '../../worker/contracts/client-value-report-agent.md',
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
    agentReportMigration,
    reportGenerationWorker,
    reportAgentContract,
    reportUsageMigration,
    designShowcaseMigration,
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
    readFile(agentReportMigrationUrl, 'utf8'),
    readFile(reportGenerationWorkerUrl, 'utf8'),
    readFile(reportAgentContractUrl, 'utf8'),
    readFile(reportUsageMigrationUrl, 'utf8'),
    readFile(designShowcaseMigrationUrl, 'utf8'),
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

  assert.match(previewWorker, /report\.schema_version !== 10/);
  assert.match(previewWorker, /gpt-5\.6-sol-design-showcase-v2/);
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

  assert.match(reportParser, /prospectValueReportSchemaVersion = 10/);
  assert.match(reportParser, /gpt-5\.6-sol-design-showcase-v2/);
  assert.match(reportParser, /reportUsesProspectValueContract/);
  assert.match(reportParser, /redesign\.status === 'passed'/);

  assert.match(localRepository, /'sourceReleaseAttestations'/);
  assert.match(localRepository, /observation\.confidence !== 'low'/);
  assert.match(localRepository, /observation\.reviewState !== 'blocked'/);
  assert.match(localRepository, /observation\.area !== 'Platform'/);
  assert.match(localRepository, /report\.data\?\.reportKind === 'verified_redesign_value'/);
  assert.match(localRepository, /if \(existing\) return;/);
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

  assert.match(agentReportMigration, /create table public\.report_generation_jobs/);
  assert.match(
    agentReportMigration,
    /status in \('queued', 'running', 'ready', 'failed', 'cancelled'\)/,
  );
  assert.match(
    agentReportMigration,
    /create or replace function public\.request_report_generation/,
  );
  assert.match(agentReportMigration, /create or replace function public\.cancel_report_generation/);
  assert.match(agentReportMigration, /error_code text/);
  assert.match(
    agentReportMigration,
    /unique \(business_id, audit_id, release_attestation_id, generator_contract_version\)/,
  );
  assert.match(agentReportMigration, /for update/);
  assert.match(agentReportMigration, /Members can view report generation jobs/);
  assert.match(agentReportMigration, /target_report\.schema_version <> 9/);
  assert.match(agentReportMigration, /gpt-5\.6-sol-design-curation-v1/);
  assert.match(designShowcaseMigration, /client-value-report-agent-v2/);
  assert.match(designShowcaseMigration, /schema_version <> 10/);
  assert.match(designShowcaseMigration, /gpt-5\.6-sol-design-showcase-v2/);
  assert.match(designShowcaseMigration, /majorFindings/);
  assert.match(designShowcaseMigration, /designDecisions/);
  assert.match(designShowcaseMigration, /technologyFoundation,technologies/);
  assert.match(reportGenerationWorker, /const defaultModel = 'gpt-5\.6-sol'/);
  assert.match(reportGenerationWorker, /const reasoningEffort = 'max'/);
  assert.match(reportGenerationWorker, /forced_login_method="chatgpt"/);
  assert.match(reportGenerationWorker, /TMPDIR: temporaryDirectory/);
  assert.match(reportGenerationWorker, /codexFailureDetail\(events, stderr, exit\)/);
  assert.doesNotMatch(reportGenerationWorker, /uniqueItems/);
  assert.match(reportGenerationWorker, /new Set\(candidateIds\)\.size !== candidateIds\.length/);
  assert.match(reportGenerationWorker, /--output-schema/);
  assert.match(reportGenerationWorker, /--image/);
  assert.match(reportGenerationWorker, /arguments_\.push\('-'\)/);
  assert.match(reportGenerationWorker, /child\.stdin\.end\(prompt\)/);
  assert.match(
    reportGenerationWorker,
    /Candidate records: \$\{JSON\.stringify\(candidateRecords\)\}/,
  );
  assert.match(reportGenerationWorker, /const maximumModelRunMs = 20 \* 60_000/);
  assert.match(reportGenerationWorker, /Codex report selection timed out after twenty minutes/);
  assert.match(reportGenerationWorker, /billingMode: 'chatgpt_subscription'/);
  assert.doesNotMatch(reportGenerationWorker, /OPENAI_API_KEY/);
  assert.doesNotMatch(reportGenerationWorker, /SITEFORGE_REPORT_SELECTION_API_KEY/);
  assert.match(reportGenerationWorker, /minItems: 0/);
  assert.match(reportGenerationWorker, /maxItems: 4/);
  assert.match(reportGenerationWorker, /themes\.length < 1 \|\| themes\.length > 4/);
  assert.match(reportGenerationWorker, /source: 'client_value_report_selection'/);
  assert.match(reportUsageMigration, /'client_value_report_selection'/);
  assert.match(reportGenerationWorker, /progress_phase: 'analysing_comparisons'/);
  assert.match(reportGenerationWorker, /progress_phase: 'validating_selection'/);
  assert.match(reportGenerationWorker, /technologyFoundation/);
  assert.match(releaseVerifier, /verifiedTechnologyFoundation/);
  assert.match(reportGenerationWorker, /error_code: errorCode/);
  assert.doesNotMatch(reportGenerationWorker, /severityRank/);
  assert.match(reportAgentContract, /Website transformation report agent v2/i);
  assert.match(reportAgentContract, /three to six distinct major findings/i);
  assert.match(
    reportAgentContract,
    /strongest natural set of one to four before-and-after comparisons/i,
  );
  assert.match(reportAgentContract, /medium-severity issue may be selected/i);
  assert.match(reportAgentContract, /never claim guaranteed traffic/i);
  assert.doesNotMatch(releaseVerifier, /\.eq\('severity', 'high'\)/);

  assert.match(cloudRepository, /sourceReleaseAttestationAvailability/);
  assert.match(cloudRepository, /PGRST205/);
  assert.match(cloudRepository, /schema_unavailable/);
  assert.match(cloudRepository, /request_report_generation/);
  assert.match(cloudRepository, /cancel_report_generation/);
  assert.match(automatedReportPanel, /Studio update required/);
  assert.match(automatedReportPanel, /not asking for another verification/);
  assert.match(automatedReportPanel, /!releaseReady && !releaseSchemaUnavailable/);
});
