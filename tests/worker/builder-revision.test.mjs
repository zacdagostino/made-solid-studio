import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  apiCreditsBillingMode,
  writeRuntimeAiBillingMode,
} from '../../scripts/runtime-ai-billing.mjs';
import {
  applyLocalDevelopmentHandoff,
  copyLocalDevelopmentSource,
} from '../../worker/local-development-handoff.mjs';
import {
  BuilderAssetError,
  BuilderInputError,
  BuilderManifestError,
  activateCompactNavigationTrigger,
  approvedAssetDescriptor,
  approvedImageUsageProblems,
  applicableFeatureContracts,
  assertRequiredCompiledOutputs,
  assetMatchesSelectedPages,
  buildContextSummary,
  buildPrompt,
  builderCodexAuthentication,
  builderCodexEnvironment,
  builderExecutionProfile,
  canContinueWithoutCodex,
  checkpointSourceBody,
  codexFailureFromEvent,
  collectBrowsableSourceFiles,
  contentTypeFor,
  contextualLogoProblems,
  creativeAutonomyProblems,
  cssColourRepresentations,
  designSystemRhythmProblems,
  enforceBrandPaletteTokens,
  expressiveNavigationMotionProblems,
  failureDetails,
  fetchWithRequestTimeout,
  groupApprovedAssetsByContent,
  inconsistentHeaderNavigationProblems,
  lockedFoundationPaths,
  meaningfulPageNamingProblems,
  mobileNavigationTriggerProblems,
  missingInternalNavigationTargets,
  motionCompositionProblems,
  normaliseSemanticText,
  responsiveImageProblems,
  scrollbarStylingProblems,
  multiPageHeaderRouteNavigationProblems,
  projectManifestData,
  refreshLockedFoundation,
  restoreCheckpointFile,
  revisionManifestCompatible,
  selectedSourcePages,
  sourceCheckpointPayload,
  stageRevisionScope,
  unreachableSelectedPageProblems,
} from '../../worker/builder-worker.mjs';

const appUrl = new URL('../../src/App.tsx', import.meta.url);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const cloudRepositoryUrl = new URL('../../src/lib/cloud-repository.ts', import.meta.url);
const agentsInstructionsUrl = new URL('../../AGENTS.md', import.meta.url);
const componentArchitectureContractUrl = new URL(
  '../../worker/builder-template/feature-contracts/component-architecture.md',
  import.meta.url,
);
const mobileNavigationContractUrl = new URL(
  '../../worker/builder-template/feature-contracts/mobile-navigation.md',
  import.meta.url,
);
const motionRuntimeUrl = new URL(
  '../../worker/builder-template/src/components/foundation/site-runtime.tsx',
  import.meta.url,
);
const compatibleFullBuildMigrationUrl = new URL(
  '../../supabase/migrations/20260728140000_compatible_homepage_for_full_build.sql',
  import.meta.url,
);
const markdownStorageMigrationUrl = new URL(
  '../../supabase/migrations/20260728143000_allow_private_build_markdown.sql',
  import.meta.url,
);
const agentStudioSiteTestMigrationUrl = new URL(
  '../../supabase/migrations/20260729100000_agent_studio_site_test_versions.sql',
  import.meta.url,
);
const pageSetTestMigrationUrl = new URL(
  '../../supabase/migrations/20260729140000_page_set_test_builds.sql',
  import.meta.url,
);
const builderSourceTextMigrationUrl = new URL(
  '../../supabase/migrations/20260729150000_allow_builder_source_text.sql',
  import.meta.url,
);
const postCodexResumeMigrationUrl = new URL(
  '../../supabase/migrations/20260731120000_resume_builder_post_codex_checkpoint.sql',
  import.meta.url,
);
const decimalPackageVersionMigrationUrl = new URL(
  '../../supabase/migrations/20260731130000_agent_package_decimal_versions.sql',
  import.meta.url,
);
const creativeCompositionPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260801120000_creative_composition_test_package.sql',
  import.meta.url,
);
const expressiveCraftPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802120000_expressive_craft_test_package.sql',
  import.meta.url,
);
const resilientQualityPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802130000_resilient_browser_quality_test_package.sql',
  import.meta.url,
);
const immersiveMotionPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802140000_immersive_motion_test_package.sql',
  import.meta.url,
);
const resilientResumePackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802150000_resilient_resume_test_package.sql',
  import.meta.url,
);
const meaningfulPageNamesPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802160000_meaningful_page_names_test_package.sql',
  import.meta.url,
);
const cleanTestStartPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802170000_clean_test_start_package.sql',
  import.meta.url,
);
const preciseLogoHandoffPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802180000_precise_logo_handoff_package.sql',
  import.meta.url,
);
const validPreviewEntryPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260802190000_valid_preview_entry_package.sql',
  import.meta.url,
);
const responsiveIntroCraftPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260804150000_responsive_intro_craft_test_package.sql',
  import.meta.url,
);
const immediateBrandIntroductionPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260804170000_immediate_brand_introduction_test_package.sql',
  import.meta.url,
);
const efficientBuilderExecutionPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260804190000_efficient_builder_execution_test_package.sql',
  import.meta.url,
);
const decodedNavigationLogoPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260804210000_decoded_navigation_logo_test_package.sql',
  import.meta.url,
);
const creativeAutonomyPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260804230000_creative_autonomy_test_package.sql',
  import.meta.url,
);
const selectedRouteCompilePackageMigrationUrl = new URL(
  '../../supabase/migrations/20260805010000_selected_route_compile_test_package.sql',
  import.meta.url,
);
const completeCheckpointRestorePackageMigrationUrl = new URL(
  '../../supabase/migrations/20260805030000_complete_checkpoint_restore_test_package.sql',
  import.meta.url,
);
const reliableCompactNavigationPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260806090000_reliable_compact_navigation_test_package.sql',
  import.meta.url,
);
const builderWorkerLivenessMigrationUrl = new URL(
  '../../supabase/migrations/20260806103000_builder_worker_liveness.sql',
  import.meta.url,
);
const checkpointQualityRecheckMigrationUrl = new URL(
  '../../supabase/migrations/20260806120000_checkpoint_quality_recheck_test_package.sql',
  import.meta.url,
);
const immediateNavigationSequenceMigrationUrl = new URL(
  '../../supabase/migrations/20260806153000_immediate_navigation_sequence_test_package.sql',
  import.meta.url,
);
const mobileViewportIntegrityMigrationUrl = new URL(
  '../../supabase/migrations/20260806170000_mobile_viewport_integrity_test_package.sql',
  import.meta.url,
);
const actionableBuilderFailureMigrationUrl = new URL(
  '../../supabase/migrations/20260806180000_actionable_builder_failure_test_package.sql',
  import.meta.url,
);
const boundedBuilderRequestsMigrationUrl = new URL(
  '../../supabase/migrations/20260806203000_bounded_builder_requests_test_package.sql',
  import.meta.url,
);
const viewportChecksOnlyMigrationUrl = new URL(
  '../../supabase/migrations/20260807113000_viewport_checks_without_captures_test_package.sql',
  import.meta.url,
);
const localRefinementHandoffMigrationUrl = new URL(
  '../../supabase/migrations/20260807143000_local_refinement_handoff_test_package.sql',
  import.meta.url,
);
const accentOnlyBrandMigrationUrl = new URL(
  '../../supabase/migrations/20260808120000_accent_only_brand_test_package.sql',
  import.meta.url,
);
const codespaceWorkspaceMigrationUrl = new URL(
  '../../supabase/migrations/20260808121000_codespace_editing_workspace_test_package.sql',
  import.meta.url,
);
const codespaceStartupReliabilityMigrationUrl = new URL(
  '../../supabase/migrations/20260808123000_codespace_startup_reliability_test_package.sql',
  import.meta.url,
);
const codespaceSetupOrderingMigrationUrl = new URL(
  '../../supabase/migrations/20260808124000_codespace_setup_ordering_test_package.sql',
  import.meta.url,
);
const logoAccentRegionsMigrationUrl = new URL(
  '../../supabase/migrations/20260808122000_logo_accent_regions_test_package.sql',
  import.meta.url,
);
const builderDerivedColoursMigrationUrl = new URL(
  '../../supabase/migrations/20260808133000_builder_derived_brand_colours.sql',
  import.meta.url,
);
const persistentCodespaceTmuxMigrationUrl = new URL(
  '../../supabase/migrations/20260808134000_persistent_codespace_tmux_test_package.sql',
  import.meta.url,
);
const optionalSvgGenerationMigrationUrl = new URL(
  '../../supabase/migrations/20260808140000_optional_svg_generation_test_package.sql',
  import.meta.url,
);
const codespaceResumeStartupMigrationUrl = new URL(
  '../../supabase/migrations/20260810100000_codespace_resume_startup_test_package.sql',
  import.meta.url,
);
const subscriptionBuilderPackageMigrationUrl = new URL(
  '../../supabase/migrations/20260817190000_subscription_builder_runtime_test_package.sql',
  import.meta.url,
);
const visibleCodespaceSetupMigrationUrl = new URL(
  '../../supabase/migrations/20260810110000_visible_codespace_setup_test_package.sql',
  import.meta.url,
);
const noninteractiveCodexInstallMigrationUrl = new URL(
  '../../supabase/migrations/20260810130000_noninteractive_codex_install_test_package.sql',
  import.meta.url,
);
const embeddedProspectWorkspaceMigrationUrl = new URL(
  '../../supabase/migrations/20260810140000_embedded_prospect_workspace_test_package.sql',
  import.meta.url,
);
const oneClickProspectWorkspaceMigrationUrl = new URL(
  '../../supabase/migrations/20260810150000_one_click_prospect_workspace_test_package.sql',
  import.meta.url,
);
const immediateSourceWorkspaceMigrationUrl = new URL(
  '../../supabase/migrations/20260810160000_immediate_source_workspace_test_package.sql',
  import.meta.url,
);
const automaticWebsiteLaunchMigrationUrl = new URL(
  '../../supabase/migrations/20260810170000_automatic_website_launch_test_package.sql',
  import.meta.url,
);
const codespacesPreviewUrlMigrationUrl = new URL(
  '../../supabase/migrations/20260810180000_codespaces_preview_url_test_package.sql',
  import.meta.url,
);
const liveRefinementLedgerMigrationUrl = new URL(
  '../../supabase/migrations/20260810190000_live_refinement_ledger_test_package.sql',
  import.meta.url,
);
const resilientRefinementLedgerMigrationUrl = new URL(
  '../../supabase/migrations/20260810200000_resilient_refinement_ledger_test_package.sql',
  import.meta.url,
);
const editingHandoffPagesMigrationUrl = new URL(
  '../../supabase/migrations/20260810210000_editing_handoff_pages_test_package.sql',
  import.meta.url,
);
const resilientFinalEditMigrationUrl = new URL(
  '../../supabase/migrations/20260810220000_resilient_final_edit_test_package.sql',
  import.meta.url,
);
const editVersionHistoryMigrationUrl = new URL(
  '../../supabase/migrations/20260810230000_edit_version_history_test_package.sql',
  import.meta.url,
);
const agentLearningInboxMigrationUrl = new URL(
  '../../supabase/migrations/20260811100000_agent_learning_inbox_test_package.sql',
  import.meta.url,
);
const agentStudioWebsiteToneMigrationUrl = new URL(
  '../../supabase/migrations/20260811120000_agent_studio_website_tone_test_package.sql',
  import.meta.url,
);
const madeSolidHandoffMigrationUrl = new URL(
  '../../supabase/migrations/20260811130000_made_solid_handoff_test_package.sql',
  import.meta.url,
);
const optionalHandoffSchemaMigrationUrl = new URL(
  '../../supabase/migrations/20260811140000_optional_handoff_schema_test_package.sql',
  import.meta.url,
);
const handoffWorkerLivenessMigrationUrl = new URL(
  '../../supabase/migrations/20260811150000_made_solid_handoff_worker_liveness_test_package.sql',
  import.meta.url,
);
const cleanAlternateTestMigrationUrl = new URL(
  '../../supabase/migrations/20260811160000_clean_alternate_test_package.sql',
  import.meta.url,
);
const canonicalAssetHandoffMigrationUrl = new URL(
  '../../supabase/migrations/20260811170000_canonical_asset_handoff_test_package.sql',
  import.meta.url,
);
const capturedHandoffEmailMigrationUrl = new URL(
  '../../supabase/migrations/20260811190000_captured_handoff_email_test_package.sql',
  import.meta.url,
);
const automaticClientspacePreviewMigrationUrl = new URL(
  '../../supabase/migrations/20260811200000_automatic_clientspace_preview_test_package.sql',
  import.meta.url,
);
const automaticProspectDomainMigrationUrl = new URL(
  '../../supabase/migrations/20260811210000_automatic_prospect_domain_test_package.sql',
  import.meta.url,
);
const editableHandoffRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260811220000_editable_handoff_recovery_test_package.sql',
  import.meta.url,
);
const pageDispositionMigrationUrl = new URL(
  '../../supabase/migrations/20260813100000_reviewed_page_dispositions_test_package.sql',
  import.meta.url,
);
const websiteToneDirectionMigrationUrl = new URL(
  '../../supabase/migrations/20260810120000_website_tone_direction_test_package.sql',
  import.meta.url,
);
const codexTranscriptPositionMigrationUrl = new URL(
  '../../supabase/migrations/20260817150000_codex_transcript_position_test_package.sql',
  import.meta.url,
);
const preserveResumeContextMigrationUrl = new URL(
  '../../supabase/migrations/20260731123000_preserve_builder_resume_context.sql',
  import.meta.url,
);
const previewFrameUrl = new URL('../../src/PreviewFrame.tsx', import.meta.url);
const previewFunctionUrl = new URL(
  '../../supabase/functions/siteforge-preview/index.ts',
  import.meta.url,
);

