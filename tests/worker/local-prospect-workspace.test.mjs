import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  developmentServerHostFlag,
  authorizeWorkspaceCodexRequest,
  localCaptureTarget,
  previewUrl,
  prospectCodexWorkspace,
  readFinalEditState,
  readLearningBundle,
  readRefinementLedger,
  studioOrigin,
  workspacePreviewWorkspace,
  workspaceCodexCookieName,
} from '../../scripts/local-workspace-vite-plugin.mjs';
import { createWorkspacePreviewToken } from '../../scripts/workspace-preview-access.mjs';

const scriptUrl = new URL('../../scripts/open-prospect-workspace.mjs', import.meta.url);
const packageUrl = new URL('../../package.json', import.meta.url);
const viteConfigUrl = new URL('../../vite.config.ts', import.meta.url);
const vitePluginUrl = new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url);
const studioRuntimeUrl = new URL('../../src/lib/studio-runtime.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const localDevUrl = new URL('../../worker/local-dev.mjs', import.meta.url);
const finaliseUrl = new URL('../../scripts/finalize-prospect-workspace.mjs', import.meta.url);

test('limits popup-free screenshots to validated local workspace ports', () => {
  assert.equal(
    localCaptureTarget(
      'https://silver-fiesta-xg6xjqvw4pvhp477-3000.app.github.dev/services?tab=one',
    ),
    'http://127.0.0.1:3000/services?tab=one',
  );
  assert.equal(
    localCaptureTarget('http://localhost:5173/#/prospects/example/editing'),
    'http://127.0.0.1:5173/#/prospects/example/editing',
  );
  assert.throws(() => localCaptureTarget('https://example.com/'), /Only the current local/);
  assert.throws(() => localCaptureTarget('http://127.0.0.1:4500/'), /Only the current local/);
});

test('opens a private prospect repository inside the ignored Studio workspace directory', async () => {
  const source = await readFile(scriptUrl, 'utf8');
  const packageDocument = JSON.parse(await readFile(packageUrl, 'utf8'));
  const help = execFileSync(process.execPath, [fileURLToPath(scriptUrl), '--help'], {
    encoding: 'utf8',
  });

  assert.match(help, /npm run workspace:open -- --repository OWNER\/REPOSITORY/);
  assert.equal(
    packageDocument.scripts['workspace:open'],
    'node scripts/open-prospect-workspace.mjs',
  );
  assert.match(source, /prospect-workspaces/);
  assert.match(source, /\['repo', 'clone', repository, destination\]/);
  assert.match(source, /\['-C', destination, 'pull', '--ff-only'\]/);
  assert.match(source, /if \(workspaceExists\)/);
  assert.match(source, /remote', 'get-url', 'origin'/);
  assert.match(source, /originRepository\.toLowerCase\(\) !== repository\.toLowerCase\(\)/);
  assert.match(source, /delete githubEnvironment\.GITHUB_TOKEN/);
  assert.match(source, /\['auth', 'setup-git'\]/);
  assert.match(source, /made-solid:log/);
  assert.match(source, /made-solid:summary/);
  assert.match(source, /made-solid:bundle/);
  assert.match(source, /'ci', '--no-audit', '--no-fund'/);
  assert.match(source, /current editor file tree/);
  assert.doesNotMatch(source, /code', \['--add'/);
});

test('exposes same-origin one-click workspace setup through the local Studio server', async () => {
  const [config, source, localDev] = await Promise.all([
    readFile(viteConfigUrl, 'utf8'),
    readFile(vitePluginUrl, 'utf8'),
    readFile(localDevUrl, 'utf8'),
  ]);

  assert.match(config, /localWorkspacePlugin\(\)/);
  assert.match(localDev, /viteConfigPath/);
  assert.match(localDev, /'--config'/);
  assert.match(source, /\/__made-solid\/local-workspace/);
  assert.match(source, /\/__made-solid\/workspace-preview-access/);
  assert.match(source, /activeWorkspacePreview\(\)/);
  assert.match(source, /readyWorkspacePreview\(request, requestedDirectory\)/);
  assert.match(source, /workspacePreviewRecoveryPromise/);
  assert.match(source, /websiteIsReady\(active\.port\)/);
  assert.match(source, /workspacePreviewUrl\(origin, active\.directory, secret\)/);
  assert.match(source, /\/__made-solid\/refinement-ledger/);
  assert.match(source, /request\.method !== 'POST'/);
  assert.match(source, /sec-fetch-site/);
  assert.match(source, /repositoryPattern\.test\(repository\)/);
  assert.match(source, /open-prospect-workspace\.mjs/);
  assert.match(source, /export-local-build\.mjs/);
  assert.match(source, /buildIdPattern\.test\(buildId\)/);
  assert.match(source, /directoryPattern\.test\(directory\)/);
  assert.match(source, /existsSync\(resolve\('prospect-workspaces', directory, '\.git'\)\)/);
  assert.match(source, /'npm'/);
  assert.match(source, /'ci', '--no-audit', '--no-fund'/);
  assert.match(source, /'tmux'/);
  assert.match(source, /'new-session'/);
  assert.match(source, /remain-on-exit/);
  assert.match(source, /'NODE_ENV=development'/);
  assert.match(source, /'npm',\s+'run',\s+'dev'/);
  assert.match(source, /waitForWebsite/);
  assert.match(source, /\.app\.github\.dev/);
  assert.match(source, /application\/x-ndjson/);
  assert.match(source, /phase: 'accessing'/);
  assert.match(source, /phase: 'cloning'/);
  assert.match(source, /phase: 'updating'/);
  assert.match(source, /phase: 'verifying'/);
  assert.match(source, /phase: 'installing'/);
  assert.match(source, /phase: 'launching'/);
  assert.match(source, /phase: 'ready'/);
  assert.match(source, /previewUrl:/);
});

test('recovers workspace previews only from configured persistent repository roots', () => {
  const existing = new Set([
    '/data/workspaces/siteforge-os/.git',
    '/data/workspaces/siteforge-os/package.json',
    '/data/prospect-workspaces/customer-site/.git',
    '/data/prospect-workspaces/customer-site/package.json',
  ]);
  const environment = {
    SITEFORGE_STUDIO_WORKSPACE_DIR: '/data/workspaces/siteforge-os',
    MADE_SOLID_WEBSITE_DIRECTORY: '/data/workspaces/made-solid-website',
    SITEFORGE_PROSPECT_WORKSPACES_DIR: '/data/prospect-workspaces',
  };
  const pathExists = (path) => existing.has(path);

  assert.equal(
    workspacePreviewWorkspace('siteforge-os', environment, pathExists),
    '/data/workspaces/siteforge-os',
  );
  assert.equal(
    workspacePreviewWorkspace('customer-site', environment, pathExists),
    '/data/prospect-workspaces/customer-site',
  );
  assert.equal(workspacePreviewWorkspace('../siteforge-os', environment, pathExists), undefined);
  assert.equal(workspacePreviewWorkspace('missing-site', environment, pathExists), undefined);
  assert.equal(
    prospectCodexWorkspace('customer-site', environment, pathExists),
    '/data/prospect-workspaces/customer-site',
  );
  assert.equal(prospectCodexWorkspace('siteforge-os', environment, pathExists), undefined);
  assert.equal(prospectCodexWorkspace('../customer-site', environment, pathExists), undefined);
});

test('binds every client Codex request to its exact workspace capability cookie', () => {
  const secret = 'workspace-codex-test-secret-with-at-least-thirty-two-characters';
  const environment = {
    SITEFORGE_WORKSPACE_PREVIEW_SECRET: secret,
    SITEFORGE_PROSPECT_WORKSPACES_DIR: '/data/prospect-workspaces',
  };
  const pathExists = (path) =>
    path === '/data/prospect-workspaces/client-a/.git' ||
    path === '/data/prospect-workspaces/client-a/package.json' ||
    path === '/data/prospect-workspaces/client-b/.git' ||
    path === '/data/prospect-workspaces/client-b/package.json';
  const token = createWorkspacePreviewToken('client-a', secret);
  const request = {
    headers: {
      cookie: `${workspaceCodexCookieName('client-a')}=${encodeURIComponent(token)}`,
    },
  };

  assert.equal(authorizeWorkspaceCodexRequest(request, 'client-a', environment, pathExists), true);
  assert.equal(authorizeWorkspaceCodexRequest(request, 'client-b', environment, pathExists), false);
  assert.equal(
    authorizeWorkspaceCodexRequest({ headers: {} }, 'client-a', environment, pathExists),
    false,
  );
  assert.equal(
    authorizeWorkspaceCodexRequest(request, '../client-a', environment, pathExists),
    false,
  );
});

test('requires the server-bound Workspace Codex identity on scoped status and mutations', async () => {
  const [service, runtime] = await Promise.all([
    readFile(vitePluginUrl, 'utf8'),
    readFile(studioRuntimeUrl, 'utf8'),
  ]);

  assert.match(runtime, /window\.location\.pathname !== '\/__made-solid\/workspace-codex'/);
  assert.match(runtime, /X-Made-Solid-Workspace-Codex/);
  assert.match(service, /request\.headers\['x-made-solid-workspace-codex'\]/);
  assert.match(service, /workspace !== embeddedWorkspace/);
  assert.match(service, /input\.workspace !== embeddedWorkspace/);
  assert.match(service, /authorizeWorkspaceCodexRequest\(request, embeddedWorkspace\)/);
});

test('uses the development server host flag supported by the saved workspace', () => {
  assert.equal(
    developmentServerHostFlag({ scripts: { dev: 'vite --config vite.config.ts' } }),
    '--host',
  );
  assert.equal(developmentServerHostFlag({ scripts: { dev: 'next dev' } }), '--hostname');
});

test('reads only a validated prospect refinement ledger for the live launcher feed', async () => {
  const rejected = await readRefinementLedger('../lecegroup');
  assert.equal(rejected.status, 'failed');
  assert.deepEqual(rejected.entries, []);

  const ledger = await readRefinementLedger('lecegroup');
  assert.ok(['empty', 'ready'].includes(ledger.status));
  assert.ok(Array.isArray(ledger.entries));
  assert.match(ledger.detail, /refinement/i);
  if (ledger.entries.length) {
    assert.equal('gitCommit' in ledger.entries[0], false);
    assert.equal('evidence' in ledger.entries[0], false);
  }
});

test('turns a missing ledger middleware response into an actionable reconnect state', async () => {
  const source = await readFile(appUrl, 'utf8');

  assert.match(source, /response\.headers\.get\('content-type'\)/);
  assert.match(source, /responseType\.includes\('application\/json'\)/);
  assert.match(source, /live refinement service is not connected/i);
  assert.match(source, /Restart Made Solid Studio to reconnect it/);
  assert.match(source, /previewWindow && !previewWindow\.closed/);
  assert.match(source, /window\.location\.assign\(destination\)/);
  assert.doesNotMatch(source, /window\.history\.replaceState\(null, '', destination\)/);
});

test('reads a committed learning bundle through the validated local workspace service', async () => {
  const rejected = await readLearningBundle('../lecegroup');
  assert.equal(rejected.status, 'failed');
  assert.deepEqual(rejected.entries, []);

  const bundle = await readLearningBundle('lecegroup');
  assert.equal(bundle.status, 'ready');
  assert.ok(bundle.entries.length > 0);
  assert.equal(bundle.origin.studioBuildId, 'f906bbf7-a333-4bfa-bcfb-f667e7f1259b');
  assert.equal(
    bundle.entries.some((entry) => entry.classification === 'strict_invariant'),
    true,
  );
  assert.equal('evidence' in bundle.entries[0], false);
  assert.equal('gitCommit' in bundle.entries[0], false);
});

test('exposes a validated, staged final-edit checkpoint for the prospect repository', async () => {
  const [pluginSource, finaliseSource, appSource] = await Promise.all([
    readFile(vitePluginUrl, 'utf8'),
    readFile(finaliseUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  const rejected = await readFinalEditState('../lecegroup');
  assert.equal(rejected.status, 'failed');

  const current = await readFinalEditState('lecegroup');
  assert.ok(['changes_pending', 'ready', 'finalised', 'unavailable'].includes(current.status));
  if (current.status !== 'unavailable') {
    assert.ok(Array.isArray(current.versions));
    assert.ok(Number.isInteger(current.workingVersion));
    assert.equal(typeof current.sourceBuild?.buildId, 'string');
  }
  assert.match(pluginSource, /\/__made-solid\/final-edit/);
  assert.match(pluginSource, /finalize-prospect-workspace\.mjs/);
  assert.match(pluginSource, /application\/x-ndjson/);
  assert.match(pluginSource, /\/__made-solid\/committed-preview/);
  assert.match(pluginSource, /editVersionHistory/);
  assert.match(pluginSource, /git', \['worktree', 'add', '--detach'/);
  assert.match(pluginSource, /Choose a committed Made Solid edit version/);
  assert.match(pluginSource, /Committed edit v\$\{version\.version\}/);
  assert.match(finaliseSource, /function verifyWorkspace/);
  assert.match(finaliseSource, /made-solid-final-edit-/);
  assert.match(finaliseSource, /excludedDirectories/);
  assert.match(finaliseSource, /CIRCLE_NODE_TOTAL: '2'/);
  assert.match(finaliseSource, /NEXT_TELEMETRY_DISABLED: '1'/);
  assert.match(finaliseSource, /NODE_ENV: 'production'/);
  assert.match(finaliseSource, /symlinkSync\(\s*resolve\(workspace, 'node_modules'/);
  assert.match(
    finaliseSource,
    /npm', \['run', 'verify'\], verificationWorkspace, verificationEnvironment/,
  );
  assert.match(finaliseSource, /rmSync\(verificationRoot, \{ recursive: true, force: true \}\)/);
  assert.match(finaliseSource, /isTransientNextExportFailure/);
  assert.match(finaliseSource, /Retrying the complete verification once/);
  assert.match(finaliseSource, /result\.stdout/);
  assert.match(finaliseSource, /noteworthyLines/);
  assert.match(finaliseSource, /warning-keys/);
  assert.match(finaliseSource, /npm', \['run', 'made-solid:bundle'\]/);
  assert.match(finaliseSource, /git\(workspace, 'add', '-A'\)/);
  assert.match(finaliseSource, /git\(workspace, 'commit', '-m'/);
  assert.match(finaliseSource, /Made Solid edit v\$\{editVersion\}/);
  assert.match(finaliseSource, /run\('git', \['push', 'origin', branch\]/);
  assert.match(finaliseSource, /delete githubEnvironment\.GITHUB_TOKEN/);
  assert.match(finaliseSource, /'gh', \['auth', 'setup-git'\]/);
  assert.doesNotMatch(finaliseSource, /emit\([^)]*remote/s);
  assert.match(appSource, /Commit website edit/);
  assert.match(appSource, /Made Solid handoff/);
  assert.match(appSource, /Push committed edit to Made Solid/);
  assert.match(appSource, /Made Solid handoff is not connected/);
  assert.doesNotMatch(appSource, /website-admin connection is not configured/i);
});

test('uses the forwarded Codespaces port URL only inside Codespaces', () => {
  const request = { headers: { host: 'localhost:5173' } };

  assert.equal(previewUrl(request, 3000, {}), 'http://localhost:3000');
  assert.equal(
    previewUrl(request, 3001, {
      CODESPACE_NAME: 'silver-fiesta-xg6xjqvw4pvhp477',
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
    }),
    'https://silver-fiesta-xg6xjqvw4pvhp477-3001.app.github.dev',
  );
});

test('limits the embedded Studio origin to local and Codespaces hosts', () => {
  assert.equal(studioOrigin({ headers: { host: 'localhost:5173' } }, {}), 'http://localhost:5173');
  assert.equal(
    studioOrigin({ headers: { host: 'silver-fiesta-5173.app.github.dev' } }, {}),
    'https://silver-fiesta-5173.app.github.dev',
  );
  assert.equal(
    studioOrigin({ headers: { host: 'attacker.example' } }, {}),
    'http://127.0.0.1:5173',
  );
  assert.equal(
    studioOrigin(
      { headers: { host: 'localhost:5173' } },
      { SITEFORGE_PUBLIC_ORIGIN: 'https://studio.madesolid.com.au/' },
    ),
    'https://studio.madesolid.com.au',
  );
});
