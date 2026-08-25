import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { authorizeStudioRuntimeRequest } from './studio-runtime-auth.mjs';
import {
  apiCreditsBillingMode,
  runtimeAiBillingStatus,
  writeRuntimeAiBillingMode,
} from './runtime-ai-billing.mjs';
import {
  googleSpeechConfiguration,
  loadGoogleSpeechConfiguration,
  synthesizeGoogleSpeech,
} from './google-cloud-tts.mjs';
import {
  createWorkspaceStudioToken,
  verifyWorkspacePreviewToken,
  workspaceFrameUrl,
} from './workspace-preview-access.mjs';
import { assertPublicUrl } from '../worker/security.mjs';
import { CodexPushNotifications } from './codex-push-notifications.mjs';
import { studioDevelopmentOrigins } from './studio-development-origins.mjs';

const localWorkspaceEndpoint = '/__made-solid/local-workspace';
const workspacePreviewAccessEndpoint = '/__made-solid/workspace-preview-access';
const workspaceDevelopmentAccessEndpoint = '/__made-solid/workspace-development-access';
const developmentProjectsEndpoint = '/__made-solid/development-projects';
const workspaceCodexEndpoint = '/__made-solid/workspace-codex';
const refinementLedgerEndpoint = '/__made-solid/refinement-ledger';
const learningBundleEndpoint = '/__made-solid/learning-bundle';
const finalEditEndpoint = '/__made-solid/final-edit';
const committedPreviewEndpoint = '/__made-solid/committed-preview';
const codexFeedbackEndpoint = '/__made-solid/codex-feedback';
const codexBranchEndpoint = '/__made-solid/codex-branch';
const codexStatusEndpoint = '/__made-solid/codex-status';
const codexNotificationsEndpoint = '/__made-solid/codex-notifications';
const aiBillingModeEndpoint = '/__made-solid/ai-billing-mode';
const codexSpeechEndpoint = '/__made-solid/codex-speech';
const codexAttachmentPrefix = '/__made-solid/codex-attachment/';
const localPageCaptureEndpoint = '/__made-solid/page-screenshot';
const captureAssetEndpoint = '/__made-solid/capture-asset';
const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const buildIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const workspaceRevisionPattern = /^(?:working|[0-9a-f]{40})$/i;
const maximumCaptureAssetBytes = 5 * 1024 * 1024;
const captureAssetCache = new Map();

