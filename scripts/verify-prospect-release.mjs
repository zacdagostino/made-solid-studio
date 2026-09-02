#!/usr/bin/env node
/* global HTMLElement, document, getComputedStyle, requestAnimationFrame, window */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import {
  responsiveBrowserContextOptions,
  responsiveBrowserProfiles,
} from '../worker/responsive-browser-profiles.mjs';
import { meaningfulGitStatus } from './prospect-workspace-state.mjs';

const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const shaPattern = /^[0-9a-f]{40}$/i;
const verificationProfile = 'made-solid-edited-site-release-v1';
const arguments_ = process.argv.slice(2);
const directoryIndex = arguments_.indexOf('--directory');
const directory = directoryIndex >= 0 ? arguments_[directoryIndex + 1]?.trim() : '';

function emit(status, phase, detail, extra = {}) {
  process.stdout.write(`${JSON.stringify({ status, phase, detail, ...extra })}\n`);
}

function git(workspace, ...gitArguments) {
  return execFileSync('git', gitArguments, {
    cwd: workspace,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function run(command, commandArguments, cwd, environment = process.env) {
  const result = spawnSync(command, commandArguments, {
    cwd,
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status === 0) return;
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  const useful = output.split(/\r?\n/).filter(Boolean).slice(-18).join(' ');
  throw new Error(useful || `${command} exited with code ${result.status}.`);
}

function gitDirectory(workspace) {
  const resolved = git(workspace, 'rev-parse', '--git-dir');
  return realpathSync(resolve(workspace, resolved));
}

function writeJsonAtomically(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, path);
}

function repositoryUrl(workspace) {
  const remote = git(workspace, 'remote', 'get-url', 'origin');
  const sshMatch = remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, '')}`;
  return remote.replace(/\.git$/i, '');
}

async function persistReleaseForReporting(workspace, record) {
  const supabaseUrl = process.env.SITEFORGE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SITEFORGE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'The website passed its checks, but Studio cannot save its release record for reporting.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sourceRun, error: sourceRunError } = await supabase
    .from('builder_runs')
    .select('organization_id, business_id, build_manifest_id, status, quality_summary')
    .eq('id', record.sourceBuilderRunId)
    .eq('business_id', record.businessId)
    .eq('build_manifest_id', record.sourceManifestId)
    .single();
  if (sourceRunError || !sourceRun) {
    throw new Error(
      'The verified edit passed, but its source build lineage could not be recorded.',
    );
  }

  const digest = createHash('sha256').update(JSON.stringify(record)).digest('hex');
  const attestation = { ...record, digest };
  const cloudRecord = {
    attestation_id: record.id,
    organization_id: sourceRun.organization_id,
    business_id: record.businessId,
    source_builder_run_id: record.sourceBuilderRunId,
    source_manifest_id: record.sourceManifestId,
    source_repository_url: repositoryUrl(workspace),
    source_commit: record.sourceCommit,
    source_tree: record.sourceTree,
    source_branch: record.sourceBranch,
    source_edit_version: record.sourceEditVersion,
    verification_profile: record.verificationProfile,
    verified_at: record.verifiedAt,
    checks: record.checks,
    attestation,
    attestation_digest: digest,
    source_builder_status: sourceRun.status,
    source_builder_quality_summary: sourceRun.quality_summary,
  };
  const { error: insertError } = await supabase
    .from('source_release_attestations')
    .upsert(cloudRecord, { onConflict: 'attestation_digest', ignoreDuplicates: true });
  if (insertError) {
    throw new Error(
      'The verified edit passed, but its release record could not be saved for reporting.',
    );
  }
  const { data: saved, error: savedError } = await supabase
    .from('source_release_attestations')
    .select('id, attestation_id, attestation_digest')
    .eq('attestation_digest', digest)
    .single();
  if (
    savedError ||
    !saved ||
    saved.attestation_id !== record.id ||
    saved.attestation_digest !== digest
  ) {
    throw new Error('The exact verified edit could not be confirmed for report generation.');
  }
  return { status: 'saved', id: saved.id };
}

function normaliseSourceUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href.replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return '';
  }
}

const comparisonCaptureContract = 'verified-comparison-page-ready-v1';

async function waitForComparisonPageReady(page, viewport) {
  await page.waitForFunction(
    ({ width, height }) => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rectangle = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rectangle.width > 0 &&
          rectangle.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0
        );
      };
      const intro = document.querySelector('[data-siteforge-brand-intro]');
      return (
        document.readyState === 'complete' &&
        window.innerWidth === width &&
        window.innerHeight === height &&
        !document.documentElement.classList.contains('sf-route-transitioning') &&
        !visible(intro) &&
        visible(document.querySelector('main')) &&
        visible(document.querySelector('h1'))
      );
    },
    { width: viewport.width, height: viewport.height },
    { timeout: 15_000 },
  );
  await page.evaluate(async () => {
    await document.fonts?.ready;
    const visibleImages = [...document.images].filter((image) => {
      const rectangle = image.getBoundingClientRect();
      return rectangle.top < window.innerHeight && rectangle.bottom > 0;
    });
    await Promise.all(visibleImages.map((image) => image.decode().catch(() => undefined)));
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))),
    );
  });
  const state = await page.evaluate(() => {
    const root = document.documentElement;
    const intro = document.querySelector('[data-siteforge-brand-intro]');
    const introStyle = intro ? getComputedStyle(intro) : undefined;
    const introRectangle = intro?.getBoundingClientRect();
    const loaderVisible = Boolean(
      intro &&
      introStyle?.display !== 'none' &&
      introStyle?.visibility !== 'hidden' &&
      Number(introStyle?.opacity ?? 1) > 0 &&
      (introRectangle?.width ?? 0) > 0 &&
      (introRectangle?.height ?? 0) > 0,
    );
    return {
      pageReady: document.readyState === 'complete',
      loaderVisible,
      routeTransitioning: root.classList.contains('sf-route-transitioning'),
      layoutViewportWidth: window.innerWidth,
      layoutViewportHeight: window.innerHeight,
      horizontalOverflowPx: Math.max(0, root.scrollWidth - root.clientWidth),
      mainVisible: Boolean(document.querySelector('main')),
      h1Visible: Boolean(document.querySelector('h1')),
      visibleTextLength: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
    };
  });
  if (
    !state.pageReady ||
    state.loaderVisible ||
    state.routeTransitioning ||
    !state.mainVisible ||
    !state.h1Visible ||
    state.visibleTextLength < 40 ||
    state.layoutViewportWidth !== viewport.width ||
    state.layoutViewportHeight !== viewport.height ||
    state.horizontalOverflowPx > 1
  ) {
    throw new Error(
      `The redesigned comparison page was not ready at ${viewport.width}×${viewport.height}: ${JSON.stringify(state)}.`,
    );
  }
  return state;
}

async function renderedSourceRoutes(browser, baseUrl, routes) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const bySource = new Map();
  try {
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      const sourceUrl = await page
        .locator('meta[name="siteforge-source-url"]')
        .getAttribute('content')
        .catch(() => null);
      const key = normaliseSourceUrl(sourceUrl);
      if (key && !bySource.has(key)) bySource.set(key, route);
    }
  } finally {
    await context.close();
  }
  return bySource;
}

function verifiedTechnologyFoundation(workspace) {
  const packagePath = join(workspace, 'package.json');
  if (!existsSync(packagePath)) return { technologies: [] };
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    throw new Error('The exact edited website package could not be read for technology evidence.');
  }
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  const technologies = [];
  if (typeof dependencies.next === 'string') {
    technologies.push({ id: 'nextjs', name: 'Next.js', version: dependencies.next });
  }
  if (typeof dependencies.typescript === 'string' && existsSync(join(workspace, 'tsconfig.json'))) {
    technologies.push({ id: 'typescript', name: 'TypeScript', version: dependencies.typescript });
  }
  return { technologies };
}

async function persistDesignComparisonScreenshots(
  record,
  releaseRowId,
  browser,
  baseUrl,
  routes,
  technologyFoundation,
) {
  const supabaseUrl = process.env.SITEFORGE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SITEFORGE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Studio cannot save the redesigned comparison screenshots for reporting.');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, organization_id, business_id, crawl_run_id')
    .eq('business_id', record.businessId)
    .eq('status', 'ready')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (auditError) throw auditError;
  if (!audit) return { saved: 0, detail: 'No completed audit is available for comparison.' };
  const { data: observations, error: observationError } = await supabase
    .from('audit_observations')
    .select(
      'id, area, severity, confidence, review_state, source_urls, evidence_artifact_ids, viewport, created_at',
    )
    .eq('audit_id', audit.id)
    .eq('crawl_run_id', audit.crawl_run_id)
    .neq('area', 'Platform')
    .neq('confidence', 'low')
    .neq('review_state', 'blocked')
    .order('created_at', { ascending: true });
  if (observationError) throw observationError;
  const artifactIds = [
    ...new Set((observations ?? []).flatMap((item) => item.evidence_artifact_ids ?? [])),
  ];
  if (!artifactIds.length) return { saved: 0, detail: 'No screenshot evidence was selected.' };
  const { data: oldArtifacts, error: artifactError } = await supabase
    .from('artifacts')
    .select('id, storage_bucket, storage_path, metadata')
    .in('id', artifactIds)
    .eq('business_id', record.businessId)
    .eq('crawl_run_id', audit.crawl_run_id)
    .eq('kind', 'screenshot');
  if (artifactError) throw artifactError;
  const artifactsById = new Map((oldArtifacts ?? []).map((artifact) => [artifact.id, artifact]));
  const sourceRoutes = await renderedSourceRoutes(browser, baseUrl, routes);
  const candidates = [];
  for (const observation of observations ?? []) {
    const supportedSourceUrls = new Set((observation.source_urls ?? []).map(normaliseSourceUrl));
    for (const oldArtifact of (observation.evidence_artifact_ids ?? [])
      .map((id) => artifactsById.get(id))
      .filter(Boolean)) {
      if (
        oldArtifact.metadata?.captureContract !== 'real-device-responsive-audit-v1' ||
        oldArtifact.metadata?.viewportIntegrity?.status !== 'passed'
      ) {
        continue;
      }
      const viewport = oldArtifact.metadata?.viewport;
      if (
        !viewport ||
        !Number(viewport.width) ||
        !Number(viewport.height) ||
        !['mobile', 'tablet', 'desktop'].includes(viewport.label)
      ) {
        continue;
      }
      const sourceUrl = normaliseSourceUrl(oldArtifact.metadata?.sourceUrl);
      const route = sourceRoutes.get(sourceUrl);
      if (!sourceUrl || !route || !supportedSourceUrls.has(sourceUrl)) continue;
      const key = `${sourceUrl}:${viewport.width}x${viewport.height}:${oldArtifact.id}`;
      if (!candidates.some((item) => item.key === key)) {
        candidates.push({ key, observation, oldArtifact, route, sourceUrl, viewport });
      }
      if (candidates.length >= 12) break;
    }
    if (candidates.length >= 12) break;
  }
  let saved = 0;
  for (const candidate of candidates) {
    const responsiveProfile = responsiveBrowserProfiles[candidate.viewport.label];
    const responsiveOptions =
      responsiveProfile &&
      responsiveProfile.width === candidate.viewport.width &&
      responsiveProfile.height === candidate.viewport.height
        ? responsiveBrowserContextOptions(responsiveProfile)
        : {
            viewport: { width: candidate.viewport.width, height: candidate.viewport.height },
            isMobile: candidate.viewport.label !== 'desktop',
            hasTouch: candidate.viewport.label !== 'desktop',
            deviceScaleFactor: 1,
          };
    const context = await browser.newContext({
      ...responsiveOptions,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${candidate.route}`, { waitUntil: 'networkidle' });
      const captureState = await waitForComparisonPageReady(page, candidate.viewport);
      const renderedSourceUrl = normaliseSourceUrl(
        await page.locator('meta[name="siteforge-source-url"]').getAttribute('content'),
      );
      if (renderedSourceUrl !== candidate.sourceUrl) {
        throw new Error(
          `The redesigned comparison route ${candidate.route} does not match ${candidate.sourceUrl}.`,
        );
      }
      const requestedScrollProgress = Number(
        candidate.oldArtifact.metadata?.scrollState?.scrollProgress ?? 0,
      );
      if (requestedScrollProgress > 0) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await page.evaluate((progress) => {
            const maximumScrollY = Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight,
            );
            window.scrollTo(0, Math.round(maximumScrollY * progress));
          }, requestedScrollProgress);
          await page.waitForTimeout(350);
        }
      }
      const matchedScrollState = await page.evaluate(() => {
        const maximumScrollY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        return {
          scrollY: Math.round(window.scrollY),
          maximumScrollY: Math.round(maximumScrollY),
          scrollProgress:
            maximumScrollY > 0 ? Number((window.scrollY / maximumScrollY).toFixed(3)) : 0,
        };
      });
      if (
        requestedScrollProgress > 0 &&
        matchedScrollState.maximumScrollY > 0 &&
        Math.abs(matchedScrollState.scrollProgress - requestedScrollProgress) > 0.03
      ) {
        throw new Error('The redesigned comparison could not match the original scroll state.');
      }
      const image = await page.screenshot({ type: 'png' });
      const digest = createHash('sha256').update(image).digest('hex');
      const identity = createHash('sha256').update(candidate.key).digest('hex').slice(0, 20);
      const storageBucket = 'siteforge-artifacts';
      const storagePath = `${record.businessId}/release-comparisons/${record.sourceCommit}/${releaseRowId}/${identity}.png`;
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(storagePath, image, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;
      const metadata = {
        evidenceKind: 'edited-site-comparison',
        releaseAttestationId: releaseRowId,
        sourceCommit: record.sourceCommit,
        sourceEditVersion: record.sourceEditVersion,
        sourceUrl: candidate.sourceUrl,
        generatedRoute: candidate.route,
        viewport: {
          width: candidate.viewport.width,
          height: candidate.viewport.height,
          label: candidate.viewport.label,
        },
        originalArtifactId: candidate.oldArtifact.id,
        observationId: candidate.observation.id,
        originalEvidenceKind: candidate.oldArtifact.metadata?.evidenceKind,
        matchedOriginalScrollProgress: requestedScrollProgress,
        scrollState: matchedScrollState,
        captureContract: comparisonCaptureContract,
        captureStatus: 'passed',
        pageReady: captureState.pageReady,
        loaderVisible: captureState.loaderVisible,
        routeTransitioning: captureState.routeTransitioning,
        layoutViewportWidth: captureState.layoutViewportWidth,
        layoutViewportHeight: captureState.layoutViewportHeight,
        horizontalOverflowPx: captureState.horizontalOverflowPx,
        visibleTextLength: captureState.visibleTextLength,
        technologyFoundation,
      };
      const { error: saveError } = await supabase.from('artifacts').upsert(
        {
          organization_id: audit.organization_id,
          business_id: record.businessId,
          crawl_run_id: audit.crawl_run_id,
          kind: 'screenshot',
          storage_bucket: storageBucket,
          storage_path: storagePath,
          content_type: 'image/png',
          byte_size: image.length,
          sha256: digest,
          metadata,
        },
        { onConflict: 'storage_path' },
      );
      if (saveError) throw saveError;
      saved += 1;
    } finally {
      await context.close();
    }
  }
  return {
    saved,
    detail: `Saved ${saved} exact-commit screenshot${saved === 1 ? '' : 's'} for design comparison.`,
  };
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.js' || extension === '.mjs') return 'text/javascript; charset=utf-8';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.woff2') return 'font/woff2';
  return 'application/octet-stream';
}

