import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  approvedAssetDescriptor,
  buildPrompt,
  checkpointSourceBody,
  contentTypeFor,
  contextualLogoProblems,
  inconsistentHeaderNavigationProblems,
  lockedFoundationPaths,
  mobileNavigationTriggerProblems,
  missingInternalNavigationTargets,
  revisionManifestCompatible,
  selectedSourcePages,
  stageRevisionScope,
  unreachableSelectedPageProblems,
} from '../../worker/builder-worker.mjs';

const appUrl = new URL('../../src/App.tsx', import.meta.url);
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

function compiledPreviewFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf('\n}\n', start);
  assert.notEqual(start, -1);
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
  assert.match(previewFunction, /data-siteforge-preview-navigation/);
  assert.match(previewFunction, /trigger\.setAttribute\('aria-expanded', 'true'\)/);
  assert.match(previewFunction, /event\.key === 'Escape'/);
  assert.match(previewFunction, /trigger\.focus\(\)/);
  assert.match(previewFunction, /data-siteforge-preview-loading/);
  assert.match(previewFunction, /window\.addEventListener\('load', revealDocument/);
  assert.match(previewFrame, /message\.type === 'siteforge-preview:navigated'/);
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

test('keeps the static export visible without running Next hydration in the opaque sandbox', async () => {
  const previewFunction = await readFile(previewFunctionUrl, 'utf8');
  const removeHydration = compiledPreviewFunction(previewFunction, 'removeNextHydrationRuntime');
  const source = [
    '<link rel="preload" as="script" href="/_next/static/chunks/runtime.js">',
    '<script src="/_next/static/chunks/runtime.js" async=""></script>',
    '<script>(self.__next_f=self.__next_f||[]).push([0])</script>',
    '<script>self.__next_f.push([1,"page payload"])</script>',
    '<link rel="stylesheet" href="/_next/static/site.css">',
    '<main><h1>Generated website</h1></main>',
    '<script src="/site-runtime.js"></script>',
  ].join('');
  const staticDocument = removeHydration(source);

  assert.doesNotMatch(staticDocument, /as="script"/);
  assert.doesNotMatch(staticDocument, /_next\/static\/chunks/);
  assert.doesNotMatch(staticDocument, /self\.__next_f/);
  assert.match(staticDocument, /href="\/_next\/static\/site\.css"/);
  assert.match(staticDocument, /<main><h1>Generated website<\/h1><\/main>/);
  assert.match(staticDocument, /src="\/site-runtime\.js"/);
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

test('stores Next static-export payload files as allowed plain text', () => {
  assert.equal(contentTypeFor('__next._tree.txt'), 'text/plain');
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
