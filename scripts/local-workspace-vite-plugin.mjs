import { execFileSync, spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { waitForHomepageCapture } from './homepage-capture-readiness.mjs';
import { authorizeStudioRuntimeRequest } from './studio-runtime-auth.mjs';
import { reconfirmRehearsalQuote, rehearsalWorkspace } from './rehearsal-workspace.mjs';
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
import { CodexChatPreferencesStore } from './codex-chat-preferences.mjs';
import {
  checkForCodexUpdate,
  publicCodexUpdateStatus,
  retryCodexUpdate,
  updatePaths,
} from './codex-runtime-updates.mjs';
import { studioDevelopmentOrigins } from './studio-development-origins.mjs';
import { queueBuilderQualityRepair } from './builder-quality-repair.mjs';
import {
  runAutomaticDevelopmentRelease,
  runFeatureDeployment,
} from './feature-release-deployment.mjs';
import { FeatureReleaseStore } from './feature-release-store.mjs';
import {
  capturedResponsiveHomepageGifs,
  responsiveComparisonTimeline,
  responsiveDesktopProfile,
} from './scrolling-homepage-gif.mjs';
import {
  meaningfulGitStatus,
  restoreGeneratedNextEnvironment,
} from './prospect-workspace-state.mjs';

const localWorkspaceEndpoint = '/__made-solid/local-workspace';
const workspacePreviewAccessEndpoint = '/__made-solid/workspace-preview-access';
const workspaceDevelopmentAccessEndpoint = '/__made-solid/workspace-development-access';
const developmentProjectsEndpoint = '/__made-solid/development-projects';
const featureReleasesEndpoint = '/__made-solid/feature-releases';
const workspaceCodexEndpoint = '/__made-solid/workspace-codex';
const refinementLedgerEndpoint = '/__made-solid/refinement-ledger';
const learningBundleEndpoint = '/__made-solid/learning-bundle';
const finalEditEndpoint = '/__made-solid/final-edit';
const releaseVerificationEndpoint = '/__made-solid/release-verification';
const committedPreviewEndpoint = '/__made-solid/committed-preview';
const codexFeedbackEndpoint = '/__made-solid/codex-feedback';
const codexBranchEndpoint = '/__made-solid/codex-branch';
const codexStatusEndpoint = '/__made-solid/codex-status';
const codexNotificationsEndpoint = '/__made-solid/codex-notifications';
const codexUpdatesEndpoint = '/__made-solid/codex-updates';
const codexPreferencesEndpoint = '/__made-solid/codex-preferences';
const aiBillingModeEndpoint = '/__made-solid/ai-billing-mode';
const codexSpeechEndpoint = '/__made-solid/codex-speech';
const builderQualityRepairEndpoint = '/__made-solid/builder-quality-repair';
const clientspaceQuoteReconfirmationEndpoint =
  '/__made-solid/integrations/clientspace/reconfirm-quote';
const clientspaceHomepageCaptureEndpoint =
  '/__made-solid/integrations/clientspace/homepage-capture';
const codexAttachmentPrefix = '/__made-solid/codex-attachment/';
const localPageCaptureEndpoint = '/__made-solid/page-screenshot';
const captureAssetEndpoint = '/__made-solid/capture-asset';
const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const buildIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const workspaceRevisionPattern = /^(?:working|[0-9a-f]{40})$/i;
const maximumCaptureAssetBytes = 5 * 1024 * 1024;
const captureAssetCache = new Map();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function captureClientspaceHomepage(browser, input) {
  if (!uuidPattern.test(input?.projectId || '') || !uuidPattern.test(input?.rehearsalId || '')) {
    throw new Error('The Clientspace capture identifiers are invalid.');
  }
  const target = await assertPublicUrl(input?.websiteUrl || '');
  if (
    target.protocol !== 'https:' ||
    (target.hostname !== 'madesolid.com.au' && !target.hostname.endsWith('.madesolid.com.au'))
  ) {
    throw new Error('Only a verified Made Solid preview can be captured for Clientspace.');
  }
  const comparisonTarget = input?.comparisonUrl ? await assertPublicUrl(input.comparisonUrl) : null;
  if (comparisonTarget && comparisonTarget.protocol !== 'https:') {
    throw new Error('The current website comparison must use HTTPS.');
  }
  if (!comparisonTarget) {
    throw new Error('The verified current website is required for a paired comparison.');
  }

  const goto = (page, url) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const warmAndSettle = async (page) => {
    await page.evaluate(async () => {
      for (const image of globalThis.document.images) {
        image.loading = 'eager';
        image.fetchPriority = 'high';
      }
      const bottom = Math.max(
        globalThis.document.documentElement.scrollHeight - globalThis.innerHeight,
        0,
      );
      const step = Math.max(280, Math.floor(globalThis.innerHeight * 0.75));
      for (let top = 0; top <= bottom; top += step) {
        globalThis.scrollTo({ top, behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      globalThis.scrollTo({ top: 0, behavior: 'instant' });
    });
    await waitForHomepageCapture(page);
  };
  const comparisonAsset = (kind, device, content, viewport, pageHeight) => ({
    kind,
    device,
    content: content.toString('base64'),
    contentType: 'image/jpeg',
    width: viewport.width,
    height: viewport.height,
    pageHeight: Math.max(viewport.height, Math.round(pageHeight)),
  });

  const captureDevice = async ({ viewport, profile }) => {
    const [currentContext, redesignContext] = await Promise.all([
      browser.newContext({ viewport, reducedMotion: 'no-preference', colorScheme: 'light' }),
      browser.newContext({ viewport, reducedMotion: 'no-preference', colorScheme: 'light' }),
    ]);
    try {
      const [currentPage, redesignPage] = await Promise.all([
        currentContext.newPage(),
        redesignContext.newPage(),
      ]);
      await Promise.all([
        goto(currentPage, comparisonTarget.href),
        goto(redesignPage, target.href),
      ]);
      await Promise.all([
        currentPage.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined),
        redesignPage.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined),
      ]);
      await Promise.all([warmAndSettle(currentPage), warmAndSettle(redesignPage)]);
      const [currentComparison, redesignComparison] = await Promise.all([
        currentPage.screenshot({ type: 'jpeg', quality: 68 }),
        redesignPage.screenshot({ type: 'jpeg', quality: 68 }),
      ]);

      // Reload only the redesign so its authentic loader and hero entrance are
      // replayed while the current site remains visible beside it.
      await goto(redesignPage, target.href);
      await redesignPage.evaluate(() => {
        for (const image of globalThis.document.images) {
          image.loading = 'eager';
          image.fetchPriority = 'high';
        }
        globalThis.scrollTo({ top: 0, behavior: 'instant' });
      });
      const screenshot = (page) => page.screenshot({ type: 'jpeg', quality: 76 });
      const currentTop = await screenshot(currentPage);
      const pairs = [];
      const delays = [];
      let loadingFrameCount = 0;
      const captureIntervalMs = 80;
      for (let index = 0; index < 20; index += 1) {
        const startedAt = Date.now();
        pairs.push({ current: currentTop, redesign: await screenshot(redesignPage) });
        delays.push(captureIntervalMs);
        loadingFrameCount += 1;
        const introVisible = await redesignPage.evaluate(() => {
          const intro = globalThis.document.querySelector('[data-siteforge-brand-intro]');
          if (!(intro instanceof globalThis.HTMLElement)) return false;
          const style = globalThis.getComputedStyle(intro);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) > 0.01
          );
        });
        if (index >= 8 && !introVisible) break;
        const remaining = captureIntervalMs - (Date.now() - startedAt);
        if (remaining > 0) await redesignPage.waitForTimeout(remaining);
      }
      const revealFrameCount = 15;
      for (let index = 0; index < revealFrameCount; index += 1) {
        const startedAt = Date.now();
        pairs.push({ current: currentTop, redesign: await screenshot(redesignPage) });
        delays.push(captureIntervalMs);
        const remaining = captureIntervalMs - (Date.now() - startedAt);
        if (remaining > 0) await redesignPage.waitForTimeout(remaining);
      }
      await warmAndSettle(redesignPage);
      const [currentHeight, redesignHeight] = await Promise.all([
        currentPage.evaluate(() => globalThis.document.documentElement.scrollHeight),
        redesignPage.evaluate(() => globalThis.document.documentElement.scrollHeight),
      ]);
      const currentDistance = Math.max(0, currentHeight - viewport.height);
      const redesignDistance = Math.max(0, redesignHeight - viewport.height);
      const timeline = responsiveComparisonTimeline(
        profile.width * profile.height * 3,
        pairs.length,
      );
      for (const [index, progress] of timeline.progress.entries()) {
        await Promise.all([
          currentPage.evaluate(
            (top) => globalThis.scrollTo({ top, behavior: 'instant' }),
            Math.round(currentDistance * progress),
          ),
          redesignPage.evaluate(
            (top) => globalThis.scrollTo({ top, behavior: 'instant' }),
            Math.round(redesignDistance * progress),
          ),
        ]);
        await redesignPage.waitForTimeout(45);
        const [current, redesign] = await Promise.all([
          screenshot(currentPage),
          screenshot(redesignPage),
        ]);
        pairs.push({ current, redesign });
        delays.push(index === timeline.progress.length - 1 ? 1_200 : timeline.scrollDelayMs);
      }
      const animations = await capturedResponsiveHomepageGifs(
        {
          pairs,
          delays,
          loadingFrameCount,
          revealFrameCount,
          scrollFrameCount: timeline.scrollFrameCount,
        },
        { profile },
      );
      if (!animations) throw new Error('The desktop comparisons exceeded the email image limit.');
      const media = await redesignPage.evaluate(() => {
        const images = Array.from(globalThis.document.images).filter(
          (candidate) => candidate.currentSrc || candidate.src,
        );
        return {
          imageCount: images.length,
          loadedImageCount: images.filter(
            (candidate) => candidate.complete && candidate.naturalWidth > 0,
          ).length,
        };
      });
      const result = (kind, animation) => ({
        kind,
        content: animation.content.toString('base64'),
        contentType: 'image/gif',
        width: animation.width,
        height: animation.height,
        animation: {
          frameCount: animation.frameCount,
          durationMs: animation.durationMs,
          loop: true,
          phases: animation.phases,
        },
        media,
      });
      return {
        captures: {
          current: result('current', animations.current),
          redesign: result('redesign', animations.redesign),
        },
        comparisons: {
          current: comparisonAsset(
            'current',
            'desktop',
            currentComparison,
            viewport,
            currentHeight,
          ),
          redesign: comparisonAsset(
            'redesign',
            'desktop',
            redesignComparison,
            viewport,
            redesignHeight,
          ),
        },
      };
    } finally {
      await Promise.all([currentContext.close(), redesignContext.close()]);
    }
  };

  const captureStaticDevice = async (device, viewport) => {
    const [currentContext, redesignContext] = await Promise.all([
      browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' }),
      browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' }),
    ]);
    try {
      const [currentPage, redesignPage] = await Promise.all([
        currentContext.newPage(),
        redesignContext.newPage(),
      ]);
      await Promise.all([
        goto(currentPage, comparisonTarget.href),
        goto(redesignPage, target.href),
      ]);
      await Promise.all([
        currentPage.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined),
        redesignPage.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined),
      ]);
      await Promise.all([warmAndSettle(currentPage), warmAndSettle(redesignPage)]);
      const [current, redesign, currentHeight, redesignHeight] = await Promise.all([
        currentPage.screenshot({ type: 'jpeg', quality: 68 }),
        redesignPage.screenshot({ type: 'jpeg', quality: 68 }),
        currentPage.evaluate(() => globalThis.document.documentElement.scrollHeight),
        redesignPage.evaluate(() => globalThis.document.documentElement.scrollHeight),
      ]);
      return {
        current: comparisonAsset('current', device, current, viewport, currentHeight),
        redesign: comparisonAsset('redesign', device, redesign, viewport, redesignHeight),
      };
    } finally {
      await Promise.all([currentContext.close(), redesignContext.close()]);
    }
  };

  const desktop = await captureDevice({
    viewport: { width: 1440, height: 900 },
    profile: responsiveDesktopProfile,
  });
  const [phone, tablet] = await Promise.all([
    captureStaticDevice('phone', { width: 375, height: 812 }),
    captureStaticDevice('tablet', { width: 768, height: 1024 }),
  ]);
  return {
    readinessContract: 'rendered-email-homepage-capture-v3',
    captures: desktop.captures,
    comparisons: {
      phone,
      tablet,
      desktop: desktop.comparisons,
    },
  };
}

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