function requestCookie(request, requestedName) {
  for (const source of String(request.headers.cookie || '').split(';')) {
    const [name, ...value] = source.trim().split('=');
    if (name !== requestedName || !value.length) continue;
    try {
      return decodeURIComponent(value.join('='));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function workspaceCodexCookieName(directory) {
  return `__Host-made-solid-workspace-codex-${createHash('sha256')
    .update(directory)
    .digest('hex')
    .slice(0, 16)}`;
}

export function authorizeWorkspaceCodexRequest(
  request,
  directory,
  environment = process.env,
  pathExists = existsSync,
) {
  if (!directoryPattern.test(directory || '')) return false;
  const secret = environment.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim();
  if (!secret || !workspacePreviewWorkspace(directory, environment, pathExists)) return false;
  const token = requestCookie(request, workspaceCodexCookieName(directory));
  const access = verifyWorkspacePreviewToken(token, secret);
  return access?.directory === directory;
}

function workspaceCodexDocument(directory) {
  const title = directory.replace(/[._-]+/g, ' ');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} Codex editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

export async function renderWorkspaceCodexDocument(server, directory) {
  const source = workspaceCodexDocument(directory);
  if (typeof server.transformIndexHtml === 'function') {
    return server.transformIndexHtml(workspaceCodexEndpoint, source);
  }
  const outputDirectory = resolve(server.config.root, server.config.build.outDir);
  const builtDocument = await readFile(resolve(outputDirectory, 'index.html'), 'utf8');
  const title = directory.replace(/[._-]+/g, ' ');
  return builtDocument.replace(/<title>[^<]*<\/title>/, `<title>${title} Codex editor</title>`);
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function normalizeActiveWorkspacePreviews(value) {
  const candidates = Array.isArray(value?.previews) ? value.previews : [value];
  return candidates
    .map((candidate) => ({ ...candidate, revision: candidate?.revision || 'working' }))
    .filter(
      (candidate) =>
        directoryPattern.test(candidate.directory || '') &&
        workspaceRevisionPattern.test(candidate.revision || '') &&
        Number.isInteger(candidate.port) &&
        candidate.port > 0 &&
        candidate.port <= 65_535,
    );
}

async function activeWorkspacePreview(directory, revision = 'working') {
  const activePreviewPath = process.env.SITEFORGE_ACTIVE_PREVIEW_PATH?.trim();
  if (!activePreviewPath) throw new Error('The active workspace preview is not configured.');
  const value = JSON.parse(await readFile(activePreviewPath, 'utf8'));
  const previews = normalizeActiveWorkspacePreviews(value);
  const active = previews.find(
    (candidate) => candidate.directory === directory && candidate.revision === revision,
  );
  if (!active) {
    throw new Error('The active workspace preview record is invalid.');
  }
  return active;
}

let activeWorkspacePreviewWrite = Promise.resolve();

function recordActiveWorkspacePreview(activePreviewPath, preview) {
  const update = activeWorkspacePreviewWrite.then(async () => {
    const current = await readFile(activePreviewPath, 'utf8')
      .then((source) => normalizeActiveWorkspacePreviews(JSON.parse(source)))
      .catch(() => []);
    const retained = current.filter(
      (candidate) =>
        candidate.directory !== preview.directory || candidate.revision !== preview.revision,
    );
    const previews = [preview, ...retained].slice(0, 50);
    await mkdir(resolve(activePreviewPath, '..'), { recursive: true });
    await writeFile(activePreviewPath, `${JSON.stringify({ version: 2, previews })}\n`, {
      mode: 0o600,
    });
  });
  activeWorkspacePreviewWrite = update.catch(() => undefined);
  return update;
}

export function workspacePreviewWorkspace(
  directory,
  environment = process.env,
  pathExists = existsSync,
) {
  if (!directoryPattern.test(directory)) return undefined;
  const candidates = [];
  for (const configuredPath of [
    environment.SITEFORGE_STUDIO_WORKSPACE_DIR,
    environment.MADE_SOLID_WEBSITE_DIRECTORY,
  ]) {
    const workspace = configuredPath?.trim();
    if (workspace && basename(resolve(workspace)) === directory)
      candidates.push(resolve(workspace));
  }
  const prospectRoot = environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim();
  if (prospectRoot) candidates.push(resolve(prospectRoot, directory));
  return candidates.find(
    (candidate) =>
      pathExists(resolve(candidate, '.git')) && pathExists(resolve(candidate, 'package.json')),
  );
}

export function prospectCodexWorkspace(
  directory,
  environment = process.env,
  pathExists = existsSync,
) {
  if (!directoryPattern.test(directory)) return undefined;
  const prospectRoot = environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim();
  if (!prospectRoot) return undefined;
  const candidate = resolve(prospectRoot, directory);
  return pathExists(resolve(candidate, '.git')) && pathExists(resolve(candidate, 'package.json'))
    ? candidate
    : undefined;
}

async function fetchPublicCaptureAsset(value) {
  const initial = await assertPublicUrl(value);
  const cacheKey = initial.href;
  const cached = captureAssetCache.get(cacheKey);
  if (cached) return cached;
  let current = initial;
  const dnsCache = new Map();
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    current = await assertPublicUrl(current.href, dnsCache);
    const response = await fetch(current, {
      headers: { Accept: 'image/avif,image/webp,image/svg+xml,image/*;q=0.8' },
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) throw new Error('The image redirected too many times.');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The image returned HTTP ${response.status}.`);
    const mimeType = (response.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(?:avif|gif|jpeg|png|svg\+xml|webp)$/i.test(mimeType)) {
      throw new Error('The requested asset is not a supported image.');
    }
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > maximumCaptureAssetBytes) throw new Error('The image is too large.');
    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length || data.length > maximumCaptureAssetBytes)
      throw new Error('The image is too large.');
    const result = { dataUrl: `data:${mimeType};base64,${data.toString('base64')}` };
    captureAssetCache.set(cacheKey, result);
    if (captureAssetCache.size > 80)
      captureAssetCache.delete(captureAssetCache.keys().next().value);
    return result;
  }
  throw new Error('The image could not be loaded.');
}

export function localCaptureTarget(value) {
  if (typeof value !== 'string' || value.length > 2_000) {
    throw new Error('A valid local workspace page is required for capture.');
  }
  const target = new URL(value);
  if (target.username || target.password)
    throw new Error('Capture URLs cannot include credentials.');
  const allowedPorts = new Set(['3000', '3001', '5173', '8788']);
  if (
    target.protocol === 'http:' &&
    (target.hostname === 'localhost' || target.hostname === '127.0.0.1') &&
    allowedPorts.has(target.port)
  ) {
    target.hostname = '127.0.0.1';
    return target.href;
  }
  const codespace = /-(3000|3001|5173|8788)\.app\.github\.dev$/i.exec(target.hostname);
  if (target.protocol === 'https:' && codespace) {
    target.protocol = 'http:';
    target.hostname = '127.0.0.1';
    target.port = codespace[1];
    return target.href;
  }
  throw new Error('Only the current local or Codespaces workspace can be captured.');
}

function boundedInteger(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(maximum, Math.max(minimum, Math.round(numeric)))
    : fallback;
}

export async function readRefinementLedger(directory) {
  if (!directoryPattern.test(directory)) {
    return {
      status: 'failed',
      detail: 'A valid local prospect workspace directory is required.',
      entries: [],
    };
  }
  const workspace = resolve('prospect-workspaces', directory);
  if (!existsSync(workspace)) {
    return {
      status: 'unavailable',
      detail: 'Open the local workspace to start its live refinement ledger.',
      entries: [],
    };
  }
  const ledgerPath = resolve(workspace, '.made-solid', 'refinement-log.jsonl');
  const [source, ledgerStat] = await Promise.all([
    readFile(ledgerPath, 'utf8').catch((error) => {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }),
    stat(ledgerPath).catch(() => undefined),
  ]);
  const entries = source
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        const entry = JSON.parse(line);
        return {
          id: String(entry.id ?? `entry-${index + 1}`),
          recordedAt: String(entry.recordedAt ?? ''),
          classification: String(entry.classification ?? 'unclassified'),
          title: String(entry.title ?? 'Untitled refinement'),
          problem: String(entry.problem ?? ''),
          fix: String(entry.fix ?? ''),
          pages: Array.isArray(entry.pages)
            ? entry.pages.filter((value) => typeof value === 'string')
            : [],
          viewports: Array.isArray(entry.viewports)
            ? entry.viewports.filter((value) => typeof value === 'string')
            : [],
        };
      } catch {
        throw new Error(`Refinement ledger line ${index + 1} is not valid JSON.`);
      }
    })
    .reverse();
  return {
    status: entries.length ? 'ready' : 'empty',
    detail: entries.length
      ? `${entries.length} verified refinement${entries.length === 1 ? '' : 's'} recorded.`
      : 'No verified refinements have been recorded yet.',
    entries,
    updatedAt: ledgerStat?.mtime.toISOString(),
  };
}

export async function readLearningBundle(directory) {
  if (!directoryPattern.test(directory)) {
    return {
      status: 'failed',
      detail: 'A valid local prospect workspace directory is required.',
      entries: [],
    };
  }
  const bundlePath = resolve(
    'prospect-workspaces',
    directory,
    '.made-solid',
    'learning-bundle.json',
  );
  const source = await readFile(bundlePath, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return '';
    throw error;
  });
  if (!source) {
    return {
      status: 'unavailable',
      detail: 'Commit a verified edit to create its agent-learning bundle.',
      entries: [],
    };
  }
  const bundle = JSON.parse(source);
  const entries = Array.isArray(bundle.entries)
    ? bundle.entries.map((entry, index) => ({
        id: String(entry.id ?? `entry-${index + 1}`),
        recordedAt: String(entry.recordedAt ?? ''),
        classification: ['strict_invariant', 'flexible_principle', 'project_specific'].includes(
          entry.classification,
        )
          ? entry.classification
          : 'unclassified',
        title: String(entry.title ?? 'Untitled refinement'),
        problem: String(entry.problem ?? ''),
        rootCause: String(entry.rootCause ?? ''),
        fix: String(entry.fix ?? ''),
        pattern: String(entry.pattern ?? ''),
        paths: Array.isArray(entry.paths)
          ? entry.paths.filter((value) => typeof value === 'string')
          : [],
        pages: Array.isArray(entry.pages)
          ? entry.pages.filter((value) => typeof value === 'string')
          : [],
        verification: Array.isArray(entry.verification)
          ? entry.verification.filter((value) => typeof value === 'string')
          : [],
      }))
    : [];
  return {
    status: entries.length ? 'ready' : 'empty',
    detail: entries.length
      ? `${entries.length} refinement lesson${entries.length === 1 ? '' : 's'} ready for review.`
      : 'The learning bundle has no refinement lessons.',
    generatedAt: typeof bundle.generatedAt === 'string' ? bundle.generatedAt : undefined,
    origin:
      bundle.origin && typeof bundle.origin === 'object'
        ? {
            studioBuildId: String(bundle.origin.studioBuildId ?? ''),
            buildManifestId: String(bundle.origin.buildManifestId ?? ''),
            agentPackageId: String(bundle.origin.agentPackageId ?? ''),
            agentPackageVersion:
              typeof bundle.origin.agentPackageVersion === 'number'
                ? bundle.origin.agentPackageVersion
                : undefined,
          }
        : undefined,
    entries,
  };
}

function gitOutput(workspace, ...arguments_) {
  try {
    return execFileSync('git', arguments_, {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function gitStatusOutput(workspace) {
  try {
    return execFileSync('git', ['status', '--porcelain'], {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trimEnd();
  } catch {
    return '';
  }
}

function editVersionHistory(workspace) {
  const source = gitOutput(
    workspace,
    'log',
    '--format=%H%x09%cI%x09%s',
    '--grep=^Finalize Made Solid edit:',
    '--grep=^Made Solid edit v[0-9]',
  );
  return source
    .split(/\r?\n/)
    .filter(Boolean)
    .reverse()
    .map((line, index) => {
      const [commit, committedAt, ...subjectParts] = line.split('\t');
      return {
        version: index + 1,
        commit,
        committedAt,
        subject: subjectParts.join('\t'),
      };
    });
}

function githubCommitUrl(workspace, commit) {
  const remote = gitOutput(workspace, 'remote', 'get-url', 'origin');
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1]}/${match[2]}/commit/${commit}` : undefined;
}

async function sourceFiles(directory) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = resolve(current, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'out'].includes(entry.name)) await visit(absolute);
      } else if (/\.(?:css|json|ts|tsx)$/i.test(entry.name)) {
        files.push(absolute);
      }
    }
  }
  await visit(directory);
  return files.sort();
}