async function startStaticServer(root) {
  const resolvedRoot = resolve(root);
  const server = createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let target = resolve(resolvedRoot, relativePath);
    if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (existsSync(target) && lstatSync(target).isDirectory()) target = join(target, 'index.html');
    if (!existsSync(target) && !extname(target)) target = join(target, 'index.html');
    if (!existsSync(target) || !lstatSync(target).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': contentType(target) });
    response.end(readFileSync(target));
  });
  await new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Could not start the release server.');
  return { server, url: `http://127.0.0.1:${address.port}` };
}

function outputRoutes(root) {
  const routes = [];
  const visit = (directoryPath) => {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const path = join(directoryPath, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === 'index.html') {
        const parent = relative(root, dirname(path)).split(sep).join('/');
        if (
          (!parent || !parent.startsWith('_next')) &&
          parent !== '404' &&
          parent !== '_not-found'
        ) {
          routes.push(parent ? `/${parent}/` : '/');
        }
      }
    }
  };
  visit(root);
  return [...new Set(routes)].sort((left, right) => left.localeCompare(right));
}

async function checkResponsiveLayout(browser, baseUrl, routes) {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const checkedRoutes = viewport.width === 375 ? routes : ['/'];
    for (const route of checkedRoutes) {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'networkidle',
      });
      if (!response?.ok())
        throw new Error(`${route} returned ${response?.status() ?? 'no response'}.`);
      const result = await page.evaluate(() => ({
        overflow:
          globalThis.document.documentElement.scrollWidth -
          globalThis.document.documentElement.clientWidth,
        main: globalThis.document.querySelectorAll('main').length,
        h1: globalThis.document.querySelectorAll('h1').length,
      }));
      if (result.overflow > 1)
        throw new Error(`${route} overflows by ${result.overflow}px at ${viewport.width}px.`);
      if (result.main !== 1)
        throw new Error(`${route} must have one main landmark; found ${result.main}.`);
      if (result.h1 !== 1) throw new Error(`${route} must have one H1; found ${result.h1}.`);
    }
    await context.close();
  }
  return `Checked ${routes.length} routes at mobile and the homepage at 320, 375, 768 and 1440 pixels.`;
}