function clientspaceIntegrationAuthorised(request, environment = process.env) {
  const expected = Buffer.from(environment.STUDIO_HANDOFF_SECRET?.trim() || '');
  const supplied = Buffer.from(
    String(request.headers.authorization || '')
      .replace(/^Bearer /i, '')
      .trim(),
  );
  return Boolean(
    expected.length && expected.length === supplied.length && timingSafeEqual(expected, supplied),
  );
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
  const studioWorkspace = environment.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim();
  if (studioWorkspace) candidates.push(resolve(studioWorkspace, 'prospect-workspaces', directory));
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

export function prospectWorkspacePath(directory, environment = process.env) {
  if (!directoryPattern.test(directory)) return undefined;
  const studioWorkspace = environment.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim();
  if (studioWorkspace) return resolve(studioWorkspace, 'prospect-workspaces', directory);
  const prospectRoot = environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim();
  return resolve(prospectRoot || 'prospect-workspaces', directory);
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
  const workspace = prospectWorkspacePath(directory);
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
  const workspace = prospectWorkspacePath(directory);
  if (!existsSync(resolve(workspace, '.git'))) {
    return {
      status: 'unavailable',
      detail: 'Open the local prospect workspace before creating its final edit checkpoint.',
    };
  }
  const [ledger, branch, commit, tree, subject, changedSource, originSource] = await Promise.all([
    readRefinementLedger(directory),
    Promise.resolve(gitOutput(workspace, 'branch', '--show-current')),
    Promise.resolve(gitOutput(workspace, 'rev-parse', 'HEAD')),
    Promise.resolve(gitOutput(workspace, 'rev-parse', 'HEAD^{tree}')),
    Promise.resolve(gitOutput(workspace, 'log', '-1', '--pretty=%s')),
    Promise.resolve(meaningfulGitStatus(workspace)),
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
  const finalCommit =
    subject.startsWith('Finalize Made Solid edit:') || subject.startsWith('Made Solid edit v');
  const synced = Boolean(commit && upstreamCommit && commit === upstreamCommit);
  const taggedFinalised = finalCommit && changedFiles.length === 0 && synced;
  let origin;
  try {
    origin = JSON.parse(originSource);
  } catch {
    origin = {};
  }
  const releaseDirectory = resolve(
    workspace,
    gitOutput(workspace, 'rev-parse', '--git-dir'),
    'made-solid',
    'release-attestations',
  );
  const releaseRecord = async (path) => {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch {
      return undefined;
    }
  };
  const [matchingAttestation, latestAttempt] = await Promise.all([
    releaseRecord(resolve(releaseDirectory, `${commit.toLowerCase()}.json`)),
    releaseRecord(resolve(releaseDirectory, 'latest-attempt.json')),
  ]);
  const recordMatches = (record) =>
    record?.schemaVersion === 1 &&
    record?.verificationProfile === 'made-solid-edited-site-release-v1' &&
    record?.businessId === String(origin.businessId || '') &&
    record?.sourceBuilderRunId === String(origin.studioBuildId || '') &&
    record?.sourceManifestId === String(origin.buildManifestId || '') &&
    record?.sourceCommit === commit.toLowerCase() &&
    record?.sourceTree === tree.toLowerCase();
  const releaseAttestation =
    recordMatches(matchingAttestation) &&
    matchingAttestation.status === 'passed' &&
    matchingAttestation.checks?.every((check) => check.status === 'passed')
      ? matchingAttestation
      : undefined;
  const matchingFailedAttempt =
    recordMatches(latestAttempt) && latestAttempt.status === 'failed' ? latestAttempt : undefined;
  const releaseStatus = releaseAttestation
    ? 'passed'
    : matchingFailedAttempt
      ? 'failed'
      : latestAttempt?.sourceCommit && latestAttempt.sourceCommit !== commit.toLowerCase()
        ? 'stale'
        : 'missing';
  const finalised =
    taggedFinalised || Boolean(releaseAttestation && changedFiles.length === 0 && synced);
  const releaseVersion =
    releaseAttestation &&
    !versions.some((version) => version.commit === releaseAttestation.sourceCommit)
      ? {
          version: releaseAttestation.sourceEditVersion,
          commit: releaseAttestation.sourceCommit,
          committedAt: releaseAttestation.verifiedAt,
          subject: 'Exact edited-site release verification',
          commitUrl: githubCommitUrl(workspace, releaseAttestation.sourceCommit),
        }
      : undefined;
  const effectiveVersions = releaseVersion ? [...versions, releaseVersion] : versions;
  const committedVersion = effectiveVersions.at(-1);
  const baseState = {
    releaseVerificationAvailable: true,
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
    businessId: String(origin.businessId || ''),
    sourceBuild: origin.studioBuildId
      ? {
          buildId: String(origin.studioBuildId || ''),
          manifestId: String(origin.buildManifestId || ''),
          agentPackageId: String(origin.agentPackageId || ''),
          agentPackageVersion:
            typeof origin.agentPackageVersion === 'number' ? origin.agentPackageVersion : undefined,
          buildMode: typeof origin.buildMode === 'string' ? origin.buildMode : undefined,
          templateVersion:
            typeof origin.templateVersion === 'string' ? origin.templateVersion : undefined,
          baselineCommit:
            typeof origin.baselineCommit === 'string' ? origin.baselineCommit : undefined,
          exportedAt: typeof origin.exportedAt === 'string' ? origin.exportedAt : undefined,
        }
      : undefined,
    releaseStatus,
    releaseAttestation,
    releaseAttempt: matchingFailedAttempt,
    versions: effectiveVersions,
    committedVersion,
    workingVersion: Math.max(effectiveVersions.length + 1, (committedVersion?.version ?? 0) + 1),
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
      workspace: resolve(destination),
    });
    process.env.SITEFORGE_ACTIVE_PREVIEW_DIRECTORY = directory;
  }
  restoreGeneratedNextEnvironment(destination);
  finish({
    status: 'complete',
    phase: 'ready',
    detail: readyDetail ?? `The website is running from prospect-workspaces/${directory}.`,
    previewUrl: previewUrl(request, port, process.env, { directory, revision }),
    terminalSession: sessionName,
  });
}

async function launchCommittedPreview({ directory, commit, request, writeEvent, finish }) {
  const workspace = prospectWorkspacePath(directory);
  const version = editVersionHistory(workspace).find((candidate) => candidate.commit === commit);
  if (!version) throw new Error('Choose a committed Made Solid edit version from this workspace.');
  const shortCommit = commit.slice(0, 8);
  const previewRoot = resolve(workspace, '..', '.made-solid-previews');
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
  const featureRepositories = [
    {
      id: 'studio',
      product: 'studio',
      label: 'Made Solid Studio',
      directory: process.env.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim() || process.cwd(),
    },
    process.env.MADE_SOLID_WEBSITE_DIRECTORY?.trim()
      ? {
          id: 'website',
          product: 'website',
          label: 'Made Solid website & Clientspace',
          directory: process.env.MADE_SOLID_WEBSITE_DIRECTORY.trim(),
        }
      : undefined,
  ].filter(Boolean);
  const featureReleaseStore = new FeatureReleaseStore({
    repositories: featureRepositories,
    storagePath: runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'feature-releases.json')
      : resolve('.made-solid', 'feature-releases.json'),
  });
  const codexChatPreferences = new CodexChatPreferencesStore({
    storagePath: runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'codex-chat-preferences.json')
      : resolve('.made-solid', 'codex-chat-preferences.json'),
  });
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
    canDispatch: () => !existsSync(updatePaths(process.env).restartRequest),
    featureReleaseStore,
    onFeatureRecorded: (feature) =>
      runAutomaticDevelopmentRelease({
        feature,
        featureReleaseStore,
        repositories: featureRepositories,
      }),
  };
  let activeCodexFeedbackBridge;
  let activeCodexFeedbackBridgeModifiedAt = 0;
  let codexFeedbackBridgeLoadPromise;
  const codexFeedbackBridge = async () => {
    const modifiedAt = (await stat(codexFeedbackBridgeSource)).mtimeMs;
    if (activeCodexFeedbackBridge && modifiedAt === activeCodexFeedbackBridgeModifiedAt) {
      return activeCodexFeedbackBridge;
    }
    const activeWork =
      activeCodexFeedbackBridge?.maintenancePromise || activeCodexFeedbackBridge?.flushPromise;
    if (activeWork) {
      await activeWork.catch(() => undefined);
      return codexFeedbackBridge();
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
          if (activeCodexFeedbackBridge?.trustedThreadScopes) {
            nextBridge.trustedThreadScopes = activeCodexFeedbackBridge.trustedThreadScopes;
          }
          if (activeCodexFeedbackBridge?.conversationTitles) {
            nextBridge.conversationTitles = activeCodexFeedbackBridge.conversationTitles;
            nextBridge.conversationTitlesLoaded =
              activeCodexFeedbackBridge.conversationTitlesLoaded;
          }
          activeCodexFeedbackBridge?.close();
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
    const canonicalWorkspace = workspacePreviewWorkspace(requestedDirectory);
    if (
      active &&
      canonicalWorkspace &&
      active.workspace === canonicalWorkspace &&
      (await websiteIsReady(active.port))
    )
      return active;
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
        .then((bridge) => {
          void bridge.maintain().catch(() => undefined);
          void bridge.syncCompletedFeatureReleases().catch(() => undefined);
        })
        .catch(() => undefined);
    maintainCodexFeedbackBridge();
    const feedbackFlush = setInterval(maintainCodexFeedbackBridge, 2_000);
    feedbackFlush.unref();
    server.httpServer?.once('close', () => {
      clearInterval(feedbackFlush);
      activeCodexFeedbackBridge?.close();
      void captureBrowserPromise?.then((browser) => browser.close()).catch(() => undefined);
    });
    server.middlewares.use(async (request, response, next) => {
      const requestUrl = new URL(request.url ?? '/', 'http://made-solid.local');
      if (requestUrl.pathname === '/health') {
        sendJson(response, 200, {
          status: 'ready',
          runtimeContract: 'made-solid-studio-runtime-v30.3',
          capabilities: [
            'clientspace-rehearsal-v1',
            'automatic-rehearsal-preview-v1',
            'guided-clientspace-test-v1',
            'universal-builder-profiles-v1',
            'resilient-codex-runtime-updates-v1',
            'manual-codex-update-retry-v1',
            'branded-exact-client-preview-v1',
            'email-ready-homepage-preview-v1',
            'clientspace-admin-website-preview-v1',
            'settled-email-homepage-capture-v2',
            'rendered-email-homepage-capture-v3',
            'automatic-builder-quality-repair-v1',
            'reliable-builder-repair-v1',
            'settled-navigation-quality-v1',
            'owner-device-preview-v1',
            'clientspace-balance-sync-v1',
            'continuous-client-email-inbox-v1',
            'purpose-aware-codex-branching-v1',
            'retrospective-chat-context-v1',
            'validated-codex-branch-actions-v1',
            'polished-device-preview-toolbar-v1',
            'pinned-tagged-codex-chats-v1',
            'feature-release-management-v1',
            'feature-release-metadata-v2',
            'automatic-feature-development-release-v1',
            'continuous-feature-release-reconciliation-v1',
            'clientspace-quote-reconfirmation-v1',
            'automatic-clientspace-homepage-capture-v1',
            'animated-clientspace-homepage-preview-v1',
            'animated-clientspace-homepage-preview-v2',
            'animated-clientspace-homepage-preview-v3',
            'animated-clientspace-homepage-preview-v4',
            'animated-clientspace-homepage-preview-v5',
            'paired-device-clientspace-homepage-preview-v6',
            'desktop-only-clientspace-homepage-preview-v7',
            'responsive-split-clientspace-homepage-preview-v8',
            'responsive-comparison-review-v1',
            'live-synchronized-comparison-v1',
            'interactive-device-correct-comparison-v1',
            'proxy-safe-live-comparison-v1',
            'exact-redesign-comparison-v1',
            'simplified-old-new-review-v1',
            'truthful-live-codex-progress-v1',
            'evidence-led-homepage-art-direction-v1',
            'inspect-email-reply-cta-v1',
            'railway-only-product-releases-v1',
          ],
        });
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
      if (requestUrl.pathname === clientspaceQuoteReconfirmationEndpoint) {
        if (request.method !== 'POST') {
          sendJson(response, 405, { detail: 'Use POST to reconfirm a rehearsal quote.' });
          return;
        }
        if (!clientspaceIntegrationAuthorised(request)) {
          sendJson(response, 401, { detail: 'Clientspace integration access required.' });
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 8 * 1024));
          sendJson(response, 200, await reconfirmRehearsalQuote(input));
        } catch (error) {
          sendJson(response, 409, {
            detail:
              error instanceof Error
                ? error.message
                : 'The rehearsal quote could not be reconfirmed.',
          });
        }
        return;
      }
      if (requestUrl.pathname === clientspaceHomepageCaptureEndpoint) {
        if (request.method !== 'POST') {
          sendJson(response, 405, { detail: 'Use POST to capture a Clientspace homepage.' });
          return;
        }
        if (!clientspaceIntegrationAuthorised(request)) {
          sendJson(response, 401, { detail: 'Clientspace integration access required.' });
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 16 * 1024));
          sendJson(response, 200, await captureClientspaceHomepage(await captureBrowser(), input));
        } catch (error) {
          sendJson(response, 409, {
            detail:
              error instanceof Error
                ? error.message
                : 'The verified homepage could not be captured.',
          });
        }
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
      if (requestUrl.pathname === '/__made-solid/rehearsal') {
        if (request.method !== 'POST') {
          sendJson(response, 405, { detail: 'Use POST for rehearsal actions.' });
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 128 * 1024));
          sendJson(response, 200, await rehearsalWorkspace(input, runtimeAuthorization));
        } catch (error) {
          sendJson(response, 400, {
            detail: error instanceof Error ? error.message : 'The rehearsal could not be prepared.',
          });
        }
        return;
      }
      if (requestUrl.pathname === builderQualityRepairEndpoint) {
        if (request.method !== 'POST') {
          sendJson(response, 405, { detail: 'Use POST to request a builder quality repair.' });
          return;
        }
        try {
          const input = JSON.parse(await readRequestBody(request, 8 * 1024));
          sendJson(response, 202, await queueBuilderQualityRepair(input, runtimeAuthorization));
        } catch (error) {
          sendJson(response, 400, {
            detail:
              error instanceof Error ? error.message : 'The quality repair could not be queued.',
          });
        }
        return;
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
      if (requestUrl.pathname === featureReleasesEndpoint) {
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Feature releases are only available from Made Solid Studio.',
          });
          return;
        }
        try {
          if (request.method === 'GET') {
            sendJson(response, 200, {
              status: 'ready',
              features: await featureReleaseStore.list(),
            });
            return;
          }
          if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end('Method not allowed');
            return;
          }
          const input = JSON.parse(await readRequestBody(request, 64 * 1024));
          if (input.action === 'link-thread') {
            await featureReleaseStore.linkThread(input);
            sendJson(response, 200, { status: 'saved' });
            return;
          }
          if (input.action === 'update-metadata') {
            const feature = await featureReleaseStore.updateMetadata(input);
            sendJson(response, 200, { status: 'saved', feature });
            return;
          }
          if (input.action === 'regenerate-metadata') {
            const feature = await featureReleaseStore.regenerateMetadata(input);
            sendJson(response, 200, { status: 'saved', feature });
            return;
          }
          if (input.action === 'merge-features') {
            const feature = await featureReleaseStore.mergeFeatures(input);
            sendJson(response, 200, { status: 'saved', feature });
            return;
          }
          if (input.action !== 'deploy') throw new Error('Choose a valid feature release action.');
          if (input.environment === 'production' && input.confirmed !== true) {
            throw new Error('Confirm the exact production promotion before continuing.');
          }
          const started = await featureReleaseStore.deploymentStarted(input);
          void runFeatureDeployment({
            feature: started.feature,
            run: started.run,
            repositories: featureRepositories,
          })
            .then((urls) =>
              featureReleaseStore.deploymentFinished({
                featureId: started.feature.id,
                runId: started.run.id,
                status: 'completed',
                detail: `The exact ${started.run.environment} release was deployed and verified.`,
                urls,
              }),
            )
            .catch((error) =>
              featureReleaseStore.deploymentFinished({
                featureId: started.feature.id,
                runId: started.run.id,
                status: 'failed',
                detail: error instanceof Error ? error.message : 'The deployment did not finish.',
              }),
            );
          sendJson(response, 202, {
            status: 'queued',
            feature: started.feature,
            run: started.run,
          });
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail: error instanceof Error ? error.message : 'Feature releases are unavailable.',
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
      if (requestUrl.pathname === codexUpdatesEndpoint) {
        if (request.method !== 'GET' && request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Codex update status is only available from Made Solid Studio.',
          });
          return;
        }
        let updateAction;
        if (request.method === 'POST') {
          try {
            updateAction = JSON.parse(await readRequestBody(request, 4 * 1024))?.action;
          } catch {
            sendJson(response, 400, {
              status: 'failed',
              detail: 'Choose a valid update action.',
            });
            return;
          }
          if (!['check', 'retry'].includes(updateAction)) {
            sendJson(response, 400, {
              status: 'failed',
              detail: 'Choose a valid update action.',
            });
            return;
          }
        }
        try {
          if (request.method === 'POST') {
            const current = await publicCodexUpdateStatus(process.env);
            if (
              [
                'checking',
                'downloading',
                'restart_pending',
                'restarting',
                'waiting_for_idle',
              ].includes(current.status)
            ) {
              sendJson(response, 409, {
                ...current,
                detail: 'A Codex update check or activation is already in progress.',
              });
              return;
            }
            await (updateAction === 'retry' ? retryCodexUpdate : checkForCodexUpdate)({
              environment: process.env,
            });
          }
          const status = await publicCodexUpdateStatus(process.env);
          let availableModels = [];
          let modelCatalogStatus = 'unavailable';
          try {
            availableModels = await (await codexFeedbackBridge()).listModels();
            modelCatalogStatus = 'ready';
          } catch {
            // Runtime updates remain visible while the App Server is restarting or unavailable.
          }
          sendJson(response, 200, { ...status, availableModels, modelCatalogStatus });
        } catch (error) {
          sendJson(response, 503, {
            status: 'unavailable',
            detail: error instanceof Error ? error.message : 'Codex update status is unavailable.',
          });
        }
        return;
      }
      if (requestUrl.pathname === codexPreferencesEndpoint) {
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'failed',
            detail: 'Codex preferences are only available from Made Solid Studio.',
          });
          return;
        }
        const userId = runtimeAuthorization?.userId || 'local-owner';
        try {
          if (request.method === 'GET') {
            sendJson(response, 200, {
              status: 'ready',
              preferences: await codexChatPreferences.read(userId),
            });
            return;
          }
          if (request.method !== 'PUT') {
            response.statusCode = 405;
            response.end('Method not allowed');
            return;
          }
          const input = JSON.parse(await readRequestBody(request, 16 * 1024));
          sendJson(response, 200, {
            status: 'saved',
            preferences: await codexChatPreferences.write(userId, input.preferences),
          });
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error ? error.message : 'Codex chat preferences could not be saved.',
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
            const inspected = await bridge.inspect({
              threadId: requestUrl.searchParams.get('threadId') || undefined,
              workspace,
              threadScope:
                requestUrl.searchParams.get('threadScope') === 'client' ? 'client' : 'universal',
            });
            sendJson(response, 200, {
              ...inspected,
              billing: runtimeAiBillingStatus(),
              capabilities: { aiConversationTitles: true, stopActiveTurn: true },
              runtimeUpdate: await publicCodexUpdateStatus(process.env).catch(() => undefined),
            });
            const untitledThreads = inspected.threads.filter(
              (thread) => !thread.compactTitle || !thread.dropdownTitle,
            );
            if (untitledThreads.length) {
              void bridge.scheduleConversationTitles({
                threadScope:
                  requestUrl.searchParams.get('threadScope') === 'client' ? 'client' : 'universal',
                workspace,
                threads: untitledThreads,
              });
            }
          } catch (error) {
            sendJson(response, 503, {
              status: 'unavailable',
              detail:
                error instanceof Error ? error.message : 'The local Codex service is unavailable.',
              models: [],
              queuedCount: 0,
              runtimeUpdate: await publicCodexUpdateStatus(process.env).catch(() => undefined),
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
          const startsCodexWork =
            requestUrl.pathname === codexBranchEndpoint ||
            [
              undefined,
              'enqueue',
              'refresh-conversation-titles',
              'temporary-question',
              'new-thread',
              'branch-thread',
              'repair-thread',
              'continue-interrupted-thread',
            ].includes(input.action);
          const updateActivationPending = existsSync(updatePaths(process.env).restartRequest);
          const canQueueDuringUpdate =
            requestUrl.pathname === codexFeedbackEndpoint &&
            [undefined, 'enqueue'].includes(input.action);
          if (startsCodexWork && updateActivationPending && !canQueueDuringUpdate) {
            sendJson(response, 409, {
              status: 'updating',
              detail:
                'Codex is activating a verified update. This action will be available after the Workspace Agent reconnects.',
            });
            return;
          }
          const bridge = await codexFeedbackBridge();
          let result;
          if (requestUrl.pathname === codexBranchEndpoint) {
            if (!['branch-thread', 'repair-thread'].includes(input.action)) {
              throw new Error('Choose a valid conversation action.');
            }
            result =
              input.action === 'repair-thread'
                ? await bridge.repairThread(input)
                : await bridge.forkThread(input);
          } else {
            switch (input.action) {
              case undefined:
              case 'enqueue':
                result = await bridge.enqueue(input, { deferDelivery: updateActivationPending });
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
              case 'delete-thread':
                result = await bridge.deleteThread(input);
                break;
              case 'update-thread-organization':
                result = await bridge.updateThreadOrganization(input);
                break;
              case 'refresh-conversation-titles':
                result = await bridge.refreshConversationTitles(input);
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
              case 'repair-thread':
                result = await bridge.repairThread(input);
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
      if (requestUrl.pathname === releaseVerificationEndpoint) {
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
        try {
          const body = JSON.parse(await readRequestBody(request));
          directory = typeof body.directory === 'string' ? body.directory.trim() : '';
        } catch {
          sendJson(response, 400, {
            status: 'failed',
            phase: 'failed',
            detail: 'A valid release-verification request is required.',
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
          [resolve('scripts/verify-prospect-release.mjs'), '--directory', directory],
          { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        child.stdout.pipe(response, { end: false });
        child.stderr.resume();
        child.once('error', () => {
          if (!response.writableEnded) {
            response.write(
              `${JSON.stringify({ status: 'failed', phase: 'failed', detail: 'Studio could not start release verification.' })}\n`,
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
      const localRepository = workspacePreviewWorkspace(directory);
      const hasLocalRepository = Boolean(localRepository);
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
      const destination = localRepository || prospectWorkspacePath(workspaceDirectory);
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