function pageRoute(appDirectory, pageFile) {
  const relative = pageFile
    .slice(appDirectory.length)
    .replaceAll('\\', '/')
    .replace(/\/page\.(?:ts|tsx)$/i, '')
    .replace(/\/(?:\([^/]+\)|@[^/]+)/g, '');
  return relative && relative !== '/' ? relative : '/';
}

function sourceRouteKind(route, source) {
  if (/\bredirect\s*\(/.test(source)) return 'redirect';
  if (/\/(?:post|posts|article|articles|blog)\//i.test(route)) return 'content';
  if (/\/(?:news|resources?)\/(?:categories|tags?)\//i.test(route)) return 'content';
  if (/\/(?:thank-you|confirmation|confirmed|success)\/?$/i.test(route)) return 'workflow';
  if (/\/(?:privacy|terms|cookies?|accessibility)\/?$/i.test(route)) return 'support';
  return 'core';
}

function sourcePageSystem(route, source, kind) {
  if (kind === 'redirect') return '';
  if (kind === 'content') return 'content-entry';
  if (kind === 'workflow') return 'workflow';
  if (kind === 'support') return 'support';
  const imports = [
    ...source.matchAll(/from\s+['"](@\/components\/(?:pages|sections|layouts)\/[^'"]+)['"]/g),
  ]
    .map((match) => match[1])
    .sort();
  if (imports.length) return imports.join('|');
  const normalized = source
    .replaceAll(route, '/route/')
    .replace(/const\s+path\s*=\s*['"][^'"]+['"];?/g, 'const path = "/route/";')
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export async function readWorkspacePricingScope(workspace, state = {}) {
  const appDirectory = resolve(workspace, 'src', 'app');
  const allFiles = await sourceFiles(resolve(workspace, 'src'));
  const digest = createHash('sha256');
  const routeRecords = [];
  for (const file of allFiles) {
    const source = await readFile(file, 'utf8');
    digest.update(file.slice(workspace.length).replaceAll('\\', '/')).update('\0');
    digest.update(source).update('\0');
    if (!file.startsWith(appDirectory) || !/\/page\.(?:ts|tsx)$/i.test(file)) continue;
    const route = pageRoute(appDirectory, file);
    const kind = sourceRouteKind(route, source);
    routeRecords.push({ route, kind, system: sourcePageSystem(route, source, kind) });
  }
  const changed = Boolean(state.changedFiles?.length);
  const systems = new Set(routeRecords.map((record) => record.system).filter(Boolean));
  return {
    source: changed ? 'working_source' : 'committed_source',
    revisionLabel: changed
      ? `Latest working edit v${state.workingVersion ?? 1}`
      : `Committed edit v${state.committedVersion?.version ?? state.workingVersion ?? 1}`,
    fingerprint: digest.digest('hex'),
    sourceCommit: state.commit || undefined,
    sourceEditVersion: changed
      ? state.workingVersion
      : (state.committedVersion?.version ?? state.workingVersion),
    totalRoutes: routeRecords.length,
    corePages: routeRecords.filter((record) => record.kind === 'core').length,
    contentEntries: routeRecords.filter((record) => record.kind === 'content').length,
    workflowPages: routeRecords.filter((record) => record.kind === 'workflow').length,
    supportPages: routeRecords.filter((record) => record.kind === 'support').length,
    redirectRoutes: routeRecords.filter((record) => record.kind === 'redirect').length,
    uniquePageSystems: Math.max(1, systems.size),
  };
}

export async function readFinalEditState(directory) {
  if (!directoryPattern.test(directory)) {
    return {
      status: 'failed',
      detail: 'A valid local prospect workspace directory is required.',
    };
  }
  const workspace = resolve('prospect-workspaces', directory);
  if (!existsSync(resolve(workspace, '.git'))) {
    return {
      status: 'unavailable',
      detail: 'Open the local prospect workspace before creating its final edit checkpoint.',
    };
  }
  const [ledger, branch, commit, subject, changedSource, originSource] = await Promise.all([
    readRefinementLedger(directory),
    Promise.resolve(gitOutput(workspace, 'branch', '--show-current')),
    Promise.resolve(gitOutput(workspace, 'rev-parse', 'HEAD')),
    Promise.resolve(gitOutput(workspace, 'log', '-1', '--pretty=%s')),
    Promise.resolve(gitStatusOutput(workspace)),
    readFile(resolve(workspace, '.made-solid', 'origin.json'), 'utf8').catch(() => '{}'),
  ]);
  const upstreamCommit = gitOutput(workspace, 'rev-parse', '@{upstream}');
  const changedFiles = changedSource
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3));
  const bundleReady = existsSync(resolve(workspace, '.made-solid', 'learning-bundle.json'));
  const versions = editVersionHistory(workspace).map((version) => ({
    ...version,
    commitUrl: githubCommitUrl(workspace, version.commit),
  }));
  const committedVersion = versions.at(-1);
  const finalCommit =
    subject.startsWith('Finalize Made Solid edit:') || subject.startsWith('Made Solid edit v');
  const synced = Boolean(commit && upstreamCommit && commit === upstreamCommit);
  const finalised = finalCommit && changedFiles.length === 0 && synced;
  const baseState = {
    status: finalised ? 'finalised' : changedFiles.length ? 'changes_pending' : 'ready',
    detail: finalised
      ? 'The verified final edit is committed and synced to the prospect repository.'
      : changedFiles.length
        ? `${changedFiles.length} edited file${changedFiles.length === 1 ? '' : 's'} waiting for the final checkpoint.`
        : 'The repository is clean but has not been marked as the final edit.',
    branch,
    commit,
    synced,
    finalCommit,
    changedFiles,
    bundleReady,
    refinementCount: ledger.entries.length,
    sourceBuild: (() => {
      try {
        const origin = JSON.parse(originSource);
        return {
          buildId: String(origin.studioBuildId || ''),
          manifestId: String(origin.buildManifestId || ''),
          agentPackageVersion:
            typeof origin.agentPackageVersion === 'number' ? origin.agentPackageVersion : undefined,
          exportedAt: typeof origin.exportedAt === 'string' ? origin.exportedAt : undefined,
        };
      } catch {
        return undefined;
      }
    })(),
    versions,
    committedVersion,
    workingVersion: versions.length + 1,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...baseState,
    pricingScope: await readWorkspacePricingScope(workspace, baseState),
  };
}

function readRequestBody(request, maximumLength = 8_192) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    let rejected = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > maximumLength) {
        rejected = true;
        reject(new Error('Request body is too large.'));
      }
    });
    request.on('end', () => {
      if (!rejected) resolveBody(body);
    });
    request.on('error', reject);
  });
}

function run(command, arguments_, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, arguments_, {
      cwd: process.cwd(),
      stdio: 'ignore',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}

function portIsAvailable(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePort(true)));
  });
}

async function nextWebsitePort() {
  for (let port = 3000; port < 3100; port += 1) {
    if (await portIsAvailable(port)) return port;
  }
  throw new Error('No local website preview port is available.');
}

async function websiteIsReady(port) {
  try {
    await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1_000) });
    return true;
  } catch {
    return false;
  }
}

