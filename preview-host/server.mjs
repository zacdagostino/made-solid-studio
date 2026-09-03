import { createHash } from 'node:crypto';
import { createServer, request as createProxyRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { verifyWorkspacePreviewToken } from '../scripts/workspace-preview-access.mjs';
import { studioDevelopmentOrigins } from '../scripts/studio-development-origins.mjs';

const defaultPort = 8787;
const previewRoutePrefixes = ['/test/', '/build/', '/review/', '/site/'];
const workspaceFrameRoutePrefix = '/__made-solid/workspace-frame/';
const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const workspaceRevisionPattern = /^(?:working|[0-9a-f]{40})$/i;
const workspaceTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function requiredEnvironment(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required by the private preview host.`);
  return value.replace(/\/+$/, '');
}

export function previewHostConfiguration(environment = process.env) {
  const supabaseUrl = requiredEnvironment('SUPABASE_URL', environment);
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY', environment);
  const configuredOrigin = environment.PREVIEW_PUBLIC_ORIGIN?.trim().replace(/\/+$/, '');
  if (configuredOrigin && !/^https?:\/\/[^/]+$/i.test(configuredOrigin)) {
    throw new Error('PREVIEW_PUBLIC_ORIGIN must be an HTTP(S) origin without a path.');
  }
  if (
    configuredOrigin?.startsWith('http://') &&
    !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(configuredOrigin)
  ) {
    throw new Error('PREVIEW_PUBLIC_ORIGIN must use HTTPS outside local development.');
  }
  const developmentOrigins = studioDevelopmentOrigins(environment);
  const configuredClientspaceOrigin = environment.CLIENTSPACE_PUBLIC_ORIGIN?.trim();
  const configuredClientspaceHandoff = environment.CLIENTSPACE_HANDOFF_URL?.trim();
  let clientspaceReviewOrigin;
  if (configuredClientspaceOrigin || configuredClientspaceHandoff) {
    const parsedClientspaceOrigin = new URL(
      configuredClientspaceOrigin || configuredClientspaceHandoff,
    );
    if (
      parsedClientspaceOrigin.protocol !== 'https:' ||
      (configuredClientspaceOrigin &&
        parsedClientspaceOrigin.href !== `${parsedClientspaceOrigin.origin}/`)
    ) {
      throw new Error('CLIENTSPACE_PUBLIC_ORIGIN must be an exact HTTPS origin.');
    }
    clientspaceReviewOrigin = parsedClientspaceOrigin.origin;
  }
  return {
    activeWorkspacePreviewPath: environment.SITEFORGE_ACTIVE_PREVIEW_PATH?.trim(),
    clientspaceReviewOrigin,
    port: Number(environment.SITEFORGE_PREVIEW_PORT) || defaultPort,
    publicOrigin: configuredOrigin,
    serviceRoleKey,
    supabaseUrl,
    workspaceOrigin: developmentOrigins.canonicalOrigin,
    workspaceOrigins: developmentOrigins.origins,
    workspacePreviewSecret: environment.SITEFORGE_WORKSPACE_PREVIEW_SECRET?.trim(),
  };
}

export function parseWorkspaceFramePath(pathname) {
  if (!pathname.startsWith(workspaceFrameRoutePrefix)) return undefined;
  const match = /^([A-Za-z0-9][A-Za-z0-9._-]{0,99})\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)(\/.*)?$/.exec(
    pathname.slice(workspaceFrameRoutePrefix.length),
  );
  if (!match) return undefined;
  const upstreamSegments = match[3]?.split('/').filter(Boolean) || [];
  if (
    upstreamSegments.some((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return decoded === '.' || decoded === '..' || decoded.includes('\\');
      } catch {
        return true;
      }
    })
  ) {
    return undefined;
  }
  return {
    directory: match[1],
    token: match[2],
    upstreamPath: match[3] || '/',
  };
}

export function parsePreviewPath(pathname) {
  const routePrefix = previewRoutePrefixes.find((prefix) => pathname.startsWith(prefix));
  if (!routePrefix) return undefined;
  const parts = pathname.slice(routePrefix.length).split('/').filter(Boolean);
  const runId = parts[0];
  const token = parts[1];
  const requestedPath = parts.slice(2);
  const previewMode =
    routePrefix === '/review/' ? 'review' : requestedPath[0] === '__draft__' ? 'draft' : 'ready';
  const filePath =
    (previewMode === 'draft' ? requestedPath.slice(1) : requestedPath).join('/') || 'index.html';
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId) || !token || !/^[a-f0-9]{64}$/i.test(token)) {
    return undefined;
  }
  if (filePath.includes('..') || filePath.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(filePath)) {
    return undefined;
  }
  return { filePath, previewMode, routePrefix, runId, token };
}

export function previewFileCandidates(filePath) {
  const normalized = filePath.replace(/\/+$/, '') || 'index.html';
  const candidates = [normalized];
  if (!normalized.includes('.')) {
    candidates.push(`${normalized}/index.html`);
    candidates.push(`${normalized}.html`);
    if (normalized.includes('/')) candidates.push(`${normalized.replaceAll('/', '--')}.html`);
  }
  return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
}

export function previewRouteMatchesBuildMode(routePrefix, buildMode) {
  if (routePrefix === '/site/') return true;
  if (routePrefix === '/review/') return buildMode === 'full_site';
  if (routePrefix === '/build/') return buildMode === 'full_site';
  if (routePrefix === '/test/') {
    return ['homepage_test', 'page_test', 'site_test'].includes(buildMode);
  }
  return false;
}

export function contentTypeFor(filePath) {
  const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return (
    {
      '.avif': 'image/avif',
      '.css': 'text/css; charset=utf-8',
      '.gif': 'image/gif',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }[extension] || 'application/octet-stream'
  );
}

export function rewritePreviewRootReferences(source, base) {
  return source
    .replace(/(\b(?:href|src|action)=["'])\/(?!\/)/gi, (_match, prefix) => `${prefix}${base}`)
    .replace(
      /(\\"|\\')\/(?=(?:_next|assets)\b)/g,
      (_match, escapedQuote) => `${escapedQuote}${base}`,
    )
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, (_match, quote) => `url(${quote}${base}`);
}

export function rewritePreviewRuntimeReferences(source, base) {
  return rewritePreviewRootReferences(source, base)
    .replace(/(\.p\s*=\s*["'])\/_next\//g, (_match, assignment) => `${assignment}${base}_next/`)
    .replace(/(["'])\/assets\//g, (_match, quote) => `${quote}${base}assets/`);
}

export function rewriteWorkspaceFrameRootReferences(source, base) {
  return source
    .replace(/(\bsrc=["'])\/(?!\/)/gi, (_match, prefix) => `${prefix}${base}`)
    .replace(/(<link\b[^>]*\bhref=["'])\/(?!\/)/gi, (_match, prefix) => `${prefix}${base}`)
    .replace(/(\baction=["'])\/(?!\/)/gi, (_match, prefix) => `${prefix}${base}`)
    .replace(
      /(\\"|\\')\/(?=(?:_next|assets)\b)/g,
      (_match, escapedQuote) => `${escapedQuote}${base}`,
    )
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, (_match, quote) => `url(${quote}${base}`);
}

export function rewriteWorkspaceFrameRuntimeReferences(source, base) {
  const pathBase = new URL(base, 'https://preview.madesolid.invalid').pathname;
  return rewriteWorkspaceFrameRootReferences(source, base)
    .replace(/(\.p\s*=\s*["'])\/_next\//g, (_match, assignment) => `${assignment}${base}_next/`)
    .replace(/(["'])\/assets\//g, (_match, quote) => `${quote}${base}assets/`)
    .replace(/(["'`])\/_next\//g, (_match, quote) => `${quote}${base}_next/`)
    .replace(
      /(["'`])\/(?!\/)(?=(?:@vite|@react-refresh|src|node_modules)\/)/g,
      (_match, quote) => `${quote}${base}`,
    )
    .replace(
      /(const base(?:\$1)?\s*=\s*)["']\/["'](\s*\|\|\s*["']\/["'];)/g,
      (_match, assignment, fallback) => `${assignment}${JSON.stringify(pathBase)}${fallback}`,
    )
    .replace(
      /(const socketHost\s*=\s*`[^`\n]*\$\{)["']\/["'](\}`;)/g,
      (_match, assignment, suffix) => `${assignment}${JSON.stringify(pathBase)}${suffix}`,
    );
}

export function rewriteNextWorkspaceFrameRuntimeReferences(source, base) {
  return source
    .replace(
      /(\bconst\s+(?:CHUNK_BASE_PATH|RUNTIME_PUBLIC_PATH)\s*=\s*["'])\/_next\//g,
      (_match, assignment) => `${assignment}${base}_next/`,
    )
    .replace(
      /(\b__webpack_require__\.p\s*=\s*["'])\/_next\//g,
      (_match, assignment) => `${assignment}${base}_next/`,
    );
}

function opaqueFrameRuntimeScript(base) {
  const frameRoot = JSON.stringify(base);
  return `
  (() => {
    const frameRoot = ${frameRoot};
    const createMemoryStorage = () => {
      const entries = new Map();
      return {
        clear: () => entries.clear(),
        getItem: (key) => entries.has(String(key)) ? entries.get(String(key)) : null,
        key: (index) => Array.from(entries.keys())[Number(index)] ?? null,
        get length() { return entries.size; },
        removeItem: (key) => entries.delete(String(key)),
        setItem: (key, value) => entries.set(String(key), String(value)),
      };
    };
    try {
      window.sessionStorage.length;
    } catch {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: createMemoryStorage(),
      });
    }
    const cookies = new Map();
    try {
      document.cookie;
    } catch {
      try {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get: () => Array.from(cookies, ([key, value]) => key + '=' + value).join('; '),
          set: (source) => {
            const [pair] = String(source).split(';', 1);
            const separator = pair.indexOf('=');
            if (separator > 0) cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
          },
        });
      } catch {}
    }
    const announceNavigation = () => {
      try {
        window.parent.postMessage(
          { source: 'made-solid-workspace-preview', status: 'loading' },
          '*',
        );
      } catch {}
    };
    document.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || target.target || target.hasAttribute('download')) return;
      const rawHref = target.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#')) return;
      let destination;
      try {
        destination = new URL(rawHref, window.location.href);
      } catch {
        return;
      }
      if (
        destination.origin !== window.location.origin ||
        destination.pathname.startsWith(frameRoot)
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const secured = new URL(frameRoot, window.location.origin);
      secured.pathname = frameRoot + destination.pathname.replace(/^\\/+/, '');
      secured.search = destination.search;
      secured.hash = destination.hash;
      announceNavigation();
      window.location.assign(secured.href);
    }, true);
  })();
`;
}

const previewNavigationScript = `
  (() => {
    if (window.__siteforgePrivatePreview) return;
    window.__siteforgePrivatePreview = true;
    const base = new URL(document.baseURI);
    const root = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
    document.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || target.target || target.hasAttribute('download')) return;
      const rawHref = target.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#')) return;
      const next = rawHref.startsWith('/')
        ? new URL(rawHref.replace(/^\\/+/, ''), base)
        : new URL(rawHref, document.baseURI);
      if (next.origin !== base.origin || !next.pathname.startsWith(root)) return;
      event.preventDefault();
      window.location.assign(next.href);
    }, true);
  })();
`;

export function preparePreviewHtml(source, base, clientspaceReviewOrigin) {
  const rootedSource = rewritePreviewRootReferences(source, base);
  const baseElement = `<base href="${base}">`;
  const navigation = `<script data-siteforge-preview-navigation>${previewNavigationScript}</script>`;
  const reviewBridge = clientspaceReviewOrigin
    ? `<script src="${clientspaceReviewOrigin}/review-bridge.js?v=20260825-private-review" data-made-solid-parent-origin="${clientspaceReviewOrigin}" data-made-solid-review-bridge></script>`
    : '';
  const withBase = rootedSource.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${baseElement}`);
  if (/<\/body>/i.test(withBase)) {
    return withBase.replace(/<\/body>/i, `${navigation}${reviewBridge}</body>`);
  }
  return `${baseElement}${withBase}${navigation}${reviewBridge}`;
}

export function prepareWorkspaceFrameHtml(source, base) {
  const rootedSource = rewriteWorkspaceFrameRuntimeReferences(source, base);
  const opaqueRuntime = source.includes('/_next/')
    ? `<style data-made-solid-workspace-frame>nextjs-portal{display:none!important}</style><script data-made-solid-opaque-runtime>${opaqueFrameRuntimeScript(base)}</script>`
    : '';
  const baseElement = `<base href="${base}">${opaqueRuntime}`;
  const withBase = rootedSource.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${baseElement}`);
  return (/<head(\s[^>]*)?>/i.test(rootedSource) ? withBase : `${baseElement}${withBase}`)
    .replace(/"assetPrefix":""/g, `"assetPrefix":"${base.replace(/\/$/, '')}"`)
    .replace(/(\bsrcset=["'])([^"']+)/gi, (_match, prefix, candidates) => {
      const rewritten = candidates
        .split(',')
        .map((candidate) =>
          candidate.replace(
            /^(\s*)\/(?!\/|__made-solid\/workspace-frame\/)/,
            (_value, spacing) => `${spacing}${base}`,
          ),
        )
        .join(',');
      return `${prefix}${rewritten}`;
    });
}

export function prepareWorkspaceFrameResponseBody(source, contentType, upstreamPath, frameBase) {
  if (contentType.includes('text/html')) return prepareWorkspaceFrameHtml(source, frameBase);
  if (upstreamPath.startsWith('/_next/') && contentType.includes('javascript')) {
    return rewriteNextWorkspaceFrameRuntimeReferences(source, frameBase);
  }
  if (upstreamPath.startsWith('/_next/') && contentType.includes('application/json')) {
    return source;
  }
  if (
    contentType.includes('javascript') ||
    contentType.includes('text/css') ||
    contentType.includes('application/json')
  ) {
    return rewriteWorkspaceFrameRuntimeReferences(source, frameBase);
  }
  return rewritePreviewRootReferences(source, frameBase);
}

function isLockedStarterDocument(html) {
  return (
    /private preview/i.test(html) &&
    /this route is replaced by the made solid studio builder\./i.test(html)
  );
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function previewCsp(previewMode, clientspaceReviewOrigin) {
  const reviewOrigin = previewMode === 'review' ? clientspaceReviewOrigin : undefined;
  return [
    "default-src 'self' data: blob:",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${reviewOrigin ? ` ${reviewOrigin}` : ''}`,
    "font-src 'self' data:",
    `connect-src 'self'${reviewOrigin ? ` ${reviewOrigin}` : ''}`,
    "form-action 'none'",
    "base-uri 'self'",
    reviewOrigin ? `frame-ancestors ${reviewOrigin}` : "frame-ancestors 'none'",
  ].join('; ');
}

function responseHeaders(contentType, previewMode = 'ready', clientspaceReviewOrigin) {
  const headers = {
    'cache-control': 'no-store, private',
    'content-security-policy': previewCsp(previewMode, clientspaceReviewOrigin),
    'content-type': contentType,
    'cross-origin-opener-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow, noarchive',
  };
  if (previewMode !== 'review') headers['x-frame-options'] = 'DENY';
  return headers;
}

function apiHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function readRows(configuration, table, parameters) {
  const url = new URL(`/rest/v1/${table}`, configuration.supabaseUrl);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const result = await fetch(url, { headers: apiHeaders(configuration.serviceRoleKey) });
  if (!result.ok) throw new Error(`Private preview lookup failed with ${result.status}.`);
  const rows = await result.json();
  return Array.isArray(rows) ? rows : [];
}

async function resolvePreviewArtifact(configuration, parsed) {
  const accessRows = await readRows(configuration, 'builder_preview_access', {
    builder_run_id: `eq.${parsed.runId}`,
    token_hash: `eq.${tokenHash(parsed.token)}`,
    revoked_at: 'is.null',
    select: 'expires_at,preview_mode',
  });
  const access = accessRows[0];
  if (
    !access ||
    access.preview_mode !== parsed.previewMode ||
    new Date(access.expires_at).getTime() <= Date.now()
  ) {
    return undefined;
  }

  const runRows = await readRows(configuration, 'builder_runs', {
    id: `eq.${parsed.runId}`,
    select: 'build_mode,organization_id,status',
  });
  const run = runRows[0];
  const allowed =
    parsed.previewMode === 'ready' || parsed.previewMode === 'review'
      ? run?.status === 'ready' || run?.status === 'review_required'
      : ['running', 'paused', 'failed', 'cancelled'].includes(run?.status);
  if (!run || !allowed || !previewRouteMatchesBuildMode(parsed.routePrefix, run.build_mode)) {
    return undefined;
  }

  const artifactKind = parsed.previewMode === 'draft' ? 'draft_file' : 'site_file';
  const artifactPrefix = parsed.previewMode === 'draft' ? 'draft' : 'site';
  for (const candidate of previewFileCandidates(parsed.filePath)) {
    const storagePath = `${run.organization_id}/builder-runs/${parsed.runId}/${artifactPrefix}/${candidate}`;
    const artifactRows = await readRows(configuration, 'builder_artifacts', {
      builder_run_id: `eq.${parsed.runId}`,
      kind: `eq.${artifactKind}`,
      storage_path: `eq.${storagePath}`,
      select: 'id',
    });
    if (artifactRows[0]) return { filePath: candidate, storagePath };
  }
  return undefined;
}

function storageObjectUrl(configuration, storagePath) {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  return `${configuration.supabaseUrl}/storage/v1/object/authenticated/siteforge-artifacts/${encodedPath}`;
}

function requestPublicOrigin(request, configuration) {
  if (configuration.publicOrigin) return configuration.publicOrigin;
  return new URL(request.url).origin;
}

export async function handlePreviewRequest(request, configuration = previewHostConfiguration()) {
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname === '/health') {
    return new Response('ok', {
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  const parsed = parsePreviewPath(requestUrl.pathname);
  if (!parsed) return new Response('Not found', { status: 404 });

  try {
    const artifact = await resolvePreviewArtifact(configuration, parsed);
    if (!artifact) return new Response('Not found', { status: 404 });
    if (parsed.previewMode === 'review' && !configuration.clientspaceReviewOrigin) {
      return new Response('Not found', { status: 404 });
    }
    const headers = responseHeaders(
      contentTypeFor(artifact.filePath),
      parsed.previewMode,
      configuration.clientspaceReviewOrigin,
    );
    if (request.method === 'HEAD') return new Response(null, { headers });

    const storedFile = await fetch(storageObjectUrl(configuration, artifact.storagePath), {
      headers: apiHeaders(configuration.serviceRoleKey),
    });
    if (!storedFile.ok || !storedFile.body) return new Response('Not found', { status: 404 });

    const extension = artifact.filePath.slice(artifact.filePath.lastIndexOf('.')).toLowerCase();
    const draftPrefix = parsed.previewMode === 'draft' ? '__draft__/' : '';
    const base = `${requestPublicOrigin(request, configuration)}${parsed.routePrefix}${parsed.runId}/${parsed.token}/${draftPrefix}`;
    if (extension === '.html') {
      const source = await storedFile.text();
      if (isLockedStarterDocument(source)) {
        return new Response(
          'This build contains the locked starter rather than generated website output.',
          {
            status: 409,
            headers: responseHeaders(
              'text/plain; charset=utf-8',
              parsed.previewMode,
              configuration.clientspaceReviewOrigin,
            ),
          },
        );
      }
      return new Response(
        preparePreviewHtml(
          source,
          base,
          parsed.previewMode === 'review' ? configuration.clientspaceReviewOrigin : undefined,
        ),
        { headers },
      );
    }
    if (extension === '.js') {
      return new Response(rewritePreviewRuntimeReferences(await storedFile.text(), base), {
        headers,
      });
    }
    if (['.css', '.json', '.txt'].includes(extension)) {
      return new Response(rewritePreviewRootReferences(await storedFile.text(), base), { headers });
    }
    return new Response(storedFile.body, { headers });
  } catch {
    return new Response('Private preview unavailable', {
      status: 502,
      headers: responseHeaders('text/plain; charset=utf-8'),
    });
  }
}

function workspaceFrameConfiguration(configuration) {
  const activeWorkspacePreviewPath = configuration.activeWorkspacePreviewPath?.trim();
  const workspacePreviewSecret = configuration.workspacePreviewSecret?.trim();
  const workspaceOrigin = configuration.workspaceOrigin?.trim().replace(/\/+$/, '');
  const publicOrigin = configuration.publicOrigin?.trim().replace(/\/+$/, '');
  if (!activeWorkspacePreviewPath || !workspacePreviewSecret || !workspaceOrigin || !publicOrigin) {
    return undefined;
  }
  let parsedWorkspaceOrigin;
  let parsedPublicOrigin;
  let workspaceOrigins;
  try {
    parsedWorkspaceOrigin = new URL(workspaceOrigin);
    parsedPublicOrigin = new URL(publicOrigin);
    workspaceOrigins = (configuration.workspaceOrigins || [workspaceOrigin]).map((origin) => {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:' || parsed.href !== `${parsed.origin}/`) {
        throw new Error('Invalid development origin.');
      }
      return parsed.origin;
    });
  } catch {
    return undefined;
  }
  if (
    parsedWorkspaceOrigin.protocol !== 'https:' ||
    parsedPublicOrigin.protocol !== 'https:' ||
    parsedWorkspaceOrigin.href !== `${parsedWorkspaceOrigin.origin}/` ||
    parsedPublicOrigin.href !== `${parsedPublicOrigin.origin}/` ||
    parsedWorkspaceOrigin.origin === parsedPublicOrigin.origin ||
    workspaceOrigins.includes(parsedPublicOrigin.origin)
  ) {
    return undefined;
  }
  return {
    activeWorkspacePreviewPath,
    publicOrigin,
    workspaceOrigin,
    workspaceOrigins: [...new Set(workspaceOrigins)],
    workspacePreviewSecret,
  };
}

function normalizeActiveWorkspacePreviews(value) {
  const candidates = Array.isArray(value?.previews) ? value.previews : [value];
  return candidates
    .map((candidate) => ({ ...candidate, revision: candidate?.revision || 'working' }))
    .filter(
      (candidate) =>
        Number.isInteger(candidate.port) &&
        candidate.port > 0 &&
        candidate.port <= 65_535 &&
        directoryPattern.test(candidate.directory || '') &&
        workspaceRevisionPattern.test(candidate.revision || ''),
    );
}

async function activeWorkspacePreview(configuration, directory, revision) {
  const source = await readFile(configuration.activeWorkspacePreviewPath, 'utf8');
  const value = JSON.parse(source);
  const active = normalizeActiveWorkspacePreviews(value).find(
    (candidate) => candidate.directory === directory && candidate.revision === revision,
  );
  if (!active) {
    throw new Error('The active workspace preview record is invalid.');
  }
  return active;
}

function workspaceFrameRootPath(parsed) {
  return `${workspaceFrameRoutePrefix}${parsed.directory}/${parsed.token}/`;
}

function workspaceFrameAccess(parsed, configuration) {
  if (!workspaceTokenPattern.test(parsed.token)) return undefined;
  const access = verifyWorkspacePreviewToken(parsed.token, configuration.workspacePreviewSecret);
  return access?.directory === parsed.directory ? access : undefined;
}

function workspaceFrameUnavailable(response, status = 404) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': 'null',
    'Cache-Control': 'private, no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end('Private workspace frame unavailable.');
}

function workspaceFrameUpstreamHeaders(request, active) {
  const headers = { ...request.headers };
  delete headers.cookie;
  delete headers['accept-encoding'];
  delete headers.origin;
  delete headers.referer;
  for (const headerName of Object.keys(headers)) {
    if (headerName.toLowerCase().startsWith('sec-fetch-')) delete headers[headerName];
  }
  headers.host = `127.0.0.1:${active.port}`;
  headers['x-forwarded-host'] = request.headers.host || '';
  headers['x-forwarded-proto'] = 'https';
  return headers;
}

function workspaceFrameUpstreamPath(requestUrl, parsed) {
  return `${parsed.upstreamPath}${requestUrl.search}`;
}

function workspaceFrameContentSecurityPolicy(existing, workspaceOrigins, publicOrigin) {
  const sources = Array.isArray(existing) ? existing : [existing || ''];
  const replacedPolicies = sources
    .map((source) =>
      String(source)
        .split(';')
        .map((value) => value.trim())
        .filter(
          (value) =>
            value &&
            !['frame-ancestors', 'report-to', 'report-uri'].includes(
              value.split(/\s+/, 1)[0].toLowerCase(),
            ),
        )
        .join('; '),
    )
    .filter(Boolean);
  const lockedPolicy = [
    "default-src 'self' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${publicOrigin} ${publicOrigin.replace(/^https:/, 'wss:')}`,
    "worker-src 'self' blob:",
    "media-src 'self' data: blob:",
    "frame-src 'none'",
    "child-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'self'",
    `frame-ancestors ${workspaceOrigins.join(' ')}`,
  ].join('; ');
  return [...replacedPolicies, lockedPolicy].join(', ');
}

function workspaceFrameLocation(location, parsed) {
  if (!location || !String(location).startsWith('/')) return location;
  return `${workspaceFrameRootPath(parsed)}${String(location).replace(/^\/+/, '')}`;
}

function proxyWorkspaceFrameHttp(request, response, requestUrl, parsed, active, configuration) {
  const upstream = createProxyRequest(
    {
      headers: workspaceFrameUpstreamHeaders(request, active),
      hostname: '127.0.0.1',
      method: request.method,
      path: workspaceFrameUpstreamPath(requestUrl, parsed),
      port: active.port,
    },
    (upstreamResponse) => {
      const headers = {
        ...upstreamResponse.headers,
        'access-control-allow-origin': 'null',
        'cache-control': 'private, no-store',
        'content-security-policy': workspaceFrameContentSecurityPolicy(
          upstreamResponse.headers['content-security-policy'],
          configuration.workspaceOrigins || [configuration.workspaceOrigin],
          configuration.publicOrigin,
        ),
        'cross-origin-resource-policy': 'cross-origin',
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      };
      if (headers.location) headers.location = workspaceFrameLocation(headers.location, parsed);
      delete headers['content-length'];
      delete headers['content-encoding'];
      delete headers['clear-site-data'];
      delete headers['content-location'];
      delete headers.link;
      delete headers.nel;
      delete headers['report-to'];
      delete headers['reporting-endpoints'];
      delete headers['service-worker-allowed'];
      delete headers.sourcemap;
      delete headers['set-cookie'];
      delete headers['x-sourcemap'];
      delete headers['x-frame-options'];
      const contentType = String(upstreamResponse.headers['content-type'] || '').toLowerCase();
      const frameBase = workspaceFrameRootPath(parsed);
      const rewritesBody =
        contentType.includes('text/html') ||
        contentType.includes('javascript') ||
        contentType.includes('text/css') ||
        contentType.includes('application/json');
      if (!rewritesBody) {
        response.writeHead(upstreamResponse.statusCode || 502, headers);
        upstreamResponse.pipe(response);
        return;
      }
      delete headers['transfer-encoding'];
      const chunks = [];
      upstreamResponse.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      upstreamResponse.on('end', () => {
        const source = Buffer.concat(chunks).toString('utf8');
        const document = prepareWorkspaceFrameResponseBody(
          source,
          contentType,
          parsed.upstreamPath,
          frameBase,
        );
        headers['content-length'] = String(Buffer.byteLength(document));
        response.writeHead(upstreamResponse.statusCode || 502, headers);
        if (request.method === 'HEAD') response.end();
        else response.end(document);
      });
    },
  );
  upstream.setTimeout(configuration.upstreamTimeoutMs ?? 8_000, () => {
    upstream.destroy(new Error('The private workspace frame timed out.'));
  });
  upstream.on('error', () => {
    if (!response.headersSent && !response.destroyed) workspaceFrameUnavailable(response, 502);
  });
  request.pipe(upstream);
}

export async function handleWorkspaceFrameRequest(request, response, configuration) {
  const requestUrl = new URL(request.url || '/', configuration.publicOrigin || 'https://invalid');
  if (!requestUrl.pathname.startsWith(workspaceFrameRoutePrefix)) return false;
  const frameConfiguration = workspaceFrameConfiguration(configuration);
  const parsed = parseWorkspaceFramePath(requestUrl.pathname);
  if (!frameConfiguration || !parsed || !['GET', 'HEAD'].includes(request.method || 'GET')) {
    workspaceFrameUnavailable(response);
    return true;
  }
  try {
    const access = workspaceFrameAccess(parsed, frameConfiguration);
    if (!access) {
      workspaceFrameUnavailable(response);
      return true;
    }
    const active = await activeWorkspacePreview(
      frameConfiguration,
      access.directory,
      access.revision,
    );
    proxyWorkspaceFrameHttp(request, response, requestUrl, parsed, active, frameConfiguration);
  } catch {
    workspaceFrameUnavailable(response, 503);
  }
  return true;
}

function proxyWorkspaceFrameUpgrade(request, socket, head, requestUrl, parsed, active) {
  const upstream = createProxyRequest({
    headers: workspaceFrameUpstreamHeaders(request, active),
    hostname: '127.0.0.1',
    method: request.method,
    path: workspaceFrameUpstreamPath(requestUrl, parsed),
    port: active.port,
  });
  upstream.on('upgrade', (upstreamResponse, upstreamSocket, upstreamHead) => {
    const statusLine = `HTTP/${upstreamResponse.httpVersion} ${upstreamResponse.statusCode} ${upstreamResponse.statusMessage}\r\n`;
    const headers = Object.entries(upstreamResponse.headers)
      .filter(([name]) => !['set-cookie', 'set-cookie2'].includes(name.toLowerCase()))
      .flatMap(([name, value]) =>
        Array.isArray(value)
          ? value.map((item) => `${name}: ${item}\r\n`)
          : [`${name}: ${value}\r\n`],
      )
      .join('');
    socket.write(`${statusLine}${headers}\r\n`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
}

export async function handleWorkspaceFrameUpgrade(request, socket, head, configuration) {
  const requestUrl = new URL(request.url || '/', configuration.publicOrigin || 'https://invalid');
  if (!requestUrl.pathname.startsWith(workspaceFrameRoutePrefix)) return false;
  const frameConfiguration = workspaceFrameConfiguration(configuration);
  const parsed = parseWorkspaceFramePath(requestUrl.pathname);
  if (!frameConfiguration || !parsed) {
    socket.destroy();
    return true;
  }
  try {
    const access = workspaceFrameAccess(parsed, frameConfiguration);
    const active = access
      ? await activeWorkspacePreview(frameConfiguration, access.directory, access.revision)
      : undefined;
    if (!access || !active) {
      socket.destroy();
      return true;
    }
    proxyWorkspaceFrameUpgrade(request, socket, head, requestUrl, parsed, active);
  } catch {
    socket.destroy();
  }
  return true;
}

export function previewHostRequestListener(configuration = previewHostConfiguration()) {
  return async (incoming, outgoing) => {
    if (await handleWorkspaceFrameRequest(incoming, outgoing, configuration)) return;
    const origin = configuration.publicOrigin || `http://${incoming.headers.host || '127.0.0.1'}`;
    const request = new Request(new URL(incoming.url || '/', origin), {
      headers: incoming.headers,
      method: incoming.method,
    });
    const result = await handlePreviewRequest(request, configuration);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    if (!result.body) {
      outgoing.end();
      return;
    }
    Readable.fromWeb(result.body).pipe(outgoing);
  };
}

export function attachPreviewHostUpgradeHandler(
  server,
  configuration = previewHostConfiguration(),
) {
  server.on('upgrade', (request, socket, head) => {
    void handleWorkspaceFrameUpgrade(request, socket, head, configuration).then((handled) => {
      if (!handled) socket.destroy();
    });
  });
  return server;
}

export function startPreviewHost(configuration = previewHostConfiguration()) {
  const server = createServer(previewHostRequestListener(configuration));
  attachPreviewHostUpgradeHandler(server, configuration);
  return server.listen(configuration.port, '0.0.0.0', () => {
    const address = server.address();
    console.log(
      `[preview-host] listening on ${typeof address === 'object' && address ? address.port : configuration.port}`,
    );
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  startPreviewHost();
}
