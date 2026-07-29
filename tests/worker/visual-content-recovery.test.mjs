import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260728130000_visual_content_recovery.sql',
  import.meta.url,
);
const manifestUrl = new URL('../../src/lib/build-manifest.ts', import.meta.url);
const contractUrl = new URL('../../worker/codex-builder-contract.md', import.meta.url);
const featureContractUrl = new URL(
  '../../worker/builder-template/feature-contracts/semantic-content-recovery.md',
  import.meta.url,
);
const builderWorkerUrl = new URL('../../worker/builder-worker.mjs', import.meta.url);
const workerUrl = new URL('../../worker/asset-analysis-worker.mjs', import.meta.url);
const structuredWorkerUrl = new URL('../../worker/visual-content-worker.mjs', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const redesignBriefUrl = new URL('../../src/lib/redesign-brief.ts', import.meta.url);
const cloudRepositoryUrl = new URL('../../src/lib/cloud-repository.ts', import.meta.url);

test('visual content recovery reuses saved annotations and preserves page provenance', async () => {
  const migration = await readFile(migrationUrl, 'utf8');

  assert.match(migration, /from public\.asset_annotations annotations/);
  assert.match(migration, /join public\.artifacts artifacts/);
  assert.match(migration, /source_page_url/);
  assert.match(migration, /sourcePresentationIsNotAnInstruction/);
  assert.doesNotMatch(migration, /http|crawl_page_queue|request_research_capture/i);
});

test('approved image content leaves presentation to the builder', async () => {
  const [manifest, contract, featureContract] = await Promise.all([
    readFile(manifestUrl, 'utf8'),
    readFile(contractUrl, 'utf8'),
    readFile(featureContractUrl, 'utf8'),
  ]);

  assert.match(manifest, /groupApprovedVisualContent/);
  assert.match(manifest, /approvedVisualContentGroups/);
  assert.match(manifest, /integrationInstruction: 'builder_decides'/);
  assert.match(contract, /presentationInstruction: "builder_decides"/);
  assert.match(
    contract,
    /grouped deterministically by source page, section context, and semantic role/,
  );
  assert.match(featureContract, /Required group and item coverage/);
  assert.match(featureContract, /Builder design decision/);
  assert.match(featureContract, /data-siteforge-recovered-group-id/);
  assert.match(featureContract, /data-siteforge-recovered-content-id/);
  assert.match(featureContract, /SEMANTIC_DESIGN_DECISIONS\.json/);
  assert.match(featureContract, /Single-pass design discipline/);
  assert.match(featureContract, /contentShape/);
  assert.match(featureContract, /brandConnection/);
  assert.match(featureContract, /there is no\s+second model review or automatic styling pass/);
  assert.doesNotMatch(featureContract, /Testimonials and feedback|Customer feedback/);
});

test('semantic design quality stays inside the original build run', async () => {
  const worker = await readFile(builderWorkerUrl, 'utf8');

  assert.match(worker, /function semanticCompositionDecisionCheck/);
  assert.match(worker, /must name its actual/);
  assert.match(worker, /intentional mobile and tablet\/desktop transformation/);
  assert.doesNotMatch(worker, /semantic_design_refinement|stageSemanticDesignRefinement/);
});

test('builder quality fails when selected-page recovered content is omitted', async () => {
  const [app, worker, { buildPrompt, semanticContentCoverageCheck }] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(builderWorkerUrl, 'utf8'),
    import(builderWorkerUrl),
  ]);

  assert.match(app, /Semantic recovery contract/);
  assert.match(app, /feature-contracts\/semantic-content-recovery\.md/);
  assert.match(worker, /function semanticContentCoverageCheck/);
  assert.match(worker, /semanticElementRules/);
  assert.match(worker, /semantic-content-coverage/);
  assert.match(worker, /omits approved recovered group/);
  assert.match(worker, /omits approved recovered content/);
  assert.match(worker, /does not preserve all required semantic information/);

  const promptWorkspace = {
    restoredCheckpoint: false,
    stagedSourcePages: [{ sourceUrl: 'https://example.com/', outputPath: 'index.html' }],
    agentPackage: {
      id: 'package-test',
      version: 5,
      contract_addendum: '',
      instructions_addendum: '',
    },
    scopedRevision: false,
    rebasedToCurrentManifest: false,
    allowedSourcePaths: [],
  };
  for (const buildMode of ['homepage_test', 'complete']) {
    const prompt = buildPrompt({ ...promptWorkspace, buildMode });
    assert.match(prompt, /approvedVisualContentGroups/);
    assert.match(prompt, /Account for every approved group and item/);
    assert.match(prompt, /own its heading, placement, layout, interaction/);
  }

  const testimonialItems = [
    {
      id: 'testimonial-one',
      structuredContent: {
        kind: 'testimonial',
        testimonial: {
          quote: 'The crew communicated clearly.',
          person: '',
          role: 'Supervisor',
          organisation: 'Example Operations',
        },
      },
    },
    {
      id: 'testimonial-two',
      structuredContent: {
        kind: 'testimonial',
        testimonial: {
          quote: 'The work was completed safely.',
          person: '',
          role: 'Director',
          organisation: 'Example Industries',
        },
      },
    },
  ];
  const manifest = {
    data: {
      approvedVisualContentGroups: [
        {
          id: 'testimonial-group',
          sourcePageUrl: 'https://example.com/',
          items: testimonialItems,
        },
      ],
    },
  };
  const completeHtml = {
    relativePath: 'index.html',
    contents: `
      <meta name="siteforge-source-url" content="https://example.com/">
      <section data-siteforge-recovered-group-id="testimonial-group">
        <blockquote data-siteforge-recovered-content-id="testimonial-one">
          The crew communicated clearly. Supervisor, Example Operations
        </blockquote>
        <blockquote data-siteforge-recovered-content-id="testimonial-two">
          The work was completed safely. Director, Example Industries
        </blockquote>
      </section>
    `,
  };
  assert.deepEqual(semanticContentCoverageCheck(manifest, [completeHtml]), {
    expectedGroupCount: 1,
    expectedItemCount: 2,
    problems: [],
  });
  const incompleteHtml = {
    ...completeHtml,
    contents: completeHtml.contents.replace(
      /<blockquote data-siteforge-recovered-content-id="testimonial-two">[\s\S]*?<\/blockquote>/,
      '',
    ),
  };
  assert.match(
    semanticContentCoverageCheck(manifest, [incompleteHtml]).problems.join(' '),
    /omits approved recovered content testimonial-two/,
  );
});