async function waitForWebsite(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await websiteIsReady(port)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error('The website server did not become ready within 30 seconds.');
}

export function previewUrl(request, port, environment = process.env, preview = {}) {
  const configuredOrigin =
    environment.PREVIEW_PUBLIC_ORIGIN?.trim() ||
    environment.VITE_SITEFORGE_PREVIEW_ORIGIN?.trim() ||
    'https://preview.madesolid.com.au';
  const previewSecret = environment.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim();
  const previewDirectory =
    preview.directory || environment.SITEFORGE_ACTIVE_PREVIEW_DIRECTORY?.trim();
  const revision = preview.revision || 'working';
  if (configuredOrigin && previewSecret && previewDirectory) {
    return workspaceFrameUrl(configuredOrigin, previewDirectory, previewSecret, { revision });
  }
  const codespaceName = String(environment.CODESPACE_NAME || '').trim();
  const forwardingDomain = String(
    environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || '',
  ).trim();
  if (codespaceName && forwardingDomain) {
    return `https://${codespaceName}-${port}.${forwardingDomain}`;
  }
  const host = String(request.headers.host || 'localhost');
  if (host.endsWith('.app.github.dev')) {
    return `https://${host.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`)}`;
  }
  return `http://localhost:${port}`;
}

export function studioOrigin(request, environment = process.env) {
  const configuredOrigin = environment.SITEFORGE_PUBLIC_ORIGIN?.trim().replace(/\/+$/, '');
  if (configuredOrigin && /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(configuredOrigin)) {
    return configuredOrigin;
  }
  const host = String(request.headers.host || '')
    .trim()
    .toLowerCase();
  if (/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host)) return `http://${host}`;
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-\d{1,5}\.app\.github\.dev$/.test(host))
    return `https://${host}`;
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (
    forwardedProtocol === 'https' &&
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/.test(host)
  ) {
    return `https://${host}`;
  }
  return 'http://127.0.0.1:5173';
}

export function developmentServerHostFlag(packageDocument) {
  const developmentScript = String(packageDocument?.scripts?.dev || '');
  return /(?:^|\s)vite(?:\s|$)/.test(developmentScript) ? '--host' : '--hostname';
}

const ownedWebsiteSecretNames = [
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_SENDER_EMAIL',
  'MICROSOFT_TENANT_ID',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'REVIEW_NOTIFICATION_EMAIL',
  'REVIEW_NOTIFICATION_FROM',
  'REVIEW_NOTIFICATION_WEBHOOK_URL',
  'STRIPE_HOSTING_CARE_PRICE_ID',
  'STRIPE_MANAGED_HOSTING_PRICE_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STUDIO_HANDOFF_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
];