const manifest = {
  data: {
    selectedPages: [
      { url: 'https://example.com/', title: 'Home' },
      { url: 'https://example.com/services', title: 'Services' },
    ],
  },
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('classifies restored generated files against the clean template for durable child checkpoints', () => {
  const templateBody = Buffer.from('locked foundation');
  const generatedBody = Buffer.from('generated page');
  const payload = sourceCheckpointPayload(
    [
      {
        relativePath: 'components/foundation/site-runtime.tsx',
        hash: sha256(templateBody),
      },
      { relativePath: 'app/page.tsx', hash: sha256(generatedBody) },
    ],
    new Map([['components/foundation/site-runtime.tsx', sha256(templateBody)]]),
  );
  assert.deepEqual(
    payload.files.map(({ path, source }) => ({ path, source })),
    [
      { path: 'app/page.tsx', source: 'checkpoint' },
      { path: 'components/foundation/site-runtime.tsx', source: 'template' },
    ],
  );
});

test('rejects stale checkpoint manifests and stores future manifests immutably', async () => {
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(worker, /files\.length !== recordedFileCount/);
  assert.match(worker, /restoreLegacyDraftFiles\(/);
  assert.match(worker, /checkpoint\/\$\{hash\}\/source-manifest\.json/);
});

function compiledPreviewFunction(source, name, firstName = name) {
  const start = source.indexOf(`function ${firstName}`);
  const targetStart = source.indexOf(`function ${name}`, start);
  const end = source.indexOf('\n}\n', targetStart);
  assert.notEqual(start, -1);
  assert.notEqual(targetStart, -1);
  assert.notEqual(end, -1);
  const compiled = ts.transpileModule(source.slice(start, end + 2), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(`${compiled}\nreturn ${name};`)();
}

function checkpointFallbackClient({ generatedBody }) {
  const staleDraft = Buffer.from('stale starter document');
  return {
    from(table) {
      assert.equal(table, 'builder_artifacts');
      const filters = {};
      const query = {
        select() {
          return query;
        },
        eq(field, value) {
          filters[field] = value;
          return query;
        },
        order() {
          return query;
        },
        async limit() {
          assert.equal(filters.builder_run_id, 'run-homepage');
          assert.equal(filters.kind, 'site_file');
          assert.equal(filters.label, 'index.html');
          return {
            data: [
              {
                storage_bucket: 'private-artifacts',
                storage_path: 'organisation/builder-runs/run-homepage/site/index.html',
              },
            ],
            error: null,
          };
        },
      };
      return query;
    },
    storage: {
      from() {
        return {
          async download(path) {
            return {
              data: new Blob([path.endsWith('/site/index.html') ? generatedBody : staleDraft]),
              error: null,
            };
          },
        };
      },
    },
  };
}

test('keeps a browsable project tree without dependencies or compiled output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-browsable-source-'));
  try {
    await Promise.all([
      mkdir(join(directory, 'src', 'app'), { recursive: true }),
      mkdir(join(directory, 'public', 'assets'), { recursive: true }),
      mkdir(join(directory, '.next', 'static'), { recursive: true }),
      mkdir(join(directory, 'out'), { recursive: true }),
      mkdir(join(directory, 'node_modules', 'example'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(directory, 'package.json'), '{}'),
      writeFile(join(directory, '.env'), 'PRIVATE_TOKEN=do-not-save'),
      writeFile(join(directory, 'build.log'), 'private diagnostics'),
      writeFile(join(directory, 'tsconfig.tsbuildinfo'), 'generated type cache'),
      writeFile(join(directory, 'src', 'app', 'page.tsx'), 'export default function Page() {}'),
      writeFile(join(directory, 'public', 'robots.txt'), 'User-agent: *'),
      writeFile(join(directory, 'public', 'assets', 'private-logo.avif'), 'asset'),
      writeFile(join(directory, '.next', 'static', 'chunk.js'), 'compiled'),
      writeFile(join(directory, 'out', 'index.html'), '<main />'),
      writeFile(join(directory, 'node_modules', 'example', 'index.js'), 'dependency'),
    ]);

    const files = (await collectBrowsableSourceFiles(directory))
      .map((file) => file.slice(directory.length + 1))
      .sort();

    assert.deepEqual(files, ['package.json', 'public/robots.txt', 'src/app/page.tsx']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('restores an immutable generated file when a legacy draft object is stale', async () => {
  const generatedBody = Buffer.from('<main><h1>Current private homepage</h1></main>');
  const body = await checkpointSourceBody(
    checkpointFallbackClient({ generatedBody }),
    { id: 'run-homepage', organization_id: 'organisation' },
    'index.html',
    { hash: sha256(generatedBody) },
  );

  assert.deepEqual(body, generatedBody);
});

test('does not accept a generated-file fallback that fails checkpoint integrity', async () => {
  const expectedBody = Buffer.from('<main><h1>Expected homepage</h1></main>');
  await assert.rejects(
    checkpointSourceBody(
      checkpointFallbackClient({ generatedBody: Buffer.from('tampered generated file') }),
      { id: 'run-homepage', organization_id: 'organisation' },
      'index.html',
      { hash: sha256(expectedBody) },
    ),
    /failed integrity validation/,
  );
});

test('restores a missing template-inherited checkpoint file from its exact saved body', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-template-checkpoint-'));
  const expectedBody = Buffer.from('export const inherited = true;');
  const client = {
    storage: {
      from() {
        return {
          async download() {
            return { data: new Blob([expectedBody]), error: null };
          },
        };
      },
    },
    from() {
      throw new Error('The hash-addressed checkpoint body should resolve before fallback lookup.');
    },
  };
  try {
    const restored = await restoreCheckpointFile(
      client,
      { id: 'run-template', organization_id: 'organisation' },
      directory,
      'components/site/site-footer.tsx',
      { hash: sha256(expectedBody), source: 'template' },
    );

    assert.equal(restored, true);
    assert.deepEqual(
      await readFile(join(directory, 'components', 'site', 'site-footer.tsx')),
      expectedBody,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('resolves clean preview links without changing the preview capability root', async () => {
  const [previewFrame, previewFunction] = await Promise.all([
    readFile(previewFrameUrl, 'utf8'),
    readFile(previewFunctionUrl, 'utf8'),
  ]);

  assert.match(previewFrame, /function previewCapabilityRoot\(source: URL\)/);
  assert.match(previewFrame, /parts\.indexOf\('siteforge-preview'\)/);
  assert.doesNotMatch(
    previewFrame,
    /source\.pathname\.slice\(0, source\.pathname\.lastIndexOf\('\/'\) \+ 1\)/,
  );
  assert.match(previewFunction, /function previewFileCandidates\(filePath: string\)/);
  assert.match(previewFunction, /candidates\.push\(`\$\{normalized\}\/index\.html`\)/);
  assert.match(previewFunction, /candidates\.push\(`\$\{normalized\}\.html`\)/);
  assert.match(
    previewFunction,
    /candidates\.push\(`\$\{normalized\.replaceAll\('\/', '--'\)\}\.html`\)/,
  );
  assert.match(previewFunction, /const response = await fetch\(documentUrl\)/);
  assert.match(previewFunction, /document\.write\(payload\.html\)/);
  assert.match(previewFunction, /if \(rawHref\.startsWith\('#'\)\)/);
  assert.match(previewFunction, /section\?\.scrollIntoView\(\{ block: 'start' \}\)/);
  assert.match(previewFunction, /siteforge-preview:navigated/);
  assert.match(previewFunction, /function rewritePreviewRootReferences/);
  assert.match(previewFunction, /rawHref\.startsWith\('\/'\)/);
  assert.doesNotMatch(previewFunction, /sf-preview-navigation__panel/);
  assert.match(previewFunction, /data-siteforge-preview-loading/);
  assert.match(previewFunction, /window\.addEventListener\('load', revealDocument/);
  assert.match(previewFrame, /message\.type === 'siteforge-preview:navigated'/);
});

test('accepts only exact private build capability roots from the configured preview origin', async () => {
  const previewFrame = await readFile(previewFrameUrl, 'utf8');
  const capabilityRoot = compiledPreviewFunction(previewFrame, 'privateBuildCapabilityRoot');
  const origin = 'https://preview.madesolid.com.au';
  const runId = '12345678-1234-1234-1234-123456789abc';
  const token = 'a'.repeat(64);

  for (const route of ['test', 'build', 'site']) {
    assert.equal(
      capabilityRoot(
        new URL(`${origin}/${route}/${runId}/${token}/services/?view=full#contact`),
        origin,
      ),
      `/${route}/${runId}/${token}/`,
    );
  }

  for (const invalidUrl of [
    `http://preview.madesolid.com.au/test/${runId}/${token}/`,
    `https://preview.madesolid.com.au.evil.example/test/${runId}/${token}/`,
    `https://preview.madesolid.com.au/review/${runId}/${token}/`,
    `https://preview.madesolid.com.au/test/not-a-uuid/${token}/`,
    `https://preview.madesolid.com.au/test/${runId}/${'a'.repeat(63)}/`,
    `https://preview.madesolid.com.au/test/${runId}/${'a'.repeat(65)}/`,
    `https://preview.madesolid.com.au/test/${runId}/${'a'.repeat(63)}z/`,
    `https://preview.madesolid.com.au/test//${runId}/${token}/`,
  ]) {
    assert.equal(capabilityRoot(new URL(invalidUrl), origin), undefined);
  }

  assert.equal(
    capabilityRoot(
      new URL(`https://user:password@preview.madesolid.com.au/test/${runId}/${token}/`),
      origin,
    ),
    undefined,
  );
  assert.equal(
    capabilityRoot(new URL(`${origin}/test/${runId}/${token}/`), `${origin}/unexpected-path`),
    undefined,
  );
});

test('keeps HTML, CSS, and Next hydration assets inside the private preview capability', async () => {
  const previewFunction = await readFile(previewFunctionUrl, 'utf8');
  const rewrite = compiledPreviewFunction(previewFunction, 'rewritePreviewRootReferences');
  const base = 'https://preview.example/functions/v1/siteforge-preview/run/token/';
  const source = [
    '<link rel="stylesheet" href="/_next/static/site.css">',
    '<img src="/assets/logo.png">',
    '<script>self.__next_f.push([1,\\"/_next/static/site.css\\"])</script>',
    '<script>self.__next_f.push([1,\\"/assets/hero.avif\\"])</script>',
    '<style>.hero{background:url("/assets/hero.avif")}</style>',
    '<a href="https://example.com/services">External service</a>',
  ].join('');
  const rewritten = rewrite(source, base);

  assert.match(rewritten, new RegExp(`href="${base}_next/static/site\\.css"`));
  assert.match(rewritten, new RegExp(`src="${base}assets/logo\\.png"`));
  assert.match(rewritten, new RegExp(`\\\\"${base}_next/static/site\\.css`));
  assert.match(rewritten, new RegExp(`\\\\"${base}assets/hero\\.avif`));
  assert.match(rewritten, new RegExp(`url\\("${base}assets/hero\\.avif"`));
  assert.match(rewritten, /href="https:\/\/example\.com\/services"/);
});

test('keeps the generated Next runtime available in the sandboxed fallback preview', async () => {
  const previewFunction = await readFile(previewFunctionUrl, 'utf8');
  const rewriteRuntime = compiledPreviewFunction(
    previewFunction,
    'rewritePreviewRuntimeReferences',
    'rewritePreviewRootReferences',
  );
  const base = 'https://preview.example/functions/v1/siteforge-preview/run/token/';
  const runtime = rewriteRuntime(
    'self.webpackChunk_N_E=[];s.p="/_next/";const logo="/assets/logo.png";',
    base,
  );
  assert.doesNotMatch(previewFunction, /function removeNextHydrationRuntime/);
  assert.match(
    previewFunction,
    /const rootedSource = rewritePreviewRootReferences\(source, base\)/,
  );
  assert.match(runtime, new RegExp(`s\\.p="${base}_next/"`));
  assert.match(runtime, new RegExp(`logo="${base}assets/logo\\.png"`));
  assert.match(previewFunction, /rewritePreviewRuntimeReferences\(await file\.text\(\), base\)/);
});

test('accepts clean generated routes and rejects unresolved navigation links', () => {
  const outputDirectory = '/private-build/out';
  const allFiles = [
    join(outputDirectory, 'index.html'),
    join(outputDirectory, 'our-services', 'index.html'),
    join(outputDirectory, 'post', 'maintenance-guide', 'index.html'),
  ];
  const valid = missingInternalNavigationTargets(
    [
      {
        relativePath: 'index.html',
        contents:
          '<a href="/our-services/">Services</a><a href="/post/maintenance-guide/#details">Guide</a>',
      },
    ],
    allFiles,
    outputDirectory,
  );
  const invalid = missingInternalNavigationTargets(
    [
      {
        relativePath: 'index.html',
        contents: '<a href="/missing/">Missing</a>',
      },
    ],
    allFiles,
    outputDirectory,
  );

  assert.deepEqual(valid, []);
  assert.equal(invalid.length, 1);
  assert.match(invalid[0], /does not resolve to a generated route/);
});

test('rejects unnamed pages and raw-path internal link labels', () => {
  const problems = meaningfulPageNamingProblems([
    {
      relativePath: 'blank/index.html',
      contents:
        '<html><head><title>Unnamed page | Acme</title></head><body><h1>Blank</h1><a href="/blank/">/blank</a></body></html>',
    },
  ]);
  assert.equal(problems.length, 3);
  assert.match(problems.join(' '), /placeholder page title/);
  assert.match(problems.join(' '), /placeholder H1/);
  assert.match(problems.join(' '), /placeholder text/);

  assert.deepEqual(
    meaningfulPageNamingProblems([
      {
        relativePath: 'blank/index.html',
        contents:
          '<html><head><title>Commercial maintenance | Acme</title></head><body><h1>Commercial maintenance</h1><a href="/blank/"><span>Maintenance services</span></a></body></html>',
      },
    ]),
    [],
  );
});

test('rejects a homepage header that replaces site pages with section anchors', () => {
  const sharedHeader = '<header><a href="/">Home</a><a href="/our-services/">Services</a></header>';
  const problems = inconsistentHeaderNavigationProblems([
    {
      relativePath: 'index.html',
      contents:
        '<header><a href="#top">Home</a><a href="#services">Services</a></header><main></main>',
    },
    { relativePath: 'our-services/index.html', contents: `${sharedHeader}<main></main>` },
    { relativePath: 'projects/index.html', contents: `${sharedHeader}<main></main>` },
  ]);

  assert.deepEqual(problems, [
    'index.html uses different primary header destinations from the rest of the generated site.',
  ]);
});

test('requires every multi-page header to use generated page routes instead of section shortcuts', () => {
  const validHeader = '<header><a href="/">Home</a><a href="/services/">Services</a></header>';
  const valid = multiPageHeaderRouteNavigationProblems([
    { relativePath: 'index.html', contents: `${validHeader}<main></main>` },
    { relativePath: 'services/index.html', contents: `${validHeader}<main></main>` },
  ]);
  const invalid = multiPageHeaderRouteNavigationProblems([
    {
      relativePath: 'index.html',
      contents: '<header><a href="#top">Home</a><a href="#services">Services</a></header>',
    },
    {
      relativePath: 'services/index.html',
      contents: '<header><a href="/">Home</a></header>',
    },
  ]);

  assert.deepEqual(valid, []);
  assert.equal(invalid.length, 3);
  assert.match(invalid.join(' '), /section shortcuts/);
  assert.match(invalid.join(' '), /does not link to any generated non-home page/);
});

test('requires intentional motion variety while accepting supported creative treatments', () => {
  assert.deepEqual(
    motionCompositionProblems([
      {
        relativePath: 'index.html',
        contents:
          '<h1 data-reveal="words">Heading</h1><div data-reveal="stagger"><article>One</article></div>',
      },
    ]),
    [],
  );
  const problems = motionCompositionProblems([
    { relativePath: 'index.html', contents: '<h1 data-reveal="spin">Heading</h1>' },
  ]);
  assert.match(problems.join(' '), /unsupported motion spin/);
  assert.match(problems.join(' '), /intentional element-motion choice/);
  assert.match(problems.join(' '), /at least two restrained motion treatments/);
});

test('requires expressive packages to animate beyond a single hero title', () => {
  const problems = motionCompositionProblems(
    [
      {
        relativePath: 'index.html',
        contents:
          '<h1 data-reveal="words">Heading</h1><p data-reveal="fade-up">Copy</p><div data-reveal="stagger"><a>One</a><a>Two</a></div>',
      },
    ],
    true,
  );
  assert.match(problems.join(' '), /at least four explicit elements or groups/);

  assert.deepEqual(
    motionCompositionProblems(
      [
        {
          relativePath: 'index.html',
          contents:
            '<h1 data-reveal="words">Heading</h1><p data-reveal="fade-up">Copy</p><div data-reveal="stagger"><a>One</a><a>Two</a></div><img data-reveal="scale" alt="Work">',
        },
      ],
      true,
    ),
    [],
  );
});

test('requires immersive packages to sequence text and reverse scroll depth on every route', () => {
  const base =
    '<h1 data-reveal="words">Heading</h1><p data-reveal="fade-up">Copy</p><div data-reveal="stagger"><a>One</a><a>Two</a></div><img data-reveal="scale" alt="Work">';
  const problems = motionCompositionProblems(
    [{ relativePath: 'index.html', contents: base }],
    true,
    true,
  );
  assert.match(problems.join(' '), /stacked text group sequentially/);
  assert.match(problems.join(' '), /reversible scroll-responsive depth container/);

  assert.deepEqual(
    motionCompositionProblems(
      [
        {
          relativePath: 'index.html',
          contents: `${base}<div data-reveal="sequence"><p>First</p><p>Second</p></div><figure data-scroll-zoom><img alt="Work"></figure>`,
        },
      ],
      true,
      true,
    ),
    [],
  );
});

test('requires creative-autonomy builds to author coordinated effects and reduced motion', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-creative-autonomy-'));
  try {
    await mkdir(join(directory, 'src', 'app'), { recursive: true });
    await writeFile(
      join(directory, 'src', 'app', 'page.tsx'),
      `export function ArtDirection() { return <main onPointerMove={() => undefined} data-scroll-depth><h1>About</h1></main>; }`,
    );
    await writeFile(
      join(directory, 'src', 'app', 'globals.css'),
      `:root { --font-display: ui-serif; } .story { position: sticky; clip-path: inset(0); } @media (prefers-reduced-motion: reduce) { .story { transform: none; } }`,
    );
    assert.deepEqual(await creativeAutonomyProblems(directory), []);
    await writeFile(
      join(directory, 'src', 'app', 'page.tsx'),
      `export function GenericPage() { return <main><h1>About</h1></main>; }`,
    );
    await writeFile(join(directory, 'src', 'app', 'globals.css'), `.story { color: black; }`);
    const problems = await creativeAutonomyProblems(directory);
    assert.equal(problems.length, 3);
    assert.match(problems.join(' '), /two coordinated authored effect families/i);
    assert.match(problems.join(' '), /typography system/i);
    assert.match(problems.join(' '), /prefers-reduced-motion/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('checks stable asynchronous and lazy raster image loading', () => {
  assert.deepEqual(
    responsiveImageProblems([
      {
        relativePath: 'index.html',
        contents:
          '<img src="/hero.jpg" width="1200" height="800" decoding="async"><img src="/detail.webp" width="800" height="600" decoding="async" loading="lazy">',
      },
    ]),
    [],
  );
  const problems = responsiveImageProblems([
    { relativePath: 'services/index.html', contents: '<img src="/tiny.jpg">' },
  ]);
  assert.match(problems.join(' '), /without stable dimensions/);
  assert.match(problems.join(' '), /without asynchronous decoding/);
});

test('keeps creative composition content-led without prescribing a testimonial template', async () => {
  const contract = await readFile(componentArchitectureContractUrl, 'utf8');
  assert.match(contract, /identify its actual content shape/i);
  assert.match(contract, /Do not add ordinal numbers unless sequence, rank, chronology/i);
  assert.match(contract, /Mobile is a distinct composition opportunity/i);
  assert.match(contract, /horizontal scroll-snap rails, accessible carousels/i);
  assert.match(contract, /oversized decorative quote glyph/i);
  assert.match(contract, /possibilities, not required templates/i);
  assert.match(contract, /avoid automatic rotation/i);
  assert.match(contract, /short subjective request as an outcome-level creative brief/i);
  assert.match(contract, /page-owned client components/i);
  assert.match(contract, /pointer-responsive light fields/i);
  assert.match(contract, /required runtime markers.*baseline vocabulary/i);
});

test('defines immersive motion, typography, service-page, and image craft requirements', async () => {
  const [componentContract, navigationContract, runtime] = await Promise.all([
    readFile(componentArchitectureContractUrl, 'utf8'),
    readFile(mobileNavigationContractUrl, 'utf8'),
    readFile(motionRuntimeUrl, 'utf8'),
  ]);
  assert.match(componentContract, /Typography and vertical rhythm/);
  assert.match(componentContract, /service page must have a route-specific hierarchy/i);
  assert.match(componentContract, /Choreograph the hero as a sequence/i);
  assert.match(componentContract, /data-reveal="sequence"/);
  assert.match(componentContract, /data-scroll-zoom/);
  assert.match(componentContract, /loading surface appears for every route/i);
  assert.match(componentContract, /Never stretch a thumbnail/i);
  assert.match(componentContract, /Lazy-load below-the-fold images/i);
  assert.match(navigationContract, /Animate both opening and closing/i);
  assert.match(navigationContract, /data-sf-navigation-motion/);
  assert.match(navigationContract, /data-sf-navigation-item/);
  assert.match(navigationContract, /max-width: 768px/);
  assert.match(navigationContract, /min-width: 769px/);
  assert.match(navigationContract, /data-siteforge-desktop-navigation/);
  assert.match(navigationContract, /data-siteforge-navigation-backdrop/);
  assert.match(navigationContract, /one shared close function/i);
  assert.match(navigationContract, /every decoded navigation item together/i);
  assert.match(navigationContract, /zero transition delay/i);
  assert.match(navigationContract, /do not show a nested scrollbar track/i);
  assert.match(runtime, /transform 1100ms cubic-bezier\(\.16,1,\.3,1\)/);
  assert.match(runtime, /function startNavigationMotion/);
  assert.match(runtime, /function startNavigationInteractions/);
  assert.match(runtime, /@media \(max-width: 768px\)/);
  assert.match(runtime, /min-height: 100dvh/);
  assert.match(runtime, /function startScrollZoom/);
  assert.match(runtime, /function prepareSequenceReveal/);
  assert.match(runtime, /function runRouteBrandTransition/);
  assert.match(runtime, /siteforge:route-transition-complete/);
  assert.match(runtime, /transformOrigin = 'top left'/);
  assert.match(runtime, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(runtime, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(runtime, /header:has\(\[data-siteforge-brand-logo\]\)/);
  assert.match(runtime, /--sf-navigation-closed-translate/);
  assert.match(runtime, /scrollbar-width: none/);
  assert.doesNotMatch(runtime, /enteringSequenceIndex/);
  assert.match(runtime, /1_500/);
});

test('requires every generated page to be reachable through nested internal links', () => {
  const reachable = unreachableSelectedPageProblems([
    {
      relativePath: 'index.html',
      contents: '<a href="/services/">Services</a>',
    },
    {
      relativePath: 'services/index.html',
      contents: '<a href="/services/electrical/">Electrical</a>',
    },
    {
      relativePath: 'services/electrical/index.html',
      contents: '<a href="/">Home</a>',
    },
  ]);
  const unreachable = unreachableSelectedPageProblems([
    {
      relativePath: 'index.html',
      contents: '<a href="/services/">Services</a>',
    },
    { relativePath: 'services/index.html', contents: '<a href="/">Home</a>' },
    {
      relativePath: 'services/electrical/index.html',
      contents: '<a href="/services/">Back</a>',
    },
  ]);

  assert.deepEqual(reachable, []);
  assert.deepEqual(unreachable, [
    'services/electrical/index.html cannot be reached by following internal links from index.html.',
  ]);
  assert.deepEqual(
    unreachableSelectedPageProblems(
      [
        { relativePath: 'index.html', contents: '' },
        { relativePath: 'thank-you/index.html', contents: '' },
        { relativePath: 'home-1/index.html', contents: '' },
      ],
      [
        { outputPath: 'thank-you/index.html', disposition: 'workflow_state' },
        { outputPath: 'home-1/index.html', disposition: 'redirect' },
      ],
    ),
    [],
  );
});

test('creates a feature-only whole-site Agent Studio prompt', () => {
  const prompt = buildPrompt(
    {
      scopedRevision: false,
      restoredCheckpoint: true,
      buildMode: 'site_test',
      stagedSourcePages: selectedSourcePages(manifest, 'site_test'),
      allowedSourcePaths: [],
      agentPackage: { id: 'package-test', version: 8 },
      contextSummary: {
        applicableContracts: [
          'component-architecture.md',
          'mobile-navigation.md',
          'site-navigation-architecture.md',
        ],
      },
    },
    'Repair nested navigation without redesigning the site.',
  );

  assert.match(prompt, /feature-only whole-site Agent Studio revision/);
  assert.match(
    prompt,
    /Preserve all existing routes, content, tokens, components, visual decisions/,
  );
  assert.match(prompt, /feature-contracts\/site-navigation-architecture\.md/);
  assert.match(prompt, /Implement only this Agent Studio feature direction/);
  assert.match(prompt, /Repair nested navigation without redesigning the site/);
  assert.match(prompt, /complete change scope/);
  assert.match(prompt, /first data-sf-navigation-item/);
  assert.match(prompt, /pre-decodes and prioritises that mark/);
  assert.match(prompt, /exposes the logo and routes together/);
  assert.match(prompt, /outcome-level creative brief/);
  assert.match(prompt, /Required runtime hooks are the baseline, not the creative ceiling/);
  assert.match(prompt, /pointer-responsive ambient light/);
  assert.match(prompt, /jq and ImageMagick commands are not/);
  assert.match(prompt, /Run full verify at most twice/);
});

test('uses an economical explicit profile for private route tests', () => {
  const originalModel = process.env.SITEFORGE_CODEX_MODEL;
  const originalEffort = process.env.SITEFORGE_CODEX_REASONING_EFFORT;
  delete process.env.SITEFORGE_CODEX_MODEL;
  delete process.env.SITEFORGE_CODEX_REASONING_EFFORT;
  try {
    assert.deepEqual(builderExecutionProfile({ build_mode: 'page_test' }, { version: 7.2 }), {
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
    });
    assert.deepEqual(builderExecutionProfile({ build_mode: 'homepage_test' }, { version: 7.2 }), {
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
    });
    assert.deepEqual(builderExecutionProfile({ build_mode: 'full_site' }, { version: 7.2 }), {
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
    });
    assert.deepEqual(builderExecutionProfile({ build_mode: 'page_test' }, { version: 7.1 }), {
      model: undefined,
      reasoningEffort: undefined,
    });
  } finally {
    if (originalModel === undefined) delete process.env.SITEFORGE_CODEX_MODEL;
    else process.env.SITEFORGE_CODEX_MODEL = originalModel;
    if (originalEffort === undefined) delete process.env.SITEFORGE_CODEX_REASONING_EFFORT;
    else process.env.SITEFORGE_CODEX_REASONING_EFFORT = originalEffort;
  }
});

test('defaults website builds to ChatGPT subscription authentication without forwarding API keys', () => {
  const authentication = builderCodexAuthentication({
    HOME: '/tmp/member-home',
    PATH: '/usr/bin',
    OPENAI_API_KEY: 'analysis-worker-key',
  });
  assert.deepEqual(authentication, {
    mode: 'chatgpt',
    billingMode: 'chatgpt_subscription',
    label: 'ChatGPT subscription',
  });
  const environment = builderCodexEnvironment(authentication, {
    HOME: '/tmp/member-home',
    PATH: '/usr/bin',
    OPENAI_API_KEY: 'analysis-worker-key',
    SITEFORGE_CODEX_API_KEY: 'legacy-builder-key',
  });
  assert.equal(environment.HOME, '/tmp/member-home');
  assert.equal(environment.PATH, '/usr/bin');
  assert.equal(environment.OPENAI_API_KEY, undefined);
  assert.equal(environment.SITEFORGE_CODEX_API_KEY, undefined);
  assert.equal(environment.CODEX_API_KEY, undefined);
});

test('uses API credits for both Codex builders only after the owner switch is persisted', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'siteforge-builder-billing-'));
  const environment = {
    SITEFORGE_RUNTIME_DATA_DIR: dataDirectory,
    SITEFORGE_CODEX_API_KEY: 'dedicated-builder-key',
  };
  try {
    await writeRuntimeAiBillingMode(apiCreditsBillingMode, environment);
    const authentication = builderCodexAuthentication(environment);
    assert.deepEqual(authentication, {
      mode: 'api_key',
      billingMode: 'api_usage',
      label: 'OpenAI API credits',
      credential: 'dedicated-builder-key',
    });
    assert.equal(
      builderCodexEnvironment(authentication, environment).CODEX_API_KEY,
      'dedicated-builder-key',
    );
  } finally {
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test('keeps prospect-build prerequisites and activity tied to the current package', async () => {
  const [app, migration, markdownStorageMigration, siteTestMigration, worker] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(compatibleFullBuildMigrationUrl, 'utf8'),
    readFile(markdownStorageMigrationUrl, 'utf8'),
    readFile(agentStudioSiteTestMigrationUrl, 'utf8'),
    readFile(new URL('../../worker/builder-worker.mjs', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /requiredHomepageAgentPackageId = isTestBuild/);
  assert.match(app, /compatibleHomepageTestReady/);
  assert.match(app, /automatically rebase its design direction onto the current Build Manifest/);
  assert.match(app, /loadedRunEvidence\?\.status === 'ready'/);
  assert.match(app, /Loading prospect build activity/);
  assert.match(app, /const showCurrentRunLogs = Boolean\(!pendingBuild && run\)/);
  assert.match(migration, /requested_mode = 'full_site'/);
  assert.match(migration, /candidate_manifest\.crawl_run_id = target_manifest\.crawl_run_id/);
  assert.match(
    migration,
    /candidate_manifest\.research_packet_id = target_manifest\.research_packet_id/,
  );
  assert.match(migration, /candidate\.agent_package_id = selected_package\.id/);
  assert.match(
    worker,
    /!\['full_site', 'site_test'\]\.includes\(run\.build_mode\) && sourceRun\.id !== run\.id/,
  );
  assert.match(worker, /'\.md': 'text\/markdown'/);
  assert.match(markdownStorageMigration, /array\['text\/markdown'\]/);
  assert.match(siteTestMigration, /move_builder_run_to_agent_studio/);
  assert.match(siteTestMigration, /request_agent_studio_site_test/);
  assert.match(siteTestMigration, /parent_builder_run_id,\s+build_mode/);
  assert.match(siteTestMigration, /'site_test'/);
});

test('scopes a revised homepage to its route and generated component layers', () => {
  const [homepage] = selectedSourcePages(manifest, 'homepage_test');
  assert.equal(homepage.outputPath, 'index.html');

  const prompt = buildPrompt(
    {
      scopedRevision: true,
      restoredCheckpoint: true,
      buildMode: 'homepage_test',
      stagedSourcePages: [homepage],
      allowedSourcePaths: ['app/page.tsx', 'app/globals.css', 'app/layout.tsx'],
      allowedSourcePrefixes: ['components/ui/', 'components/sections/'],
      agentPackage: { id: 'package-test', version: 8 },
      contextSummary: {
        applicableContracts: [
          'component-architecture.md',
          'mobile-navigation.md',
          'semantic-content-recovery.md',
        ],
      },
    },
    'Add the approved behaviour to the header.',
  );

  assert.match(prompt, /revision-scope\.json/);
  assert.match(prompt, /Do not read \.\.\/input\/manifest\.json/);
  assert.match(prompt, /Do not search for unrelated routes/);
  assert.match(prompt, /src\/app\/page\.tsx, src\/app\/globals\.css, src\/app\/layout\.tsx/);
  assert.match(prompt, /src\/components\/ui\/, src\/components\/sections\//);
  assert.match(prompt, /Add the approved behaviour to the header/);
  assert.match(prompt, /approved-assets\.json/);
  assert.match(prompt, /replace the prior run’s asset set/);
  assert.match(prompt, /approvedVisualContentGroups in revision-scope\.json/);
  assert.match(prompt, /semantic-content-recovery\.md/);
  assert.match(prompt, /Do not leave a stale generic substitute/);
});

test('requires an icon-only compact navigation trigger with a programmatic name', async () => {
  const valid = {
    relativePath: 'index.html',
    contents: `
      <nav data-siteforge-desktop-navigation><a href="/">Home</a></nav>
      <button data-siteforge-menu-trigger aria-label="Open navigation" aria-expanded="false">
        <svg aria-hidden="true"><path d="M0 0h12"></path></svg>
      </button>
    `,
  };
  assert.deepEqual(await mobileNavigationTriggerProblems([valid], []), []);

  const visibleMenu = {
    ...valid,
    contents: valid.contents.replace('</button>', '<span>Menu</span></button>'),
  };
  assert.match(
    (await mobileNavigationTriggerProblems([visibleMenu], [])).join(' '),
    /renders text inside the compact navigation trigger/,
  );

  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(worker, /compact navigation does not fill the viewport height/);
  assert.match(worker, /compact-navigation backdrop does not cover the viewport/);
  assert.match(worker, /compact-navigation routes are not visibly stable after opening/);
  assert.match(worker, /has no visible desktop navigation at 1440px/);
  assert.ok(
    worker.indexOf("qualityOperation = 'responsive_reveal_settle'") <
      worker.indexOf("qualityOperation = 'accessibility_scan'"),
    'accessibility must be scanned after reveal motion has settled',
  );
  assert.ok(
    worker.indexOf("qualityOperation = 'final_state_evidence'") <
      worker.indexOf("qualityOperation = 'accessibility_scan'"),
    'accessibility must use the deterministic final reduced-motion state',
  );
});

test('retries a transient compact-navigation pointer timeout without bypassing hit testing', async () => {
  let clickAttempts = 0;
  let scrollAttempts = 0;
  let settledFrames = 0;
  const result = await activateCompactNavigationTrigger({
    async click(options) {
      clickAttempts += 1;
      assert.deepEqual(options, { timeout: 5_000 });
      if (clickAttempts === 1) throw new Error('Element was temporarily not stable.');
    },
    async scrollIntoViewIfNeeded(options) {
      scrollAttempts += 1;
      assert.deepEqual(options, { timeout: 2_000 });
    },
    async evaluate(callback) {
      settledFrames += 1;
      await callback({
        ownerDocument: { defaultView: { requestAnimationFrame: (next) => next() } },
        scrollIntoView() {},
      });
    },
  });

  assert.deepEqual(result, { activated: true, attempts: 2 });
  assert.equal(clickAttempts, 2);
  assert.equal(scrollAttempts, 1);
  assert.equal(settledFrames, 1);
});

test('returns a reviewable navigation finding after both pointer attempts fail', async () => {
  const result = await activateCompactNavigationTrigger({
    async click() {
      throw new Error('Another element intercepts pointer events.');
    },
    async scrollIntoViewIfNeeded() {},
    async evaluate() {},
  });

  assert.equal(result.activated, false);
  assert.equal(result.attempts, 2);
  assert.match(result.detail, /intercepts pointer events/);
});

test('stages current page semantic groups when rebasing an earlier private page', async () => {
  const inputDirectory = await mkdtemp(join(tmpdir(), 'siteforge-revision-test-'));
  try {
    const result = await stageRevisionScope(
      {
        id: 'manifest-current',
        data: {
          ...manifest.data,
          brandKit: {},
          approvedVisualContentGroups: [
            {
              id: 'homepage-feedback',
              sourcePageUrl: 'https://example.com/',
              semanticRole: 'testimonial',
              items: [{ id: 'quote-one' }, { id: 'quote-two' }],
            },
            {
              id: 'services-table',
              sourcePageUrl: 'https://example.com/services',
              semanticRole: 'table',
              items: [{ id: 'table-one' }],
            },
          ],
        },
      },
      inputDirectory,
      'homepage_test',
      undefined,
      { build_manifest_id: 'manifest-prior' },
    );
    const scope = JSON.parse(await readFile(result.scopePath, 'utf8'));
    assert.equal(scope.rebasedToCurrentManifest, true);
    assert.deepEqual(
      scope.approvedVisualContentGroups.map((group) => group.id),
      ['homepage-feedback'],
    );
    assert.match(scope.rules.join(' '), /must be accounted for exactly/);
    assert.match(scope.rules.join(' '), /builder owns integration, composition, and styling/);
    assert.ok(result.allowedSourcePaths.includes('SEMANTIC_DESIGN_DECISIONS.json'));
    assert.match(scope.rules.join(' '), /SEMANTIC_DESIGN_DECISIONS\.json/);
  } finally {
    await rm(inputDirectory, { recursive: true, force: true });
  }
});

test('keeps a revised selected page tied to its own output path', () => {
  const [services] = selectedSourcePages(manifest, 'page_test', 'https://example.com/services');
  assert.equal(services.outputPath, 'services/index.html');
  assert.equal(services.publicPath, '/services/');
  assert.equal(services.sourcePath, 'app/services/page.tsx');
});

test('keeps an exact multi-page scratch selection in manifest route order', () => {
  const pages = selectedSourcePages(manifest, 'page_test', undefined, [
    'https://example.com/',
    'https://example.com/services',
  ]);
  assert.deepEqual(
    pages.map((page) => page.outputPath),
    ['index.html', 'services/index.html'],
  );

  const prompt = buildPrompt(
    {
      scopedRevision: false,
      restoredCheckpoint: false,
      buildMode: 'page_test',
      targetSourceUrls: pages.map((page) => page.sourceUrl),
      stagedSourcePages: pages,
      agentPackage: { id: 'package-test', version: 8 },
    },
    undefined,
  );
  assert.match(prompt, /Build exactly these 2 selected private routes together/);
  assert.match(prompt, /exact selected page set/);
  assert.match(prompt, /Do not create unselected routes/);
});

test('accepts a compiled page-set test whose selected routes exclude the homepage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-page-set-output-'));
  try {
    await mkdir(join(directory, 'out', 'contact-us'), { recursive: true });
    await mkdir(join(directory, 'out', 'landing-pages', 'industrial'), { recursive: true });
    await writeFile(join(directory, 'out', 'contact-us', 'index.html'), '<main>Contact</main>');
    await writeFile(
      join(directory, 'out', 'landing-pages', 'industrial', 'index.html'),
      '<main>Industrial</main>',
    );

    const outputPaths = await assertRequiredCompiledOutputs({
      siteDirectory: directory,
      stagedSourcePages: [
        { outputPath: 'contact-us/index.html' },
        { outputPath: 'landing-pages/industrial/index.html' },
      ],
    });

    assert.deepEqual(outputPaths, ['contact-us/index.html', 'landing-pages/industrial/index.html']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports the exact selected route missing from compiled output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-missing-page-set-output-'));
  try {
    await assert.rejects(
      assertRequiredCompiledOutputs({
        siteDirectory: directory,
        stagedSourcePages: [{ outputPath: 'contact-us/index.html' }],
      }),
      /required compiled route: contact-us\/index\.html/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('persists page-set tests without a parent source checkpoint', async () => {
  const migration = await readFile(pageSetTestMigrationUrl, 'utf8');
  assert.match(migration, /target_source_urls text\[\]/);
  assert.match(migration, /requested_source_builder_run_id is not null/);
  assert.match(migration, /page-set test starts from the clean builder foundation/i);
  assert.match(migration, /parent_builder_run_id[\s\S]*?'page_test'/);
});

test('allows Next.js working source in protected builder storage', async () => {
  const migration = await readFile(builderSourceTextMigrationUrl, 'utf8');
  assert.match(migration, /siteforge-artifacts/);
  assert.match(migration, /text\/plain/);
});

test('keeps the Next-generated environment declaration outside the immutable foundation', () => {
  assert.ok(lockedFoundationPaths.includes('next.config.ts'));
  assert.ok(lockedFoundationPaths.includes('tsconfig.json'));
  assert.ok(!lockedFoundationPaths.includes('next-env.d.ts'));
});

test('refreshes a stale locked runtime before resumed verification', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-resume-foundation-'));
  try {
    for (const relativePath of lockedFoundationPaths) {
      const destination = join(directory, relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, `stale ${relativePath}`);
    }
    const generatedPage = join(directory, 'src/app/page.tsx');
    await mkdir(dirname(generatedPage), { recursive: true });
    await writeFile(generatedPage, 'export default function Page() { return null; }');

    await refreshLockedFoundation(directory);

    const restoredRuntime = await readFile(
      join(directory, 'src/components/foundation/site-runtime.tsx'),
      'utf8',
    );
    assert.doesNotMatch(restoredRuntime, /^stale /);
    assert.match(restoredRuntime, /function SiteRuntime/);
    assert.equal(
      await readFile(generatedPage, 'utf8'),
      'export default function Page() { return null; }',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('stores Next static-export payload files as allowed plain text', () => {
  assert.equal(contentTypeFor('__next._tree.txt'), 'text/plain');
});

test('keeps route-scoped assets plus the complete approved logo family', () => {
  const selectedPageUrls = new Set(['https://example.com/services']);
  assert.equal(
    assetMatchesSelectedPages(
      { id: 'services-photo', metadata: { pageUrl: 'https://example.com/services' } },
      selectedPageUrls,
      'primary-logo',
    ),
    true,
  );
  assert.equal(
    assetMatchesSelectedPages(
      { id: 'about-photo', metadata: { pageUrl: 'https://example.com/about' } },
      selectedPageUrls,
      'primary-logo',
    ),
    false,
  );
  assert.equal(
    assetMatchesSelectedPages(
      {
        id: 'white-logo',
        metadata: { derivedFromAssetId: 'primary-logo', pageUrl: 'https://example.com/about' },
      },
      selectedPageUrls,
      'primary-logo',
    ),
    true,
  );
});

test('projects a narrow test manifest without mutating its immutable source', () => {
  const fullData = {
    brandKit: { approvedAssetIds: ['home-image', 'services-image'] },
    selectedPages: [
      { url: 'https://example.com/', sourcePageUrl: 'https://example.com/' },
      { url: 'https://example.com/services', sourcePageUrl: 'https://example.com/services' },
    ],
    permittedFacts: [
      { sourcePageUrl: 'https://example.com/', value: 'Home fact' },
      { sourcePageUrl: 'https://example.com/services', value: 'Service fact' },
      { sourcePageUrl: 'https://example.com/services-old', value: 'Legacy service fact' },
    ],
    pageCoverage: [
      {
        sourceUrl: 'https://example.com/services',
        disposition: 'build',
        outputRequired: true,
      },
      {
        sourceUrl: 'https://example.com/services-old',
        disposition: 'merge',
        targetSourceUrl: 'https://example.com/services',
        outputRequired: false,
      },
    ],
    selectedAssets: [{ artifactId: 'home-image' }, { artifactId: 'services-image' }],
    approvedAssetGuidance: [{ assetId: 'home-image' }, { assetId: 'services-image' }],
    pagePlans: [
      { sourcePageUrl: 'https://example.com/' },
      { sourcePageUrl: 'https://example.com/services' },
      { sourcePageUrl: 'https://example.com/services-old' },
    ],
  };
  const projected = projectManifestData(
    fullData,
    [{ sourceUrl: 'https://example.com/services' }],
    [{ assetId: 'services-image' }],
    'page_test',
  );

  assert.equal(projected.selectedPages.length, 1);
  assert.deepEqual(
    projected.permittedFacts.map((fact) => fact.value),
    ['Service fact', 'Legacy service fact'],
  );
  assert.deepEqual(projected.selectedAssets, [{ artifactId: 'services-image' }]);
  assert.deepEqual(projected.brandKit.approvedAssetIds, ['services-image']);
  assert.equal(projected.pagePlans.length, 2);
  assert.equal(projected.pageCoverage.length, 2);
  assert.equal(fullData.selectedPages.length, 2);
});

test('routes only applicable feature contracts into narrow agent context', () => {
  const selectedPages = [{ sourceUrl: 'https://example.com/' }];
  assert.deepEqual(applicableFeatureContracts({}, selectedPages, 'homepage_test'), [
    'component-architecture.md',
    'mobile-navigation.md',
  ]);
  assert.deepEqual(
    applicableFeatureContracts(
      {
        brandKit: { primaryLogoAssetId: 'logo' },
        approvedCapabilities: [{ id: 'forms' }],
        approvedVisualContentGroups: [{ id: 'group' }],
      },
      selectedPages,
      'homepage_test',
    ),
    [
      'component-architecture.md',
      'mobile-navigation.md',
      'contextual-logo-selection.md',
      'runtime-profiles.md',
      'semantic-content-recovery.md',
    ],
  );
});

test('summarises projected context for usage evidence', () => {
  const fullData = { selectedPages: [{}, {}], permittedFacts: [{}, {}, {}] };
  const projectedData = { selectedPages: [{}], permittedFacts: [{}] };
  const summary = buildContextSummary({
    fullData,
    projectedData,
    selectedPages: [{ sourceUrl: 'https://example.com/' }],
    stagedAssets: [{ assetId: 'logo' }],
    buildMode: 'homepage_test',
    scopedRevision: false,
  });

  assert.equal(summary.scope, 'selected_routes');
  assert.equal(summary.selectedRouteCount, 1);
  assert.equal(summary.stagedAssetCount, 1);
  assert.ok(summary.stagedManifestBytes < summary.fullManifestBytes);
  assert.deepEqual(summary.stagedSectionCounts, { selectedPages: 1, permittedFacts: 1 });
  assert.deepEqual(summary.sectionCounts, summary.stagedSectionCounts);
  assert.equal(summary.inputFiles.manifest, '../input/manifest.json');
  assert.equal(summary.manifestSignals.hasStructuredArchitecture, false);
  assert.match(summary.inspectionPolicy, /never print an entire manifest/i);
});

test('keeps legacy manifests from causing missing-architecture inspection turns', () => {
  const [homepage] = selectedSourcePages(manifest, 'homepage_test');
  const prompt = buildPrompt(
    {
      scopedRevision: false,
      restoredCheckpoint: false,
      buildMode: 'homepage_test',
      stagedSourcePages: [homepage],
      allowedSourcePaths: [],
      agentPackage: { id: 'package-test', version: 8 },
      contextSummary: {
        applicableContracts: ['component-architecture.md', 'mobile-navigation.md'],
        manifestSignals: { hasStructuredArchitecture: false },
      },
    },
    undefined,
  );

  assert.match(prompt, /legacy manifest does not contain a structured architecture object/i);
  assert.match(prompt, /Do not search for one/);
});

test('continues safe post-Codex failures from a restored checkpoint', () => {
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { executionMode: 'quality_recheck' } },
      { restoredCheckpoint: true, checkpointState: 'post_codex_validated' },
    ),
    true,
  );
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { resumeFromFailureCode: 'compiled_homepage_missing' } },
      { restoredCheckpoint: true, checkpointState: 'post_codex_validated' },
    ),
    true,
  );
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { resumeFromFailureCode: 'private_storage_rejected' } },
      { restoredCheckpoint: true, checkpointState: 'post_codex_validated' },
    ),
    true,
  );
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { resumeFromFailureCode: 'compile_failed' } },
      { restoredCheckpoint: true, checkpointState: 'post_codex_validated' },
    ),
    false,
  );
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { resumeFromFailureCode: 'private_storage_rejected' } },
      { restoredCheckpoint: false, checkpointState: 'post_codex_validated' },
    ),
    false,
  );
  assert.equal(
    canContinueWithoutCodex(
      { failure_context: { resumeFromFailureCode: 'private_storage_rejected' } },
      { restoredCheckpoint: true, checkpointState: 'resume_checkpoint' },
    ),
    false,
  );
});

test('preserves prior failure classification when a saved build is resumed', async () => {
  const [resumeMigration, claimMigration] = await Promise.all([
    readFile(postCodexResumeMigrationUrl, 'utf8'),
    readFile(preserveResumeContextMigrationUrl, 'utf8'),
  ]);
  assert.match(resumeMigration, /'resumeFromFailureCode', target_run\.failure_code/);
  assert.match(resumeMigration, /'resumeFromFailureStage', target_run\.failure_stage/);
  assert.match(claimMigration, /runs\.failure_context ->> 'resumeFromFailureCode'/);
  assert.match(claimMigration, /coalesce\(\s*runs\.failure_context/);
});

test('allocates immutable package releases in decimal version order', async () => {
  const migration = await readFile(decimalPackageVersionMigrationUrl, 'utf8');
  assert.match(migration, /drop trigger if exists set_agent_package_contract_version/);
  assert.match(migration, /alter column version type numeric\(10, 1\)/);
  assert.match(migration, /create trigger set_agent_package_contract_version/);
  assert.match(migration, /next_version numeric\(10, 1\)/);
  assert.match(migration, /coalesce\(max\(version\), 0\) \+ 0\.1 into next_version/);
});

test('registers creative composition as a visible immutable test package', async () => {
  const migration = await readFile(creativeCompositionPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /published\.id/);
  assert.match(migration, /Creative composition test package:/);
  assert.match(migration, /"next-component-architecture"/);
  assert.match(migration, /"motion-runtime"/);
  assert.match(migration, /not exists/i);
});

test('registers expressive craft above the retained creative-composition package', async () => {
  const migration = await readFile(expressiveCraftPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Expressive craft test package:/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers resilient browser quality above the retained expressive package', async () => {
  const migration = await readFile(resilientQualityPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Resilient quality test package:/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers immersive motion above the retained resilient-quality package', async () => {
  const migration = await readFile(immersiveMotionPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Immersive motion test package:/);
  assert.match(migration, /"brand-introduction"/);
  assert.match(migration, /"motion-runtime"/);
  assert.match(migration, /not exists/i);
});

test('registers resilient resume above the retained immersive-motion package', async () => {
  const migration = await readFile(resilientResumePackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Resilient resume test package:/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers meaningful page names above the retained resilient-resume package', async () => {
  const migration = await readFile(meaningfulPageNamesPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Meaningful page names test package:/);
  assert.match(migration, /"site-navigation-architecture"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers clean test starts above the retained meaningful-page-names package', async () => {
  const migration = await readFile(cleanTestStartPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Clean test start package:/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers the precise logo handoff above the retained clean-test package', async () => {
  const migration = await readFile(preciseLogoHandoffPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Precise logo handoff test package:/);
  assert.match(migration, /"brand-introduction"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers valid preview entry above the retained precise-logo package', async () => {
  const migration = await readFile(validPreviewEntryPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Valid preview entry test package:/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers responsive intro craft above the retained valid-preview package', async () => {
  const migration = await readFile(responsiveIntroCraftPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Responsive intro craft test package:/);
  assert.match(migration, /data-siteforge-compact-logo-alignment/);
  assert.match(migration, /scrollbar-color/);
  assert.match(migration, /"brand-introduction"/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"next-component-architecture"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers immediate brand introduction above the retained responsive-craft package', async () => {
  const migration = await readFile(immediateBrandIntroductionPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Immediate brand introduction test package:/);
  assert.match(migration, /data-siteforge-intro-copy/);
  assert.match(migration, /data-siteforge-intro-ink/);
  assert.match(migration, /data-siteforge-navigation-logo/);
  assert.match(migration, /fetch priority/i);
  assert.match(migration, /"brand-introduction"/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers efficient builder execution above the retained immediate-brand package', async () => {
  const migration = await readFile(efficientBuilderExecutionPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Efficient builder execution test package:/);
  assert.match(migration, /GPT-5\.6 Terra/);
  assert.match(migration, /GPT-5\.6 Sol/);
  assert.match(migration, /no more than ten inspection commands/i);
  assert.match(migration, /full verification at most twice/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers decoded navigation logo above the retained efficient-execution package', async () => {
  const migration = await readFile(decodedNavigationLogoPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Decoded navigation logo test package:/);
  assert.match(migration, /data-siteforge-navigation-logo/);
  assert.match(migration, /first data-sf-navigation-item/);
  assert.match(migration, /mounted image to decode/i);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers creative autonomy above the retained decoded-navigation package', async () => {
  const migration = await readFile(creativeAutonomyPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Creative autonomy test package:/);
  assert.match(migration, /outcome-level creative briefs/);
  assert.match(migration, /pointer-responsive ambient light/);
  assert.match(migration, /reduced-motion fallbacks/);
  assert.match(migration, /"motion-runtime"/);
  assert.match(migration, /"next-component-architecture"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers selected-route compilation above the retained creative package', async () => {
  const migration = await readFile(selectedRouteCompilePackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Selected-route compile test package:/);
  assert.match(migration, /every selected manifest output path/);
  assert.match(migration, /must not require a root index\.html/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers complete checkpoint restore above selected-route compilation', async () => {
  const migration = await readFile(completeCheckpointRestorePackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Complete checkpoint restore test package:/);
  assert.match(migration, /every recorded source file at its recorded hash/);
  assert.match(migration, /hash-addressed private source object/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers reliable compact navigation above checkpoint restoration', async () => {
  const migration = await readFile(reliableCompactNavigationPackageMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Reliable compact navigation test package:/);
  assert.match(migration, /base\.foundation_version/);
  assert.match(migration, /base\.foundation_checksum/);
  assert.match(migration, /768 CSS pixels/);
  assert.match(migration, /full-height side panels/);
  assert.match(migration, /brand-introduction handoff/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers checkpoint quality rechecks above reliable compact navigation', async () => {
  const migration = await readFile(checkpointQualityRecheckMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Checkpoint repair and brand enforcement test package:/);
  assert.match(migration, /request_builder_quality_recheck/);
  assert.match(migration, /post_codex_validated/);
  assert.match(migration, /'executionMode', 'quality_recheck'/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers stable navigation visibility above checkpoint quality rechecks', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806123000_stable_navigation_visibility_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Stable navigation visibility test package:/);
  assert.match(migration, /visibly rendered/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers settled accessibility above stable navigation visibility', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806130000_settled_accessibility_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Settled accessibility test package:/);
  assert.match(migration, /reveal motion/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers deterministic final evidence above settled accessibility', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806133000_deterministic_final_evidence_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /base\.id/);
  assert.match(migration, /Deterministic final evidence test package:/);
  assert.match(migration, /reduced-motion final state/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers reusable section rhythm above deterministic final evidence', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806140000_reusable_section_rhythm_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Reusable section rhythm test package:/);
  assert.match(migration, /SectionShell and SectionHeading/);
  assert.match(migration, /--scrollbar-track/);
  assert.match(migration, /two distinct approved page photographs/);
  assert.match(migration, /"next-component-architecture"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers forced final-state evidence above reusable section rhythm', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806143000_forced_final_state_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const [runtime, worker] = await Promise.all([
    readFile(
      new URL(
        '../../worker/builder-template/src/components/foundation/site-runtime.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../../worker/builder-worker.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Forced final-state evidence test package:/);
  assert.match(migration, /sf-quality-final-state/);
  assert.match(migration, /"motion-runtime"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(runtime, /html\.sf-quality-final-state\.sf-runtime/);
  assert.match(worker, /enableFinalStateEvidence/);
  assert.match(worker, /disableFinalStateEvidence/);
  assert.match(migration, /not exists/i);
});

test('registers settled factual evidence above forced final-state evidence', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260806150000_settled_factual_evidence_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Settled factual evidence test package:/);
  assert.match(migration, /same completed metric values/);
  assert.match(migration, /"motion-runtime"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(worker, /\[data-counter\]\[data-sf-counter-animated\]/);
  assert.match(worker, /waitForTimeout\(1_600\)/);
  assert.match(migration, /not exists/i);
});

test('registers immediate compact navigation sequencing above settled factual evidence', async () => {
  const [migration, worker] = await Promise.all([
    readFile(immediateNavigationSequenceMigrationUrl, 'utf8'),
    readFile(new URL('../../worker/builder-worker.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Immediate compact navigation test package:/);
  assert.match(migration, /first route within 60ms/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(worker, /compact-navigation logo does not begin revealing immediately/);
  assert.match(worker, /first compact-navigation route waits too long/);
  assert.match(worker, /compact-navigation item sequence is delayed too long/);
  assert.match(migration, /not exists/i);
});

test('registers mobile viewport integrity above immediate compact navigation', async () => {
  const [migration, runtime, worker, componentContract] = await Promise.all([
    readFile(mobileViewportIntegrityMigrationUrl, 'utf8'),
    readFile(motionRuntimeUrl, 'utf8'),
    readFile(new URL('../../worker/builder-worker.mjs', import.meta.url), 'utf8'),
    readFile(componentArchitectureContractUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Mobile viewport integrity test package:/);
  assert.match(migration, /logical leading edge/);
  assert.match(migration, /positive intrinsic dimensions/);
  assert.match(migration, /"responsive-sidebar"/);
  assert.match(migration, /"next-component-architecture"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(runtime, /--sf-navigation-closed-translate/);
  assert.match(runtime, /scrollbar-width: none/);
  assert.match(runtime, /animation: none !important/);
  assert.doesNotMatch(runtime, /enteringSequenceIndex/);
  assert.match(worker, /complete hero heading extends below the first viewport/);
  assert.match(worker, /primary hero action extends below the first viewport/);
  assert.match(worker, /failed to load with positive intrinsic dimensions/);
  assert.match(worker, /unmounts compact navigation before its exit motion can complete/);
  assert.match(componentContract, /data-siteforge-hero-primary-action/);
  assert.match(componentContract, /320×568 and 375×812/);
  assert.match(migration, /not exists/i);
});

test('registers actionable builder failures above mobile viewport integrity', async () => {
  const migration = await readFile(actionableBuilderFailureMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Actionable builder failure test package:/);
  assert.match(migration, /structured Codex failure reason/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('classifies exhausted Codex credits with a checkpoint recovery action', () => {
  const providerMessage = 'You have no credits remaining. Add credits to continue using the API.';
  assert.equal(
    codexFailureFromEvent({ type: 'turn.failed', error: { message: providerMessage } }),
    providerMessage,
  );
  const details = failureDetails(
    new Error(`Codex CLI could not finish the build: ${providerMessage}`),
  );
  assert.equal(details.code, 'codex_api_credits_exhausted');
  assert.equal(details.stage, 'worker_configuration');
  assert.equal(details.retryable, false);
  assert.match(details.summary, /no credits remaining/i);
  assert.match(details.action, /resume this build from its saved private source checkpoint/i);
  assert.deepEqual(details.context, { provider: 'openai', reason: 'credits_exhausted' });
});

test('registers bounded builder requests above actionable provider failures', async () => {
  const migration = await readFile(boundedBuilderRequestsMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Bounded builder request test package:/);
  assert.match(migration, /bounded deadline/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers screenshot-free viewport checks above bounded builder requests', async () => {
  const migration = await readFile(viewportChecksOnlyMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Viewport checks only test package:/);
  assert.match(migration, /without generating, uploading, or retaining final viewport screenshots/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers the local refinement handoff above screenshot-free viewport checks', async () => {
  const migration = await readFile(localRefinementHandoffMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Local refinement handoff test package:/);
  assert.match(migration, /append-only structured refinement ledger/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers accent-only brands once above the retained package ledger', async () => {
  const migration = await readFile(accentOnlyBrandMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Accent-only brand test package:/);
  assert.match(migration, /without inventing a primary brand colour/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /not exists/i);
});

test('registers the Codespace editing workspace once above retained package versions', async () => {
  const migration = await readFile(codespaceWorkspaceMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codespace editing workspace test package:/);
  assert.match(migration, /without storing authentication credentials in source/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers reliable Codespace startup once above retained package versions', async () => {
  const migration = await readFile(codespaceStartupReliabilityMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codespace startup reliability test package:/);
  assert.match(migration, /explicit npm development command/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers Codespace setup ordering once above retained package versions', async () => {
  const migration = await readFile(codespaceSetupOrderingMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codespace setup-ordering test package:/);
  assert.match(migration, /concurrency-safe, idempotent setup gate/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers persistent Codespace tmux startup once above retained package versions', async () => {
  const migration = await readFile(persistentCodespaceTmuxMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Persistent Codespace tmux test package:/);
  assert.match(migration, /persistent tmux session/);
  assert.match(migration, /postStartCommand/);
  assert.match(migration, /directly from GitHub/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers default-off SVG generation once above retained package versions', async () => {
  const migration = await readFile(optionalSvgGenerationMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Optional SVG generation test package:/);
  assert.match(migration, /defaults off/);
  assert.match(migration, /preserves an existing editable SVG/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /not exists/i);
});

test('registers archive-safe Codespace resume startup once above retained package versions', async () => {
  const migration = await readFile(codespaceResumeStartupMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codespace resume startup test package:/);
  assert.match(migration, /including archived source bundles/);
  assert.match(migration, /respawn a dead pane/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers visible non-blocking Codespace setup once above retained package versions', async () => {
  const migration = await readFile(visibleCodespaceSetupMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Visible Codespace setup test package:/);
  assert.match(migration, /background startup job/);
  assert.match(migration, /failure without fabricated percentages/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers non-interactive Codex installation once above retained package versions', async () => {
  const migration = await readFile(noninteractiveCodexInstallMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Non-interactive Codex install test package:/);
  assert.match(migration, /CODEX_NON_INTERACTIVE/);
  assert.match(migration, /Start Codex now terminal prompt/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers the embedded prospect workspace once above retained package versions', async () => {
  const migration = await readFile(embeddedProspectWorkspaceMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Embedded prospect workspace test package:/);
  assert.match(migration, /prospect-workspaces directory/);
  assert.match(migration, /clones or fast-forwards/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers one-click prospect workspace setup once above retained package versions', async () => {
  const migration = await readFile(oneClickProspectWorkspaceMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /One-click prospect workspace test package:/);
  assert.match(migration, /same-origin, validated local action/);
  assert.match(migration, /without fabricated percentages/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers immediate workspace setup from ready source once above retained versions', async () => {
  const migration = await readFile(immediateSourceWorkspaceMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Immediate source workspace test package:/);
  assert.match(migration, /Editable source is ready section/);
  assert.match(migration, /without first creating or locating a separate GitHub repository/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers persistent automatic website launch once above retained versions', async () => {
  const migration = await readFile(automaticWebsiteLaunchMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Automatic website launch test package:/);
  assert.match(migration, /persistent tmux terminal session/);
  assert.match(migration, /Never claim readiness before the server responds/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers Codespaces-aware preview URLs once above retained versions', async () => {
  const migration = await readFile(codespacesPreviewUrlMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codespaces preview URL test package:/);
  assert.match(migration, /CODESPACE_NAME/);
  assert.match(migration, /Ordinary local development retains localhost URLs/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers the live refinement ledger once above retained versions', async () => {
  const migration = await readFile(liveRefinementLedgerMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Live refinement ledger test package:/);
  assert.match(migration, /append-only workspace record/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers resilient refinement-ledger responses once above retained versions', async () => {
  const migration = await readFile(resilientRefinementLedgerMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Resilient refinement ledger test package:/);
  assert.match(migration, /HTML application fallback/);
  assert.match(migration, /restart Made Solid Studio/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers routed editing and handoff pages once above retained versions', async () => {
  const migration = await readFile(editingHandoffPagesMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Editing and handoff pages test package:/);
  assert.match(migration, /complete website verification/);
  assert.match(migration, /block Made Solid transfer/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers resilient final-edit verification once above retained versions', async () => {
  const migration = await readFile(resilientFinalEditMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Resilient final edit test package:/);
  assert.match(migration, /export-worker or global-error failure/);
  assert.match(migration, /one bounded complete-verification retry/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers Git-backed edit version history once above retained versions', async () => {
  const migration = await readFile(editVersionHistoryMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Edit version history test package:/);
  assert.match(migration, /ordered immutable Git checkpoint/);
  assert.match(migration, /detached Git worktrees/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers the reviewed agent-learning inbox once above retained versions', async () => {
  const migration = await readFile(agentLearningInboxMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Agent learning inbox test package:/);
  assert.match(
    migration,
    /project-specific decisions and unclassified observations remain excluded by default/i,
  );
  assert.match(migration, /immutable original manifest/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers Agent Studio website tone once above retained package versions', async () => {
  const migration = await readFile(agentStudioWebsiteToneMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Agent Studio website tone test package:/);
  assert.match(migration, /page tests and whole-site revisions/);
  assert.match(migration, /Agent decides remains the default/);
  assert.match(migration, /"website-tone-direction"/);
  assert.match(migration, /not exists/i);
});

test('registers the exact Made Solid source handoff once above retained package versions', async () => {
  const migration = await readFile(madeSolidHandoffMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Made Solid source handoff test package:/);
  assert.match(migration, /exact, immutable Git revision/i);
  assert.match(migration, /without confusing a builder artifact/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers optional handoff schema resilience above retained package versions', async () => {
  const migration = await readFile(optionalHandoffSchemaMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Optional handoff schema test package:/);
  assert.match(migration, /cannot block prospect workspaces, Agent Studio tests, or builder runs/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers handoff worker liveness once above retained package versions', async () => {
  const migration = await readFile(handoffWorkerLivenessMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Made Solid handoff worker liveness test package:/);
  assert.match(migration, /fresh persisted heartbeat/i);
  assert.match(migration, /no older than 45 seconds/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers clean alternate tests once above retained package versions', async () => {
  const migration = await readFile(cleanAlternateTestMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Clean alternate-test package:/);
  assert.match(migration, /exact run identifier returned/i);
  assert.match(migration, /only Continue this test may reuse failed source/i);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers canonical asset handoff once above retained package versions', async () => {
  const migration = await readFile(canonicalAssetHandoffMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Canonical asset handoff test package:/);
  assert.match(migration, /sourcePageUrls and sourceUrls as provenance/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers captured handoff email once above retained package versions', async () => {
  const migration = await readFile(capturedHandoffEmailMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Captured handoff email test package:/);
  assert.match(migration, /first valid public email from the immutable Research Packet/);
  assert.match(migration, /recording a handoff never sends email/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers automatic Clientspace preview once above retained package versions', async () => {
  const migration = await readFile(automaticClientspacePreviewMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Automatic Clientspace preview test package:/);
  assert.match(migration, /deploys and checks that commit on Vercel/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers automatic prospect domains once above retained package versions', async () => {
  const migration = await readFile(automaticProspectDomainMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Automatic prospect-domain test package:/);
  assert.match(migration, /first-level hostname from the source repository/);
  assert.match(migration, /never substitute a provider URL/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers editable handoff recovery once above retained package versions', async () => {
  const migration = await readFile(editableHandoffRecoveryMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Editable handoff recovery test package:/);
  assert.match(migration, /owner-writable local workspace/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
});

test('registers Codex transcript position once above retained package versions', async () => {
  const migration = await readFile(codexTranscriptPositionMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Codex transcript position test package:/);
  assert.match(migration, /manual upward scroll disables following/);
  assert.match(migration, /Back to latest/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
});

test('registers reviewed page dispositions once above retained package versions', async () => {
  const migration = await readFile(pageDispositionMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Reviewed page-disposition test package:/);
  assert.match(migration, /merge, redirect, workflow state, contextual route, or exclusion/i);
  assert.match(migration, /"site-navigation-architecture"/);
  assert.match(migration, /not exists/i);
});

test('classifies editable-source permission failures after successful quality checks', () => {
  const details = failureDetails(
    new Error(
      "EACCES: permission denied, open '/tmp/siteforge-builder-run/local-development/website/package.json'",
    ),
  );
  assert.equal(details.code, 'editable_source_packaging_failed');
  assert.equal(details.stage, 'saving_outputs');
  assert.equal(details.retryable, false);
});

test('registers website tone direction once above retained package versions', async () => {
  const migration = await readFile(websiteToneDirectionMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Website tone direction test package:/);
  assert.match(migration, /rather than requiring pure white or pure black backgrounds/);
  assert.match(migration, /green, blue, brown, or black/);
  assert.match(migration, /"website-tone-direction"/);
  assert.match(migration, /not exists/i);
});

test('registers corrected logo accent regions once above retained package versions', async () => {
  const migration = await readFile(logoAccentRegionsMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Logo accent-region test package:/);
  assert.match(migration, /must never recolour a smaller verified accent/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /not exists/i);
});

test('registers independently delegated colour roles once above retained package versions', async () => {
  const migration = await readFile(builderDerivedColoursMigrationUrl, 'utf8');
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Builder-derived colour roles test package:/);
  assert.match(migration, /primary_only derives accent/);
  assert.match(migration, /builder_derived derives both/);
  assert.match(migration, /"contextual-logo-selection"/);
  assert.match(migration, /not exists/i);
});

test('packages complete local-development source without generated output or dependencies', async () => {
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  const handoff = await readFile(
    new URL('../../worker/local-development-handoff.mjs', import.meta.url),
    'utf8',
  );
  const saveStart = worker.indexOf('async function saveOutputs');
  const saveEnd = worker.indexOf('function resumeFailureCode', saveStart);
  const saveSource = worker.slice(saveStart, saveEnd);
  assert.match(saveSource, /applyLocalDevelopmentHandoff/);
  assert.match(saveSource, /includesApprovedAssets: true/);
  assert.match(saveSource, /refinementLedger: '\.made-solid\/refinement-log\.jsonl'/);
  assert.doesNotMatch(saveSource, /--exclude=website\/public\/assets/);
  assert.match(handoff, /node_modules\|\\\.next\|out\|\\\.git/);
});

test('turns protected builder source into a writable editable handoff', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-editable-handoff-'));
  const source = join(directory, 'source');
  const destination = join(directory, 'destination');
  try {
    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, 'package.json'),
      JSON.stringify({ scripts: { dev: 'next dev' }, dependencies: { next: '16.2.12' } }),
    );
    await chmod(join(source, 'package.json'), 0o444);

    await copyLocalDevelopmentSource(source, destination);
    assert.ok((await stat(join(destination, 'package.json'))).mode & 0o200);
    await applyLocalDevelopmentHandoff(destination, {
      studioBuildId: 'build-1',
      businessId: 'business-1',
      buildManifestId: 'manifest-1',
      agentPackageId: 'package-1',
      agentPackageVersion: 12.3,
      buildMode: 'homepage_test',
      templateVersion: 'template-1',
      baselineCommit: null,
    });
    const packageDocument = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'));
    assert.equal(
      packageDocument.scripts['made-solid:log'],
      'node .made-solid/scripts/refinement-log.mjs add',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('runs responsive browser checks without creating screenshot artifacts', async () => {
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  const qualityStart = worker.indexOf('async function runQualityChecks');
  const qualityEnd = worker.indexOf('async function saveOutputs', qualityStart);
  const qualitySource = worker.slice(qualityStart, qualityEnd);
  assert.match(qualitySource, /progress_phase: 'quality_checks'/);
  assert.match(qualitySource, /Responsive viewport checks/);
  assert.match(qualitySource, /without storing screenshots/);
  assert.doesNotMatch(qualitySource, /page\.screenshot|kind: 'screenshot'|screenshots\//);
  assert.doesNotMatch(worker, /openNavigationBody|screenshotArtifacts/);
});

test('rejects unbounded builder queues and reconciles lost workers promptly', async () => {
  const migration = await readFile(builderWorkerLivenessMigrationUrl, 'utf8');
  assert.match(migration, /worker_runtime_heartbeats/);
  assert.match(migration, /heartbeat_at >= now\(\) - interval '30 seconds'/);
  assert.match(migration, /protected builder is offline/i);
  assert.match(migration, /already processing another build/i);
  assert.match(migration, /builder_runs_guard_queue_liveness/);
  assert.match(migration, /lease_expires_at = now\(\) \+ interval '2 minutes'/);
  assert.match(migration, /failure_code = 'builder_worker_unavailable'/);
  assert.match(migration, /runs\.created_at < now\(\) - interval '2 minutes'/);
});

test('keeps builder availability and the active run lease alive independently of output', async () => {
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  const processStart = worker.indexOf('async function processNextBuild');
  const processEnd = worker.indexOf('async function main', processStart);
  const processSource = worker.slice(processStart, processEnd);
  assert.match(worker, /const builderHeartbeatIntervalMs = 15_000/);
  assert.match(worker, /heartbeat_builder_worker/);
  assert.match(worker, /release_builder_worker/);
  assert.match(processSource, /createBuilderHeartbeat\(client, run, workerId\)/);
  assert.match(processSource, /await heartbeat\.renew\(\)/);
  assert.match(processSource, /finally \{\s*heartbeat\.stop\(\)/);
});

test('reconciles stale builder runs before workspace reads and build requests', async () => {
  const repository = await readFile(cloudRepositoryUrl, 'utf8');
  const matches = repository.match(/reconcile_builder_run_lifecycle/g) ?? [];
  assert.ok(matches.length >= 5);
  assert.match(repository, /this\.getWorkspace\(business\.id, false\)/);
});

test('shows persisted build stages and worker freshness without fabricating progress', async () => {
  const [app, repository] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(cloudRepositoryUrl, 'utf8'),
  ]);
  assert.match(repository, /attemptCount: readNumber\(row, 'attempt_count'\)/);
  assert.match(repository, /heartbeatAt: readOptionalString\(row, 'heartbeat_at'\)/);
  assert.match(repository, /\.eq\('kind', 'stage'\)/);
  assert.match(repository, /firstQualityEventResult/);
  assert.match(app, /function BuilderLiveProgress/);
  assert.match(app, /function builderStageStarts/);
  assert.match(app, /function builderStageTimingLabel/);
  assert.match(app, /Worker heartbeat overdue/);
  assert.match(app, /Next: \$\{nextStage\.label\}/);
  assert.match(app, /aria-label="Build stages"/);
  assert.match(app, /Took \$\{formatBuildElapsedTime/);
  assert.match(app, /' so far'/);
  assert.match(app, /Not started/);
  assert.match(app, /return 'checks running'/);
  assert.doesNotMatch(
    app.slice(
      app.indexOf('function BuilderLiveProgress'),
      app.indexOf('function buildUsageSummary'),
    ),
    /%/,
  );
});

test('opens page-set previews on their first selected generated route', async () => {
  const repository = await readFile(cloudRepositoryUrl, 'utf8');
  const previewStart = repository.indexOf('async createBuilderPreviewUrl');
  const previewEnd = repository.indexOf('async setTaskState', previewStart);
  const previewSource = repository.slice(previewStart, previewEnd);
  assert.match(previewSource, /target_source_urls/);
  assert.match(previewSource, /manifestData\.selectedPages/);
  assert.match(previewSource, /canonicalWebsiteUrl\(page\.url\)/);
  assert.match(previewSource, /publicPath\.replace/);
  assert.match(previewSource, /\$\{draftPath\}\$\{entryPath\}/);
});

test('queues chooser requests as new tests and reserves resume for the explicit action', async () => {
  const app = await readFile(appUrl, 'utf8');
  const requestStart = app.indexOf('async function requestWebsiteBuildForBusiness');
  const requestEnd = app.indexOf('async function moveBuilderRunToAgentStudio', requestStart);
  const requestSource = app.slice(requestStart, requestEnd);
  assert.match(requestSource, /repository\.requestWebsiteBuild\(/);
  assert.doesNotMatch(requestSource, /resumeRun|repository\.resumeWebsiteBuild/);

  const resumeStart = app.indexOf('async function resumeWebsiteBuildForBusiness');
  const resumeEnd = app.indexOf('async function deleteWebsiteBuild', resumeStart);
  assert.match(app.slice(resumeStart, resumeEnd), /repository\.resumeWebsiteBuild\(builderRunId\)/);

  const repository = await readFile(cloudRepositoryUrl, 'utf8');
  const cloudRequestStart = repository.indexOf('async requestWebsiteBuild(');
  const cloudRequestEnd = repository.indexOf(
    'async requestBuilderQualityRecheck',
    cloudRequestStart,
  );
  const cloudRequestSource = repository.slice(cloudRequestStart, cloudRequestEnd);
  assert.match(cloudRequestSource, /const \{ data, error \} = await this\.client\.rpc/);
  assert.match(cloudRequestSource, /\.eq\('id', data\)/);
  assert.doesNotMatch(cloudRequestSource, /latestBuilderRun/);
});

test('requires every future builder-package change to register a visible version', async () => {
  const instructions = await readFile(agentsInstructionsUrl, 'utf8');
  assert.match(instructions, /Builder-package version registration/);
  assert.match(instructions, /must create the next immutable decimal agent-package version/);
  assert.match(instructions, /Supabase workspaces and the local IndexedDB repository/);
  assert.match(instructions, /appears in Agent Studio's Test package selector/);
  assert.match(instructions, /Display every saved version in Package Versions/);
});

test('describes a compatible prior-manifest revision as a current-asset rebase', () => {
  const [homepage] = selectedSourcePages(manifest, 'homepage_test');
  const prompt = buildPrompt(
    {
      scopedRevision: true,
      rebasedToCurrentManifest: true,
      restoredCheckpoint: true,
      buildMode: 'homepage_test',
      stagedSourcePages: [homepage],
      allowedSourcePaths: ['app/page.tsx', 'app/globals.css'],
      allowedSourcePrefixes: ['components/site/'],
      agentPackage: { id: 'package-test', version: 8 },
    },
    undefined,
  );

  assert.match(prompt, /rebasing the completed private \//);
  assert.match(prompt, /current immutable manifest and approved assets/);
  assert.match(prompt, /Reference only the publicPath values/);
});

test('allows a prior-manifest page rebase only for the same immutable research source', () => {
  const current = {
    id: 'manifest-current',
    crawl_run_id: 'capture-1',
    research_packet_id: 'packet-1',
  };

  assert.equal(
    revisionManifestCompatible(current, {
      id: 'manifest-prior',
      crawl_run_id: 'capture-1',
      research_packet_id: 'packet-1',
    }),
    true,
  );
  assert.equal(
    revisionManifestCompatible(current, {
      id: 'manifest-other-capture',
      crawl_run_id: 'capture-2',
      research_packet_id: 'packet-1',
    }),
    false,
  );
  assert.equal(
    revisionManifestCompatible(current, {
      id: 'manifest-other-packet',
      crawl_run_id: 'capture-1',
      research_packet_id: 'packet-2',
    }),
    false,
  );
});

test('stages explicit logo-family appearance metadata for the builder', () => {
  const descriptor = approvedAssetDescriptor(
    {
      id: 'logo-white',
      label: 'White transparent logo',
      metadata: {
        logoVariant: 'appearance',
        logoAppearance: 'white',
        transparentBackground: true,
        derivedFromAssetId: 'logo-primary',
      },
    },
    'logo-primary',
    'public/assets/logo-white.png',
    'image/png',
  );

  assert.deepEqual(descriptor, {
    assetId: 'logo-white',
    relativePath: 'public/assets/logo-white.png',
    publicPath: '/assets/logo-white.png',
    contentType: 'image/png',
    label: 'White transparent logo',
    logoFamilyPrimaryAssetId: 'logo-primary',
    logoAppearance: 'white',
    transparentBackground: true,
  });
});

test('keeps reviewed asset roles and reuse guidance beside staged public paths', () => {
  const descriptor = approvedAssetDescriptor(
    { id: 'worksite', label: 'Switchboard upgrade', metadata: {} },
    'logo-primary',
    'public/assets/worksite.jpg',
    'image/jpeg',
    {
      role: 'worksite_photo',
      observedDescription: 'An electrician working at a switchboard.',
      safeReuseNote: 'Approved as homepage service imagery.',
      cautions: ['Do not identify the worker.'],
      visibleText: ['Main switch'],
    },
  );

  assert.equal(descriptor.role, 'worksite_photo');
  assert.equal(descriptor.safeReuseNote, 'Approved as homepage service imagery.');
  assert.deepEqual(descriptor.cautions, ['Do not identify the worker.']);
  assert.deepEqual(descriptor.visibleText, ['Main switch']);
});

test('stages byte-identical approved images once while preferring the primary logo record', () => {
  const groups = groupApprovedAssetsByContent(
    [
      { id: 'duplicate-logo', sha256: 'same-content' },
      { id: 'primary-logo', sha256: 'same-content' },
      { id: 'worksite', sha256: 'different-content' },
    ],
    'primary-logo',
  );

  assert.equal(groups.length, 2);
  assert.equal(groups[0].asset.id, 'primary-logo');
  assert.deepEqual(
    groups[0].assets.map((asset) => asset.id),
    ['duplicate-logo', 'primary-logo'],
  );
});

test('keeps all duplicate discovery locations beside the one staged asset', () => {
  const descriptor = approvedAssetDescriptor(
    { id: 'hero', metadata: {} },
    '',
    'public/assets/hero.jpg',
    'image/jpeg',
    {},
    {
      sourcePageUrls: ['https://example.com/', 'https://example.com/services'],
      sourceUrls: ['https://cdn.example.com/hero.jpg'],
      duplicateArtifactIds: ['hero-copy'],
    },
  );

  assert.deepEqual(descriptor.sourcePageUrls, [
    'https://example.com/',
    'https://example.com/services',
  ]);
  assert.deepEqual(descriptor.duplicateArtifactIds, ['hero-copy']);
});

test('normalises the hexadecimal apostrophe entity emitted by Next static HTML', () => {
  assert.equal(
    normaliseSemanticText('Couldn&#x27;t speak more highly'),
    "couldn't speak more highly",
  );
});

test('requires staged approved worksite photography to appear in selected output', () => {
  const assets = [
    {
      role: 'worksite_photo',
      contentType: 'image/jpeg',
      relativePath: 'public/assets/switchboard.jpg',
    },
  ];
  assert.equal(
    approvedImageUsageProblems(assets, [
      { relativePath: 'index.html', contents: '<main>No local imagery</main>' },
    ]).length,
    1,
  );
  assert.deepEqual(
    approvedImageUsageProblems(assets, [
      { relativePath: 'index.html', contents: '<img src="/assets/switchboard.jpg">' },
    ]),
    [],
  );
});

test('requires two distinct approved photographs when two are available', () => {
  const assets = [
    {
      role: 'worksite_photo',
      contentType: 'image/jpeg',
      relativePath: 'public/assets/switchboard.jpg',
    },
    {
      role: 'project_photo',
      contentType: 'image/webp',
      relativePath: 'public/assets/site-team.webp',
    },
  ];
  assert.equal(
    approvedImageUsageProblems(
      assets,
      [{ relativePath: 'index.html', contents: '<img src="/assets/switchboard.jpg">' }],
      2,
    ).length,
    1,
  );
  assert.deepEqual(
    approvedImageUsageProblems(
      assets,
      [
        {
          relativePath: 'index.html',
          contents: '<img src="/assets/switchboard.jpg"><img src="/assets/site-team.webp">',
        },
      ],
      2,
    ),
    [],
  );
});

test('requires reusable section components and semantic rhythm tokens', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-section-rhythm-'));
  try {
    await mkdir(join(directory, 'src/components'), { recursive: true });
    await writeFile(
      join(directory, 'src/components/sections.tsx'),
      'export const SectionShell = () => null; export function SectionHeading() { return null; }',
    );
    await writeFile(
      join(directory, 'src/globals.css'),
      ':root { --space-section-block: 4rem; --space-heading: 0.75rem; --space-copy: 1.5rem; }',
    );
    const html = [
      {
        relativePath: 'index.html',
        contents:
          '<h2>One</h2><div data-siteforge-section-shell><div data-siteforge-section-heading></div></div><h2>Two</h2><div data-siteforge-section-shell><div data-siteforge-section-heading></div></div>',
      },
    ];
    assert.deepEqual(await designSystemRhythmProblems(directory, html), []);
    await writeFile(join(directory, 'src/globals.css'), ':root { --space-heading: 1rem; }');
    assert.equal((await designSystemRhythmProblems(directory, html)).length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects brand-coloured scrollbar chrome and accepts neutral tokens', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-scrollbar-'));
  const stylesheet = join(directory, 'site.css');
  const colourManifest = {
    data: { brandKit: { palette: { primary: '#306090', accent: '#ff0000' } } },
  };
  try {
    await writeFile(
      stylesheet,
      ':root{--scrollbar-track:#306090;--scrollbar-thumb:#ff0000}*{scrollbar-color:var(--scrollbar-thumb) var(--scrollbar-track);scrollbar-width:auto}::-webkit-scrollbar{width:12px}::-webkit-scrollbar-thumb{background:#ff0000}',
    );
    assert.equal((await scrollbarStylingProblems([stylesheet], colourManifest, true)).length, 1);
    await writeFile(
      stylesheet,
      ':root{--scrollbar-track:#e6e6e6;--scrollbar-thumb:#4c4c4c}*{scrollbar-color:var(--scrollbar-thumb) var(--scrollbar-track);scrollbar-width:auto}::-webkit-scrollbar{width:12px;background:var(--scrollbar-track)}::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb)}',
    );
    assert.deepEqual(await scrollbarStylingProblems([stylesheet], colourManifest, true), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('applies exact reviewed brand colours to generated CSS tokens', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-brand-tokens-'));
  const stylesheet = join(directory, 'src/app/globals.css');
  try {
    await mkdir(dirname(stylesheet), { recursive: true });
    await writeFile(
      stylesheet,
      ':root {\n  --brand-primary: #162423;\n  --brand-accent: #ed5b2b;\n}\n',
    );
    const applied = await enforceBrandPaletteTokens(
      { data: { brandKit: { palette: { primary: '#306090', accent: '#FF0000' } } } },
      directory,
    );
    const result = await readFile(stylesheet, 'utf8');
    assert.deepEqual(applied, [
      { token: '--brand-primary', value: '#306090' },
      { token: '--brand-accent', value: '#ff0000' },
    ]);
    assert.match(result, /--brand-primary: #306090;/);
    assert.match(result, /--brand-accent: #ff0000;/);
    assert.doesNotMatch(result, /#162423|#ed5b2b/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('applies an accent-only palette without inventing a primary token', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-accent-only-tokens-'));
  const stylesheet = join(directory, 'src/app/globals.css');
  try {
    await mkdir(dirname(stylesheet), { recursive: true });
    await writeFile(stylesheet, ':root {\n  --brand-primary: #162423;\n}\n');
    const applied = await enforceBrandPaletteTokens(
      { data: { brandKit: { palette: { accent: '#E85D24', mode: 'accent_only' } } } },
      directory,
    );
    const result = await readFile(stylesheet, 'utf8');
    assert.deepEqual(applied, [{ token: '--brand-accent', value: '#e85d24' }]);
    assert.match(result, /--brand-primary: #162423;/);
    assert.match(result, /--brand-accent: #e85d24;/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('applies a primary-only palette without replacing the builder accent token', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-primary-only-tokens-'));
  const stylesheet = join(directory, 'src/app/globals.css');
  try {
    await mkdir(dirname(stylesheet), { recursive: true });
    await writeFile(stylesheet, ':root {\n  --brand-accent: #E85D24;\n}\n');
    const applied = await enforceBrandPaletteTokens(
      { data: { brandKit: { palette: { primary: '#306090', mode: 'primary_only' } } } },
      directory,
    );
    const result = await readFile(stylesheet, 'utf8');
    assert.deepEqual(applied, [{ token: '--brand-primary', value: '#306090' }]);
    assert.match(result, /--brand-primary: #306090;/);
    assert.match(result, /--brand-accent: #E85D24;/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('leaves both builder tokens untouched when both colour roles are delegated', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-builder-derived-tokens-'));
  const stylesheet = join(directory, 'src/app/globals.css');
  try {
    await mkdir(dirname(stylesheet), { recursive: true });
    await writeFile(
      stylesheet,
      ':root {\n  --brand-primary: #162423;\n  --brand-accent: #E85D24;\n}\n',
    );
    const applied = await enforceBrandPaletteTokens(
      { data: { brandKit: { palette: { mode: 'builder_derived' } } } },
      directory,
    );
    const result = await readFile(stylesheet, 'utf8');
    assert.deepEqual(applied, []);
    assert.match(result, /--brand-primary: #162423;/);
    assert.match(result, /--brand-accent: #E85D24;/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('recognises minified CSS equivalents of reviewed brand colours', () => {
  assert.deepEqual(cssColourRepresentations('#FF0000'), ['#ff0000', '#f00', 'red']);
  assert.deepEqual(cssColourRepresentations('#306090'), ['#306090']);
});

test('bounds protected builder requests so a stalled upload cannot stop heartbeats', async () => {
  const stalledFetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
  const keepEventLoopActive = setTimeout(() => undefined, 50);
  try {
    await assert.rejects(
      fetchWithRequestTimeout('https://example.invalid', {}, 5, stalledFetch),
      (error) => error?.name === 'TimeoutError',
    );
  } finally {
    clearTimeout(keepEventLoopActive);
  }
});

test('keeps a timed-out manifest read recoverable instead of reporting missing input', () => {
  const details = failureDetails(new BuilderManifestError({ code: 'UND_ERR_CONNECT_TIMEOUT' }));
  assert.equal(details.code, 'build_manifest_temporarily_unavailable');
  assert.equal(details.stage, 'manifest_lookup');
  assert.equal(details.retryable, true);
  assert.match(details.action, /retry once automatically/i);
});

test('keeps an unclassified protected workspace timeout recoverable', () => {
  const details = failureDetails(new Error('The operation was aborted due to timeout'));
  assert.equal(details.code, 'protected_workspace_temporary_failure');
  assert.equal(details.stage, 'protected_workspace');
  assert.equal(details.retryable, true);
  assert.match(details.action, /saved source checkpoint/i);
});

test('classifies captured page lookup failures as recoverable input staging', () => {
  const details = failureDetails(new BuilderInputError('captured_content_lookup', { status: 544 }));
  assert.equal(details.code, 'builder_input_temporary_failure');
  assert.equal(details.stage, 'input_staging');
  assert.equal(details.retryable, true);
  assert.equal(details.context.operation, 'captured_content_lookup');
});

test('classifies approved asset transport failures as recoverable staging', () => {
  const details = failureDetails(
    new BuilderAssetError('approved_asset_download', { status: 544 }, 'asset-1'),
  );
  assert.equal(details.code, 'approved_asset_temporary_failure');
  assert.equal(details.stage, 'asset_staging');
  assert.equal(details.retryable, true);
  assert.equal(details.context.assetId, 'asset-1');
});

test('retries protected workspace polling without restarting the builder process', async () => {
  const worker = await readFile(
    new URL('../../worker/builder-worker.mjs', import.meta.url),
    'utf8',
  );
  assert.match(worker, /protected workspace request failed; retrying without restarting/);
  assert.match(worker, /await wait\(pollIntervalMs\)/);
});

test('accepts locked-runtime logo sequencing while still requiring a navigation logo', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-navigation-sequence-'));
  const source = join(directory, 'navigation.tsx');
  try {
    await writeFile(
      source,
      '<aside data-sf-navigation-motion><img data-siteforge-navigation-logo />' +
        '<a data-sf-navigation-item>One</a><a data-sf-navigation-item>Two</a>' +
        '<a data-sf-navigation-item>Three</a></aside>',
    );
    assert.deepEqual(await expressiveNavigationMotionProblems([source], true, true), []);
    assert.match(
      (await expressiveNavigationMotionProblems([source], true, false)).join(' '),
      /logo must be the first sequenced item/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('accepts contrast-safe logo appearances for their declared surfaces', () => {
  const assets = [
    {
      assetId: 'logo-white',
      relativePath: 'public/assets/logo-white.png',
      logoFamilyPrimaryAssetId: 'logo-primary',
      logoAppearance: 'white',
    },
    {
      assetId: 'logo-black',
      relativePath: 'public/assets/logo-black.png',
      logoFamilyPrimaryAssetId: 'logo-primary',
      logoAppearance: 'black',
    },
  ];
  const problems = contextualLogoProblems('logo-primary', assets, [
    '<img src="assets/logo-white.png" data-siteforge-logo-context="dark" data-siteforge-logo-appearance="white" alt="Example">',
    '<img src="assets/logo-black.png" data-siteforge-logo-context="light" data-siteforge-logo-appearance="black" alt="Example">',
  ]);

  assert.deepEqual(problems, []);
});

test('flags a light logo selected for a declared light surface', () => {
  const assets = [
    {
      assetId: 'logo-white',
      relativePath: 'public/assets/logo-white.png',
      logoFamilyPrimaryAssetId: 'logo-primary',
      logoAppearance: 'white',
    },
    {
      assetId: 'logo-black',
      relativePath: 'public/assets/logo-black.png',
      logoFamilyPrimaryAssetId: 'logo-primary',
      logoAppearance: 'black',
    },
  ];
  const problems = contextualLogoProblems('logo-primary', assets, [
    '<img src="assets/logo-white.png" data-siteforge-logo-context="light" data-siteforge-logo-appearance="white" alt="Example">',
  ]);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /white logo on a declared light surface/);
});

test('registers the subscription tmux builder once above retained package versions', async () => {
  const [migration, repository, app, worker, cloudRepository, launcher, supervisor] =
    await Promise.all([
      readFile(subscriptionBuilderPackageMigrationUrl, 'utf8'),
      readFile(repositoryUrl, 'utf8'),
      readFile(appUrl, 'utf8'),
      readFile(new URL('../../worker/builder-worker.mjs', import.meta.url), 'utf8'),
      readFile(cloudRepositoryUrl, 'utf8'),
      readFile(new URL('../../scripts/codespace-work', import.meta.url), 'utf8'),
      readFile(new URL('../../worker/supervisor.mjs', import.meta.url), 'utf8'),
    ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Subscription builder runtime test package:/);
  assert.match(migration, /persistent named tmux builder runtime/);
  assert.match(migration, /ChatGPT sign-in for subscription access/);
  assert.match(migration, /"framework-quality-gates"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.2,/);
  assert.match(repository, /basePackageId: localCompactCodexComposerPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localSubscriptionBuilderPackage,') <
      packageLedger.indexOf('localCompactCodexComposerPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(
    app,
    /completed prospect builds now lead with their current outcome and repair action/,
  );
  assert.match(
    app,
    /technical activity, replacement builds, and deletion move into secondary disclosures/,
  );
  assert.match(app, /Build conversation/);
  assert.match(worker, /billingMode: 'chatgpt_subscription'/);
  assert.match(worker, /logged in using chatgpt/i);
  assert.match(worker, /forced_login_method="chatgpt"/);
  assert.match(cloudRepository, /contains\('metadata', \{ stream: 'codex' \}\)/);
  assert.match(launcher, /-n builds/);
  assert.match(launcher, /scripts\/start-subscription-builder/);
  assert.match(launcher, /SITEFORGE_EXTERNAL_BUILDER=1 npm run start:local/);
  assert.match(supervisor, /SITEFORGE_EXTERNAL_BUILDER/);
});