async function checkResponsiveNavigation(browser, baseUrl) {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
  ]) {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const trigger = page.locator('[data-siteforge-menu-trigger]:visible').first();
    if (!(await trigger.count()))
      throw new Error(`No compact navigation trigger was found at ${viewport.width}px.`);
    const targetSize = await trigger.boundingBox();
    if (!targetSize || targetSize.width < 44 || targetSize.height < 44) {
      throw new Error(
        `The compact navigation trigger is smaller than 44×44 at ${viewport.width}px.`,
      );
    }
    const surface = page.locator('[data-siteforge-navigation-dialog]');
    await trigger.click();
    await page.waitForFunction(
      (selector) =>
        globalThis.document.querySelector(selector)?.getAttribute('aria-expanded') === 'true',
      '[data-siteforge-menu-trigger]',
    );
    await surface.waitFor({ state: 'visible' });
    const links = surface.locator('a:visible');
    const linkCount = await links.count();
    if (linkCount < 2)
      throw new Error(`Compact navigation exposes fewer than two routes at ${viewport.width}px.`);
    const positions = await links.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
    if (new Set(positions.map((value) => Math.round(value))).size !== positions.length) {
      throw new Error(
        `Compact navigation links are not vertically stacked at ${viewport.width}px.`,
      );
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      (selector) =>
        globalThis.document.querySelector(selector)?.getAttribute('aria-expanded') === 'false',
      '[data-siteforge-menu-trigger]',
    );
    if (!(await trigger.evaluate((element) => element === globalThis.document.activeElement))) {
      throw new Error(`Compact navigation did not restore focus at ${viewport.width}px.`);
    }
    await trigger.click();
    await page.waitForFunction(
      (selector) =>
        globalThis.document.querySelector(selector)?.getAttribute('aria-expanded') === 'true',
      '[data-siteforge-menu-trigger]',
    );
    await context.close();
  }
  return 'Compact navigation opened twice under reduced motion, stacked routes, dismissed with Escape and restored focus.';
}