export function ownedWebsiteDevelopmentEnvironment(destination, environment = process.env) {
  const configuredWebsite = environment.MADE_SOLID_WEBSITE_DIRECTORY?.trim();
  if (!configuredWebsite || resolve(destination) !== resolve(configuredWebsite)) return [];
  const arguments_ = ownedWebsiteSecretNames.flatMap((name) => ['-u', name]);
  const developmentOrigins = studioDevelopmentOrigins(environment);
  arguments_.push(
    'MADE_SOLID_DEPLOYMENT_MODE=development',
    `MADE_SOLID_STUDIO_ORIGIN=${developmentOrigins.canonicalOrigin}`,
    `NEXT_PUBLIC_SITE_URL=${environment.MADE_SOLID_WEBSITE_DEVELOPMENT_ORIGIN?.trim() || 'https://dev.madesolid.com.au'}`,
  );
  for (const name of [
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    const value = environment[`MADE_SOLID_DEV_${name}`]?.trim();
    if (value) arguments_.push(`${name}=${value}`);
  }
  return arguments_;
}

function developmentGitOutput(directory, arguments_) {
  return execFileSync('git', arguments_, {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function developmentProjectStatus({
  id,
  name,
  directory,
  developmentUrl,
  productionUrl,
  developmentConfigured,
}) {
  const branch = developmentGitOutput(directory, ['branch', '--show-current']) || 'detached';
  const head = developmentGitOutput(directory, ['rev-parse', 'HEAD']);
  const statusLines = developmentGitOutput(directory, ['status', '--porcelain=v1'])
    .split('\n')
    .filter(Boolean);
  const releaseSource = developmentGitOutput(directory, [
    'log',
    '-8',
    '--format=%H%x1f%h%x1f%s%x1f%cI%x1e',
  ]);
  const releases = releaseSource
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [commit, shortCommit, title, createdAt] = entry.split('\x1f');
      return { commit, shortCommit, title, createdAt };
    });
  return {
    branch,
    changes: statusLines.slice(0, 100).map((line) => ({
      path: line.slice(3),
      status: line.slice(0, 2).trim() || 'changed',
    })),
    developmentConfigured,
    developmentUrl,
    directory: basename(directory),
    dirty: statusLines.length > 0,
    head,
    id,
    name,
    productionUrl,
    releases,
  };
}

function developmentProjects(environment = process.env) {
  const studioDirectory = environment.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim() || process.cwd();
  const websiteDirectory = environment.MADE_SOLID_WEBSITE_DIRECTORY?.trim();
  const developmentOrigins = studioDevelopmentOrigins(environment);
  const websiteDevelopmentOrigin = environment.MADE_SOLID_WEBSITE_DEVELOPMENT_ORIGIN?.trim();
  const projects = [
    developmentProjectStatus({
      id: 'studio',
      name: 'Made Solid Studio',
      directory: studioDirectory,
      developmentUrl: developmentOrigins.canonicalOrigin,
      productionUrl:
        environment.SITEFORGE_PUBLIC_ORIGIN?.trim() || 'https://studio.madesolid.com.au',
      developmentConfigured: Boolean(
        environment.SITEFORGE_DEVELOPMENT_ORIGIN?.trim() ||
        environment.SITEFORGE_WORKSPACE_PREVIEW_ORIGIN?.trim(),
      ),
    }),
  ];
  if (websiteDirectory && workspacePreviewWorkspace(basename(websiteDirectory), environment)) {
    projects.push(
      developmentProjectStatus({
        id: 'website',
        name: 'Made Solid website',
        directory: websiteDirectory,
        developmentUrl: websiteDevelopmentOrigin || 'https://dev.madesolid.com.au',
        productionUrl:
          environment.MADE_SOLID_WEBSITE_PRODUCTION_ORIGIN?.trim() || 'https://madesolid.com.au',
        developmentConfigured: Boolean(websiteDevelopmentOrigin),
      }),
    );
  }
  return projects;
}

async function launchWebsite({
  destination,
  directory,
  request,
  writeEvent,
  finish,
  sessionName: providedSessionName,
  readyDetail,
  revision = 'working',
}) {
  writeEvent({
    status: 'running',
    phase: 'launching',
    detail: 'Starting the website in a persistent terminal session.',
  });
  const port = await nextWebsitePort();
  const sessionName =
    providedSessionName ?? `made-solid-${directory.replace(/[^A-Za-z0-9_-]/g, '-')}`.slice(0, 80);
  const packageDocument = JSON.parse(await readFile(resolve(destination, 'package.json'), 'utf8'));
  const hostFlag = developmentServerHostFlag(packageDocument);
  const nextEnvironmentPath = resolve(destination, 'next-env.d.ts');
  const nextEnvironmentSource = await readFile(nextEnvironmentPath, 'utf8').catch(() => undefined);
  await run('tmux', ['kill-session', '-t', sessionName]).catch(() => undefined);
  await run('tmux', [
    'new-session',
    '-d',
    '-s',
    sessionName,
    '-c',
    destination,
    'env',
    ...ownedWebsiteDevelopmentEnvironment(destination),
    'NODE_ENV=development',
    'npm',
    'run',
    'dev',
    '--',
    hostFlag,
    '0.0.0.0',
    '--port',
    String(port),
  ]);
  await run('tmux', ['set-option', '-t', sessionName, 'remain-on-exit', 'on']);
  writeEvent({
    status: 'running',
    phase: 'launching',
    detail: `Waiting for the website to respond on port ${port}.`,
  });
  await waitForWebsite(port);
  const activePreviewPath = process.env.SITEFORGE_ACTIVE_PREVIEW_PATH?.trim();
  if (activePreviewPath) {
    await recordActiveWorkspacePreview(activePreviewPath, {
      directory,
      port,
      revision,
      startedAt: new Date().toISOString(),
    });
    process.env.SITEFORGE_ACTIVE_PREVIEW_DIRECTORY = directory;
  }
  if (nextEnvironmentSource) {
    const generatedDevelopmentSource = nextEnvironmentSource.replace(
      './.next/types/routes.d.ts',
      './.next/dev/types/routes.d.ts',
    );
    const currentSource = await readFile(nextEnvironmentPath, 'utf8').catch(() => undefined);
    if (currentSource === generatedDevelopmentSource) {
      await writeFile(nextEnvironmentPath, nextEnvironmentSource);
    }
  }
  finish({
    status: 'complete',
    phase: 'ready',
    detail: readyDetail ?? `The website is running from prospect-workspaces/${directory}.`,
    previewUrl: previewUrl(request, port, process.env, { directory, revision }),
    terminalSession: sessionName,
  });
}

async function launchCommittedPreview({ directory, commit, request, writeEvent, finish }) {
  const workspace = resolve('prospect-workspaces', directory);
  const version = editVersionHistory(workspace).find((candidate) => candidate.commit === commit);
  if (!version) throw new Error('Choose a committed Made Solid edit version from this workspace.');
  const shortCommit = commit.slice(0, 8);
  const previewRoot = resolve('prospect-workspaces', '.made-solid-previews');
  const destination = resolve(previewRoot, `${directory}-v${version.version}-${shortCommit}`);
  await mkdir(previewRoot, { recursive: true });
  if (!existsSync(destination)) {
    writeEvent({
      status: 'running',
      phase: 'preparing_snapshot',
      detail: `Preparing the immutable website source for edit v${version.version}.`,
    });
    await run('git', ['worktree', 'add', '--detach', destination, commit], { cwd: workspace });
  }
  if (!existsSync(resolve(destination, 'node_modules'))) {
    writeEvent({
      status: 'running',
      phase: 'installing',
      detail: `Preparing locked dependencies for edit v${version.version}.`,
    });
    await run('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], {
      cwd: destination,
    });
  }
  await launchWebsite({
    destination,
    directory,
    request,
    writeEvent,
    finish,
    sessionName: `made-solid-${directory}-v${version.version}-${shortCommit}`.slice(0, 80),
    readyDetail: `Committed edit v${version.version} is running from its immutable Git snapshot.`,
    revision: commit.toLowerCase(),
  });
}

export function localWorkspacePlugin() {
  const runtimeDataDirectory = process.env.SITEFORGE_RUNTIME_DATA_DIR?.trim();
  const codexPushNotifications = new CodexPushNotifications({
    storagePath: runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'codex-push-notifications.json')
      : resolve('.made-solid', 'codex-push-notifications.json'),
  });
  const codexFeedbackBridgeSource = pathToFileURL(
    resolve(process.cwd(), 'scripts/codex-feedback-bridge.mjs'),
  );
  const codexFeedbackBridgeOptions = {
    cwd: process.env.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim() || process.cwd(),
    resolveClientWorkspace: (directory) => prospectCodexWorkspace(directory),
    storageRoot: runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'codex-feedback')
      : resolve('.made-solid', 'codex-feedback'),
    notifyCompletion: (record) => codexPushNotifications.notifyCompletion(record),
  };
  let activeCodexFeedbackBridge;
  let activeCodexFeedbackBridgeModifiedAt = 0;
  let codexFeedbackBridgeLoadPromise;
  const codexFeedbackBridge = async () => {
    const modifiedAt = (await stat(codexFeedbackBridgeSource)).mtimeMs;
    if (
      activeCodexFeedbackBridge &&
      (modifiedAt === activeCodexFeedbackBridgeModifiedAt ||
        activeCodexFeedbackBridge.maintenancePromise ||
        activeCodexFeedbackBridge.flushPromise)
    ) {
      return activeCodexFeedbackBridge;
    }
    if (!codexFeedbackBridgeLoadPromise) {
      codexFeedbackBridgeLoadPromise = import(
        `${codexFeedbackBridgeSource.href}?updated=${modifiedAt}`
      )
        .then(({ CodexFeedbackBridge }) => {
          const nextBridge = new CodexFeedbackBridge(codexFeedbackBridgeOptions);
          if (activeCodexFeedbackBridge?.startedThreads) {
            nextBridge.startedThreads = activeCodexFeedbackBridge.startedThreads;
          }
          activeCodexFeedbackBridge = nextBridge;
          activeCodexFeedbackBridgeModifiedAt = modifiedAt;
          return nextBridge;
        })
        .finally(() => {
          codexFeedbackBridgeLoadPromise = undefined;
        });
    }
    return codexFeedbackBridgeLoadPromise;
  };
  let captureBrowserPromise;
  let workspacePreviewRecoveryPromise;
  const captureBrowser = () => {
    captureBrowserPromise ??= chromium.launch({ headless: true });
    return captureBrowserPromise;
  };
  const readyWorkspacePreview = async (request, requestedDirectory) => {
    const active = await activeWorkspacePreview(requestedDirectory, 'working').catch(
      () => undefined,
    );
    if (active && (await websiteIsReady(active.port))) return active;
    if (workspacePreviewRecoveryPromise) {
      await workspacePreviewRecoveryPromise.catch(() => undefined);
      return readyWorkspacePreview(request, requestedDirectory);
    }
    const recovery = (async () => {
      const directory = requestedDirectory;
      const destination = workspacePreviewWorkspace(directory);
      if (!destination) {
        throw new Error(
          'The saved workspace no longer exists in an approved persistent workspace root.',
        );
      }
      await launchWebsite({
        destination,
        directory,
        request,
        writeEvent: () => undefined,
        finish: () => undefined,
        readyDetail: 'The private workspace preview has restarted.',
      });
      return activeWorkspacePreview(directory, 'working');
    })();
    workspacePreviewRecoveryPromise = recovery;
    try {
      return await recovery;
    } finally {
      if (workspacePreviewRecoveryPromise === recovery) workspacePreviewRecoveryPromise = undefined;
    }
  };
  const configureWorkspaceServer = (server) => {
    const maintainCodexFeedbackBridge = () =>
      void codexFeedbackBridge()
        .then((bridge) => bridge.maintain())
        .catch(() => undefined);
    maintainCodexFeedbackBridge();
    const feedbackFlush = setInterval(maintainCodexFeedbackBridge, 2_000);
    feedbackFlush.unref();
    server.httpServer?.once('close', () => {
      clearInterval(feedbackFlush);
      void captureBrowserPromise?.then((browser) => browser.close()).catch(() => undefined);
    });
    server.middlewares.use(async (request, response, next) => {
      const requestUrl = new URL(request.url ?? '/', 'http://made-solid.local');
      if (requestUrl.pathname === '/health') {
        sendJson(response, 200, { status: 'ready' });
        return;
      }
      if (requestUrl.pathname === workspaceCodexEndpoint) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const directory = requestUrl.searchParams.get('workspace') || '';
        const secret = process.env.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim();
        if (!directoryPattern.test(directory) || !secret || !workspacePreviewWorkspace(directory)) {
          response.statusCode = 404;
          response.end('Workspace Codex editor unavailable.');
          return;
        }
        const cookieName = workspaceCodexCookieName(directory);
        const queryToken = requestUrl.searchParams.get('access');
        const token = queryToken || requestCookie(request, cookieName);
        const access = verifyWorkspacePreviewToken(token, secret);
        if (!access || access.directory !== directory) {
          response.statusCode = 403;
          response.end('Workspace Codex editor access has expired.');
          return;
        }
        if (queryToken) {
          requestUrl.searchParams.delete('access');
          response.writeHead(303, {
            'Cache-Control': 'no-store',
            Location: `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`,
            'Set-Cookie': `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
            'X-Content-Type-Options': 'nosniff',
          });
          response.end();
          return;
        }
        const document = await renderWorkspaceCodexDocument(server, directory);
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Security-Policy': `frame-ancestors ${studioDevelopmentOrigins(process.env).origins.join(' ')}; base-uri 'none'; form-action 'none'`,
          'Content-Type': 'text/html; charset=utf-8',
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        });
        if (request.method === 'HEAD') response.end();
        else response.end(document);
        return;
      }
      let runtimeAuthorization;
      if (requestUrl.pathname.startsWith('/__made-solid/')) {
        const authorization = await authorizeStudioRuntimeRequest(request);
        if (!authorization.authorized) {
          sendJson(response, authorization.status || 401, {
            status: 'unauthorized',
            detail: authorization.detail,
          });
          return;
        }
        runtimeAuthorization = authorization;
      }
      if (requestUrl.pathname === workspaceDevelopmentAccessEndpoint) {
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Workspace access is only available from Made Solid Studio.',
          });
          return;
        }
        try {
          const origin = studioDevelopmentOrigins(process.env).canonicalOrigin;
          const secret = process.env.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim();
          const ownerUserId = runtimeAuthorization?.userId;
          if (!origin || !secret || !ownerUserId) {
            throw new Error('The Workspace development origin is not configured.');
          }
          const workspaceUrl = new URL(origin);
          workspaceUrl.searchParams.set(
            'access',
            createWorkspaceStudioToken(secret, ownerUserId, { lifetimeMs: 2 * 60 * 1_000 }),
          );
          sendJson(response, 200, { status: 'ready', workspaceUrl: workspaceUrl.href });
        } catch (error) {
          sendJson(response, 503, {
            status: 'unavailable',
            detail:
              error instanceof Error ? error.message : 'Workspace development is unavailable.',
          });
        }
        return;
      }
      if (requestUrl.pathname === developmentProjectsEndpoint) {
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Development projects are only available from Made Solid Studio.',
          });
          return;
        }
        try {
          sendJson(response, 200, { projects: developmentProjects(), status: 'ready' });
        } catch (error) {
          sendJson(response, 503, {
            status: 'unavailable',
            detail:
              error instanceof Error ? error.message : 'Development project status is unavailable.',
          });
        }
        return;
      }
      if (requestUrl.pathname === codexNotificationsEndpoint) {
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Notification settings are only available from Made Solid Studio.',
          });
          return;
        }
        try {
          if (request.method === 'GET') {
            sendJson(response, 200, await codexPushNotifications.configuration());
            return;
          }
          if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end('Method not allowed');
            return;
          }
          const input = JSON.parse(await readRequestBody(request, 32 * 1024));
          const result =
            input.action === 'unsubscribe'
              ? await codexPushNotifications.unsubscribe(input.endpoint)
              : input.action === 'subscribe'
                ? await codexPushNotifications.subscribe(input.subscription)
                : undefined;
          if (!result) throw new Error('Choose a valid notification action.');
          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error
                ? error.message
                : 'Phone notification settings could not be updated.',
          });
        }
        return;
      }
      if (requestUrl.pathname === aiBillingModeEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'AI billing settings are only available from Made Solid Studio.',
          });
          return;
        }
        if (request.method === 'GET') {
          sendJson(response, 200, runtimeAiBillingStatus());
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 8_192));
          const mode = input.mode === apiCreditsBillingMode ? apiCreditsBillingMode : input.mode;
          sendJson(response, 200, await writeRuntimeAiBillingMode(mode));
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error ? error.message : 'The AI billing mode could not change.',
          });
        }
        return;
      }
      if (requestUrl.pathname === workspacePreviewAccessEndpoint) {
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          const requestedDirectory = requestUrl.searchParams.get('directory') || '';
          if (!directoryPattern.test(requestedDirectory)) {
            sendJson(response, 400, {
              status: 'invalid',
              detail: 'Choose a valid client workspace before opening the preview.',
            });
            return;
          }
          const active = await readyWorkspacePreview(request, requestedDirectory);
          const origin = process.env.PREVIEW_PUBLIC_ORIGIN?.trim();
          const secret = process.env.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim();
          if (!origin || !secret) throw new Error('The workspace preview is not configured.');
          sendJson(response, 200, {
            clientPreviewUrl: workspaceFrameUrl(origin, active.directory, secret, {
              revision: active.revision,
            }),
            directory: active.directory,
            status: 'ready',
          });
        } catch (error) {
          sendJson(response, 503, {
            status: 'unavailable',
            detail:
              error instanceof Error ? error.message : 'The workspace preview could not be opened.',
          });
        }
        return;
      }
      if (requestUrl.pathname === captureAssetEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'This capture asset is only available from Made Solid Studio.',
          });
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 8_192));
          sendJson(response, 200, await fetchPublicCaptureAsset(input.url));
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail: error instanceof Error ? error.message : 'The image could not be loaded.',
          });
        }
        return;
      }
      if (requestUrl.pathname.startsWith(codexAttachmentPrefix)) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          response.statusCode = 403;
          response.end('This attachment is only available from Made Solid Studio.');
          return;
        }
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          const id = requestUrl.pathname.slice(codexAttachmentPrefix.length);
          const attachment = await (await codexFeedbackBridge()).attachment(id);
          response.writeHead(200, {
            'Cache-Control': 'private, no-store',
            'Content-Type': attachment.mimeType,
            'Content-Length': attachment.data.length,
            'X-Content-Type-Options': 'nosniff',
          });
          response.end(attachment.data);
        } catch (error) {
          sendJson(response, 404, {
            status: 'failed',
            detail: error instanceof Error ? error.message : 'The screenshot is unavailable.',
          });
        }
        return;
      }
      if (requestUrl.pathname === codexSpeechEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Speech is only available from Made Solid Studio.',
          });
          return;
        }
        if (request.method === 'GET') {
          sendJson(response, 200, await loadGoogleSpeechConfiguration());
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        if (!googleSpeechConfiguration().available) {
          sendJson(response, 503, {
            status: 'unavailable',
            detail: 'Google speech is not configured. Using the English device voice instead.',
          });
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 8_192));
          const speech = await synthesizeGoogleSpeech(input);
          response.writeHead(200, {
            'Cache-Control': 'private, no-store',
            'Content-Length': speech.audio.length,
            'Content-Type': 'audio/mpeg',
            'X-Content-Type-Options': 'nosniff',
            'X-Speech-Voice': speech.voice,
          });
          response.end(speech.audio);
        } catch (error) {
          const detail = error instanceof Error ? error.message : '';
          const invalidInput = /required|4,500 bytes|available Google voice/i.test(detail);
          sendJson(response, invalidInput ? 400 : 502, {
            status: 'failed',
            detail: invalidInput
              ? detail
              : 'Google speech is temporarily unavailable. Use the device voice and retry later.',
          });
        }
        return;
      }
      if (requestUrl.pathname === localPageCaptureEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'This capture is only available from Made Solid Studio.',
          });
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        let page;
        try {
          const input = JSON.parse(await readRequestBody(request, 8_192));
          const targetUrl = localCaptureTarget(input.targetUrl);
          const viewport = {
            width: boundedInteger(input.viewportWidth, 1440, 320, 2560),
            height: boundedInteger(input.viewportHeight, 900, 480, 1600),
          };
          const browser = await captureBrowser();
          page = await browser.newPage({ viewport });
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
          await page.addStyleTag({
            content:
              '[data-made-solid-codex-panel], .codex-feedback-trigger, .codex-feedback-overlay, .codex-feedback-dialog { display: none !important; }',
          });
          await page.evaluate(({ x, y }) => globalThis.scrollTo(x, y), {
            x: boundedInteger(input.scrollX, 0, 0, 100_000),
            y: boundedInteger(input.scrollY, 0, 0, 100_000),
          });
          await page.waitForTimeout(180);
          const screenshot = await page.screenshot({ type: 'png' });
          sendJson(response, 200, {
            status: 'ready',
            screenshot: `data:image/png;base64,${screenshot.toString('base64')}`,
          });
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error ? error.message : 'The local workspace could not be captured.',
          });
        } finally {
          await page?.close().catch(() => undefined);
        }
        return;
      }
      if (
        requestUrl.pathname === codexStatusEndpoint ||
        requestUrl.pathname === codexFeedbackEndpoint ||
        requestUrl.pathname === codexBranchEndpoint
      ) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'This action is only available from Made Solid Studio.',
          });
          return;
        }
        if (requestUrl.pathname === codexStatusEndpoint) {
          if (request.method !== 'GET') {
            response.statusCode = 405;
            response.end('Method not allowed');
            return;
          }
          try {
            const workspace = requestUrl.searchParams.get('workspace') || undefined;
            const embeddedWorkspace = String(
              request.headers['x-made-solid-workspace-codex'] || '',
            ).trim();
            if (
              embeddedWorkspace &&
              (workspace !== embeddedWorkspace ||
                !authorizeWorkspaceCodexRequest(request, embeddedWorkspace))
            ) {
              sendJson(response, 403, {
                status: 'forbidden',
                detail: 'This Codex editor is not authorized for the requested client workspace.',
                models: [],
                queuedCount: 0,
              });
              return;
            }
            const bridge = await codexFeedbackBridge();
            await bridge.maintain();
            const inspected = await bridge.inspect({
              threadId: requestUrl.searchParams.get('threadId') || undefined,
              workspace,
              threadScope:
                requestUrl.searchParams.get('threadScope') === 'client' ? 'client' : 'universal',
            });
            sendJson(response, 200, {
              ...inspected,
              billing: runtimeAiBillingStatus(),
              capabilities: { stopActiveTurn: true },
            });
          } catch (error) {
            sendJson(response, 503, {
              status: 'unavailable',
              detail:
                error instanceof Error ? error.message : 'The local Codex service is unavailable.',
              models: [],
              queuedCount: 0,
            });
          }
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 110 * 1024 * 1024));
          const embeddedWorkspace = String(
            request.headers['x-made-solid-workspace-codex'] || '',
          ).trim();
          if (
            embeddedWorkspace &&
            (input.workspace !== embeddedWorkspace ||
              !authorizeWorkspaceCodexRequest(request, embeddedWorkspace))
          ) {
            sendJson(response, 403, {
              status: 'forbidden',
              detail: 'This Codex editor is not authorized for the requested client workspace.',
            });
            return;
          }
          const bridge = await codexFeedbackBridge();
          let result;
          if (requestUrl.pathname === codexBranchEndpoint) {
            result = await bridge.forkThread(input);
          } else {
            switch (input.action) {
              case undefined:
              case 'enqueue':
                result = await bridge.enqueue(input);
                break;
              case 'update-queued':
                result = await bridge.updateQueued(input.id, input);
                break;
              case 'delete-queued':
                result = await bridge.deleteQueued(input.id, input);
                break;
              case 'interrupt-queued':
                result = await bridge.interruptQueued(input.id, input);
                break;
              case 'stop-active-turn':
                result = await bridge.stopActiveTurn(input);
                break;
              case 'delete-empty-thread':
                result = await bridge.deleteEmptyThread(input);
                break;
              case 'temporary-question':
                result = await bridge.temporaryQuestion(input);
                break;
              case 'new-thread':
                result = await bridge.createThread(input);
                break;
              case 'branch-thread':
                result = await bridge.forkThread(input);
                break;
              case 'continue-interrupted-thread':
                result = await bridge.continueInterruptedThread(input);
                break;
              default:
                throw new Error('Choose a valid Codex chat action.');
            }
          }
          sendJson(response, 202, result);
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error ? error.message : 'The visual feedback could not be queued.',
          });
        }
        return;
      }
      if (requestUrl.pathname === committedPreviewEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          response.statusCode = 403;
          response.end('This action is only available from Made Solid Studio.');
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        let directory;
        let commit;
        try {
          const body = JSON.parse(await readRequestBody(request));
          directory = typeof body.directory === 'string' ? body.directory.trim() : '';
          commit = typeof body.commit === 'string' ? body.commit.trim() : '';
        } catch {
          sendJson(response, 400, {
            status: 'failed',
            detail: 'A valid preview request is required.',
          });
          return;
        }
        if (!directoryPattern.test(directory) || !/^[0-9a-f]{40}$/i.test(commit)) {
          sendJson(response, 400, {
            status: 'failed',
            detail: 'Choose a valid committed edit version.',
          });
          return;
        }
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        let settled = false;
        const writeEvent = (event) => {
          if (!response.writableEnded) response.write(`${JSON.stringify(event)}\n`);
        };
        const finish = (event) => {
          if (settled) return;
          settled = true;
          writeEvent(event);
          response.end();
        };
        void launchCommittedPreview({ directory, commit, request, writeEvent, finish }).catch(
          (error) =>
            finish({
              status: 'failed',
              phase: 'failed',
              detail:
                error instanceof Error
                  ? error.message
                  : 'The committed website version could not be opened.',
            }),
        );
        return;
      }
      if (requestUrl.pathname === finalEditEndpoint) {
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          response.statusCode = 403;
          response.end('This action is only available from Made Solid Studio.');
          return;
        }
        if (request.method === 'GET') {
          const directory = requestUrl.searchParams.get('directory')?.trim() ?? '';
          const state = await readFinalEditState(directory);
          sendJson(response, state.status === 'failed' ? 400 : 200, state);
          return;
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        let directory;
        try {
          const body = JSON.parse(await readRequestBody(request));
          directory = typeof body.directory === 'string' ? body.directory.trim() : '';
        } catch {
          sendJson(response, 400, {
            status: 'failed',
            phase: 'failed',
            detail: 'A valid final-edit request is required.',
          });
          return;
        }
        if (!directoryPattern.test(directory)) {
          sendJson(response, 400, {
            status: 'failed',
            phase: 'failed',
            detail: 'A valid prospect workspace directory is required.',
          });
          return;
        }
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        });
        const child = spawn(
          process.execPath,
          [resolve('scripts/finalize-prospect-workspace.mjs'), '--directory', directory],
          { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        child.stdout.pipe(response, { end: false });
        child.stderr.resume();
        child.once('error', () => {
          if (!response.writableEnded) {
            response.write(
              `${JSON.stringify({ status: 'failed', phase: 'failed', detail: 'Studio could not start the final-edit process.' })}\n`,
            );
            response.end();
          }
        });
        child.once('exit', () => {
          if (!response.writableEnded) response.end();
        });
        return;
      }
      if (
        requestUrl.pathname === refinementLedgerEndpoint ||
        requestUrl.pathname === learningBundleEndpoint
      ) {
        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const fetchSite = request.headers['sec-fetch-site'];
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          response.statusCode = 403;
          response.end('This resource is only available from Made Solid Studio.');
          return;
        }
        try {
          const directory = requestUrl.searchParams.get('directory')?.trim() ?? '';
          const result =
            requestUrl.pathname === learningBundleEndpoint
              ? await readLearningBundle(directory)
              : await readRefinementLedger(directory);
          sendJson(response, result.status === 'failed' ? 400 : 200, result);
        } catch (error) {
          sendJson(response, 500, {
            status: 'failed',
            detail:
              error instanceof Error
                ? error.message
                : requestUrl.pathname === learningBundleEndpoint
                  ? 'The learning bundle could not be read.'
                  : 'The refinement ledger could not be read.',
            entries: [],
          });
        }
        return;
      }
      if (request.url !== localWorkspaceEndpoint) {
        next();
        return;
      }
      if (request.method !== 'POST') {
        response.statusCode = 405;
        response.end('Method not allowed');
        return;
      }
      const fetchSite = request.headers['sec-fetch-site'];
      if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
        response.statusCode = 403;
        response.end('This action is only available from Made Solid Studio.');
        return;
      }

      let repository;
      let buildId;
      let directory;
      let repositoryReady;
      try {
        const body = JSON.parse(await readRequestBody(request));
        repository = typeof body.repository === 'string' ? body.repository.trim() : '';
        buildId = typeof body.buildId === 'string' ? body.buildId.trim() : '';
        directory = typeof body.directory === 'string' ? body.directory.trim() : '';
        repositoryReady = body.repositoryReady === true;
      } catch {
        response.statusCode = 400;
        response.end('A valid JSON request is required.');
        return;
      }
      const hasRepository = repositoryPattern.test(repository);
      const hasBuild = buildIdPattern.test(buildId) && directoryPattern.test(directory);
      const hasLocalRepository =
        directoryPattern.test(directory) &&
        existsSync(resolve('prospect-workspaces', directory, '.git'));
      const opensRepository = hasRepository && (repositoryReady || hasLocalRepository);
      const exportsBuild = hasBuild && !opensRepository;
      if (!opensRepository && !exportsBuild) {
        response.statusCode = 400;
        response.end('A valid repository or completed-build workspace is required.');
        return;
      }

      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
      let settled = false;
      const writeEvent = (event) => {
        if (!response.writableEnded) response.write(`${JSON.stringify(event)}\n`);
      };
      const finish = (event) => {
        if (settled) return;
        settled = true;
        writeEvent(event);
        response.end();
      };
      writeEvent({
        status: 'running',
        phase: 'accessing',
        detail: opensRepository
          ? 'Checking private GitHub access.'
          : 'Loading the completed private build source.',
      });

      const workspaceDirectory = directory || repository.split('/')[1];
      const destination = resolve('prospect-workspaces', workspaceDirectory);
      const launch = () =>
        launchWebsite({
          destination,
          directory: workspaceDirectory,
          request,
          writeEvent,
          finish,
        }).catch((error) =>
          finish({
            status: 'failed',
            phase: 'failed',
            detail:
              error instanceof Error
                ? error.message
                : 'The workspace is ready, but its website server could not be launched.',
          }),
        );
      const child = spawn(
        process.execPath,
        opensRepository
          ? [resolve('scripts/open-prospect-workspace.mjs'), '--repository', repository]
          : [
              resolve('scripts/export-local-build.mjs'),
              '--run',
              buildId,
              '--destination',
              destination,
            ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let output = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        output += chunk;
        const lines = output.split(/\r?\n/);
        output = lines.pop() ?? '';
        for (const line of lines) {
          if (line.includes('Cloning '))
            writeEvent({
              status: 'running',
              phase: 'cloning',
              detail: 'Cloning the private repository into prospect-workspaces.',
            });
          else if (line.includes('Updating '))
            writeEvent({
              status: 'running',
              phase: 'updating',
              detail:
                'Fast-forwarding the existing prospect workspace without overwriting local changes.',
            });
          else if (line.includes('Downloading the editable source'))
            writeEvent({
              status: 'running',
              phase: 'cloning',
              detail: 'Saving editable source and approved assets into prospect-workspaces.',
            });
          else if (line.includes('refinement logging is ready'))
            writeEvent({
              status: 'running',
              phase: 'verifying',
              detail: 'Made Solid refinement logging is ready.',
            });
          else if (line.includes('Adding the Made Solid refinement logging workflow'))
            writeEvent({
              status: 'running',
              phase: 'verifying',
              detail: 'Adding the Made Solid refinement logging workflow.',
            });
          else if (line.includes('Installing the prospect website dependencies'))
            writeEvent({
              status: 'running',
              phase: 'installing',
              detail: 'Installing the prospect website dependencies.',
            });
          else if (line.includes('dependencies are already installed'))
            writeEvent({
              status: 'running',
              phase: 'installing',
              detail: 'Website dependencies are already installed.',
            });
        }
      });
      child.stderr.resume();
      child.once('error', () => {
        finish({
          status: 'failed',
          phase: 'failed',
          detail:
            'Studio could not start the local workspace process. Use the manual command below.',
        });
      });
      child.once('exit', (code) => {
        if (code === 0) {
          if (exportsBuild) {
            writeEvent({
              status: 'running',
              phase: 'installing',
              detail: 'Installing the prospect website dependencies.',
            });
            const install = spawn(
              'npm',
              ['--prefix', destination, 'ci', '--include=dev', '--no-audit', '--no-fund'],
              { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'ignore', 'ignore'] },
            );
            install.once('error', () =>
              finish({
                status: 'failed',
                phase: 'failed',
                detail: 'The source was saved, but dependency installation could not start.',
              }),
            );
            install.once('exit', (installCode) =>
              installCode === 0
                ? void launch()
                : finish({
                    status: 'failed',
                    phase: 'failed',
                    detail:
                      'The source was saved, but its dependencies could not be installed. Open the manual fallback for recovery.',
                  }),
            );
          } else {
            void launch();
          }
        } else {
          finish({
            status: 'failed',
            phase: 'failed',
            detail:
              'Workspace setup stopped before completion. Check GitHub access, then retry or use the manual command below.',
          });
        }
      });
    });
  };
  return {
    name: 'made-solid-local-prospect-workspace',
    configurePreviewServer: configureWorkspaceServer,
    configureServer: configureWorkspaceServer,
  };
}