test('future asset analyses run semantic recovery after saving vision results', async () => {
  const worker = await readFile(workerUrl, 'utf8');

  assert.match(worker, /request_visual_content_extraction/);
  assert.match(worker, /visual-content recovery was not available/);
});

test('focused saved-image analysis preserves tables and uncertainty as semantic data', async () => {
  const worker = await readFile(structuredWorkerUrl, 'utf8');

  assert.match(worker, /structured_visual_content/);
  assert.match(worker, /'table'/);
  assert.match(worker, /columns/);
  assert.match(worker, /rows/);
  assert.match(worker, /footnotes/);
  assert.match(worker, /uncertainties/);
  assert.match(worker, /Every row must have the same number of cells as columns/);
  assert.match(worker, /Short standalone lines placed directly beneath the quote/);
  assert.match(worker, /do not leave those attribution lines inside quote/);
  assert.match(worker, /sourcePresentation: candidate\.source_presentation/);
  assert.doesNotMatch(worker, /request_research_capture|crawl_page_queue/);
});

test('ready recovered content can be approved once for test and complete builds', async () => {
  const [app, redesignBrief] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(redesignBriefUrl, 'utf8'),
  ]);

  assert.match(app, /Approve all \$\{approvableCount\} for builds/);
  assert.match(app, /async function approveAllVisualContent/);
  assert.match(app, /await prepareCurrentBuildHandoff\(workspace\.business\.id\)/);
  assert.match(app, /await prepareCurrentBuildHandoff\(businessId\)/);
  assert.match(app, /if \(!hasOtherReadyItems\)/);
  assert.match(app, /await prepareCurrentBuildHandoff\(candidate\.businessId\)/);
  assert.match(app, /Agent Studio tests and complete prospect builds/);
  assert.match(redesignBrief, /visualContentMatchesBrief/);
  assert.match(redesignBrief, /approvedVisualContentFromCandidates\(candidates\)/);
});

test('an existing brief capability inventory is reused before requesting more analysis', async () => {
  const repository = await readFile(cloudRepositoryUrl, 'utf8');
  const createBrief = repository.slice(repository.indexOf('async createRedesignBrief'));

  assert.match(createBrief, /hasReusableCapabilityInventory/);
  assert.match(createBrief, /!hasReusableCapabilityInventory/);
  assert.ok(
    createBrief.indexOf('const latestBrief') < createBrief.indexOf('request_capability_analysis'),
    'the current brief must be inspected before another analysis job is requested',
  );
});

test('approved recovered content survives brief loading and rejects a stale manifest', async () => {
  const [repository, manifest] = await Promise.all([
    readFile(cloudRepositoryUrl, 'utf8'),
    readFile(manifestUrl, 'utf8'),
  ]);

  assert.match(repository, /approvedVisualContent: Array\.isArray\(draft\.approvedVisualContent\)/);
  assert.match(repository, /currentManifestContentMatchesBrief\(workspace, latestBrief\)/);
  assert.match(manifest, /export function currentManifestContentMatchesBrief/);
  assert.match(manifest, /manifest\.data\.approvedVisualContent/);
  assert.match(manifest, /brief\.draft\.approvedVisualContent/);
});