async function checkAccessibility(browser, baseUrl) {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    if (results.violations.length) {
      throw new Error(
        `${results.violations.length} accessibility violation${results.violations.length === 1 ? '' : 's'} at ${viewport.width}px: ${results.violations.map((item) => item.id).join(', ')}.`,
      );
    }
    await context.close();
  }
  return 'Homepage passed axe WCAG A/AA checks at mobile, tablet and desktop.';
}

async function runCheck(id, label, action) {
  try {
    const detail = await action();
    return { id, label, status: 'passed', detail };
  } catch (error) {
    return {
      id,
      label,
      status: 'failed',
      detail: error instanceof Error ? error.message : `${label} failed.`,
    };
  }
}

let verificationRoot;
let verificationWorkspace;
let sourceWorkspace;
let attemptPath;
let browser;
let staticServer;
try {
  if (!directory || !directoryPattern.test(directory))
    throw new Error('A valid prospect workspace directory is required.');
  const studioWorkspace = process.env.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim();
  const prospectRoot = studioWorkspace
    ? resolve(studioWorkspace, 'prospect-workspaces')
    : resolve(process.env.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim() || 'prospect-workspaces');
  sourceWorkspace = resolve(prospectRoot, directory);
  if (!existsSync(join(sourceWorkspace, '.git')))
    throw new Error('Open the prospect workspace before release verification.');
  if (meaningfulGitStatus(sourceWorkspace))
    throw new Error('Commit or discard pending edits before release verification.');
  const branch = git(sourceWorkspace, 'branch', '--show-current');
  const commit = git(sourceWorkspace, 'rev-parse', 'HEAD').toLowerCase();
  const tree = git(sourceWorkspace, 'rev-parse', 'HEAD^{tree}').toLowerCase();
  const upstream = git(sourceWorkspace, 'rev-parse', '@{upstream}').toLowerCase();
  if (!shaPattern.test(commit) || commit !== upstream)
    throw new Error('The exact release commit must be synced to its upstream branch.');
  const origin = JSON.parse(
    readFileSync(join(sourceWorkspace, '.made-solid', 'origin.json'), 'utf8'),
  );
  if (!origin.businessId || !origin.studioBuildId || !origin.buildManifestId)
    throw new Error('The editable repository has incomplete Studio build lineage.');
  const checkpointCount = Number(
    git(sourceWorkspace, 'log', '--format=%s')
      .split(/\r?\n/)
      .filter((subject) => /^(?:Finalize Made Solid edit:|Made Solid edit v\d+)/.test(subject))
      .length,
  );
  const currentSubject = git(sourceWorkspace, 'log', '-1', '--pretty=%s');
  const editVersion = /^(?:Finalize Made Solid edit:|Made Solid edit v\d+)/.test(currentSubject)
    ? Math.max(1, checkpointCount)
    : checkpointCount + 1;
  const gitRoot = gitDirectory(sourceWorkspace);
  const storageDirectory = join(gitRoot, 'made-solid', 'release-attestations');
  attemptPath = join(storageDirectory, 'latest-attempt.json');
  verificationRoot = mkdtempSync(join(tmpdir(), 'made-solid-release-'));
  verificationWorkspace = join(verificationRoot, directory);
  emit(
    'running',
    'preparing',
    `Preparing immutable commit ${commit.slice(0, 8)} for release verification.`,
  );
  run('git', ['worktree', 'add', '--detach', verificationWorkspace, commit], sourceWorkspace);
  symlinkSync(
    join(sourceWorkspace, 'node_modules'),
    join(verificationWorkspace, 'node_modules'),
    'dir',
  );
  const checks = [];
  emit(
    'running',
    'source_verification',
    'Running formatting, lint, type checks, build and project quality gates.',
  );
  checks.push(
    await runCheck('source-verification', 'Exact source verification', async () => {
      run('npm', ['run', 'verify'], verificationWorkspace, {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production',
      });
      return 'The exact committed source passed its complete npm verification command.';
    }),
  );
  if (checks.at(-1).status === 'passed') {
    const outputDirectory = join(verificationWorkspace, 'out');
    if (!existsSync(join(outputDirectory, 'index.html')))
      throw new Error('Verification did not create a static website output.');
    const routes = outputRoutes(outputDirectory);
    staticServer = await startStaticServer(outputDirectory);
    browser = await chromium.launch({ headless: true });
    emit(
      'running',
      'responsive_layout',
      `Checking ${routes.length} compiled routes and required viewports.`,
    );
    checks.push(
      await runCheck('responsive-layout', 'Responsive layout and route output', () =>
        checkResponsiveLayout(browser, staticServer.url, routes),
      ),
    );
    emit(
      'running',
      'responsive_navigation',
      'Checking compact navigation interaction, reduced motion and focus restoration.',
    );
    checks.push(
      await runCheck('responsive-navigation', 'Responsive navigation interaction', () =>
        checkResponsiveNavigation(browser, staticServer.url),
      ),
    );
    emit(
      'running',
      'accessibility',
      'Running automated accessibility checks at mobile, tablet and desktop.',
    );
    checks.push(
      await runCheck('accessibility', 'Automated accessibility', () =>
        checkAccessibility(browser, staticServer.url),
      ),
    );
  }
  const verifiedAt = new Date().toISOString();
  const passed = checks.length === 4 && checks.every((check) => check.status === 'passed');
  const identity = `${origin.businessId}:${origin.studioBuildId}:${commit}:${verificationProfile}`;
  const record = {
    schemaVersion: 1,
    id: createHash('sha256').update(identity).digest('hex'),
    status: passed ? 'passed' : 'failed',
    businessId: String(origin.businessId),
    sourceBuilderRunId: String(origin.studioBuildId),
    sourceManifestId: String(origin.buildManifestId),
    sourceCommit: commit,
    sourceTree: tree,
    sourceBranch: branch,
    sourceEditVersion: editVersion,
    verificationProfile,
    verifiedAt,
    checks,
  };
  writeJsonAtomically(attemptPath, record);
  if (!passed) {
    const failed = checks.filter((check) => check.status === 'failed');
    throw new Error(
      `${failed.length} release check${failed.length === 1 ? '' : 's'} failed: ${failed.map((check) => check.label).join(', ')}.`,
    );
  }
  emit(
    'running',
    'preparing',
    'Saving the exact verified edit so Studio can generate its value report.',
  );
  const reportRelease = await persistReleaseForReporting(sourceWorkspace, record);
  emit(
    'running',
    'comparison_evidence',
    'Capturing like-for-like screenshots from the exact edited website for its design report.',
  );
  const comparisonEvidence = await persistDesignComparisonScreenshots(
    record,
    reportRelease.id,
    browser,
    staticServer.url,
    outputRoutes(join(verificationWorkspace, 'out')),
    verifiedTechnologyFoundation(verificationWorkspace),
  );
  if (comparisonEvidence.saved < 1) {
    throw new Error(
      'The website passed release checks, but Studio could not create a matched before-and-after screenshot. Review the current audit routes and responsive evidence, then retry the comparison refresh.',
    );
  }
  writeJsonAtomically(join(dirname(attemptPath), `${commit}.json`), record);
  emit(
    'complete',
    'ready',
    `Commit ${commit.slice(0, 8)} passed every edited-site release check.`,
    { attestation: record, reportRelease, comparisonEvidence },
  );
} catch (error) {
  emit('failed', 'failed', error instanceof Error ? error.message : 'Release verification failed.');
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  await new Promise((resolveClose) => staticServer?.server.close(resolveClose) ?? resolveClose());
  if (verificationWorkspace && sourceWorkspace && existsSync(verificationWorkspace)) {
    try {
      run('git', ['worktree', 'remove', '--force', verificationWorkspace], sourceWorkspace);
    } catch {
      rmSync(verificationWorkspace, { recursive: true, force: true });
    }
  }
  if (verificationRoot) rmSync(verificationRoot, { recursive: true, force: true });
}
