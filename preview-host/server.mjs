import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const defaultPort = 8787;
const previewRoutePrefix = '/site/';

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
  return {
    port: Number(environment.SITEFORGE_PREVIEW_PORT) || defaultPort,
    publicOrigin: configuredOrigin,
    serviceRoleKey,
    supabaseUrl,
  };
}

export function parsePreviewPath(pathname) {
  if (!pathname.startsWith(previewRoutePrefix)) return undefined;
  const parts = pathname.slice(previewRoutePrefix.length).split('/').filter(Boolean);
  const runId = parts[0];
  const token = parts[1];
  const requestedPath = parts.slice(2);
  const previewMode = requestedPath[0] === '__draft__' ? 'draft' : 'ready';
  const filePath =
    (previewMode === 'draft' ? requestedPath.slice(1) : requestedPath).join('/') || 'index.html';
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId) || !token || !/^[a-f0-9]{64}$/i.test(token)) {
    return undefined;
  }
  if (filePath.includes('..') || filePath.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(filePath)) {
    return undefined;
  }
  return { filePath, previewMode, runId, token };
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

export function preparePreviewHtml(source, base) {
  const rootedSource = rewritePreviewRootReferences(source, base);
  const baseElement = `<base href="${base}">`;
  const navigation = `<script data-siteforge-preview-navigation>${previewNavigationScript}</script>`;
  const withBase = rootedSource.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${baseElement}`);
  if (/<\/body>/i.test(withBase)) {
    return withBase.replace(/<\/body>/i, `${navigation}</body>`);
  }
  return `${baseElement}${withBase}${navigation}`;
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

function previewCsp() {
  return [
    "default-src 'self' data: blob:",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function responseHeaders(contentType) {
  return {
    'cache-control': 'no-store, private',
    'content-security-policy': previewCsp(),
    'content-type': contentType,
    'cross-origin-opener-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-robots-tag': 'noindex, nofollow, noarchive',
  };
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
    select: 'organization_id,status',
  });
  const run = runRows[0];
  const allowed =
    parsed.previewMode === 'ready'
      ? run?.status === 'ready' || run?.status === 'review_required'
      : ['running', 'paused', 'failed', 'cancelled'].includes(run?.status);
  if (!run || !allowed) return undefined;

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
    const headers = responseHeaders(contentTypeFor(artifact.filePath));
    if (request.method === 'HEAD') return new Response(null, { headers });

    const storedFile = await fetch(storageObjectUrl(configuration, artifact.storagePath), {
      headers: apiHeaders(configuration.serviceRoleKey),
    });
    if (!storedFile.ok || !storedFile.body) return new Response('Not found', { status: 404 });

    const extension = artifact.filePath.slice(artifact.filePath.lastIndexOf('.')).toLowerCase();
    const draftPrefix = parsed.previewMode === 'draft' ? '__draft__/' : '';
    const base = `${requestPublicOrigin(request, configuration)}${previewRoutePrefix}${parsed.runId}/${parsed.token}/${draftPrefix}`;
    if (extension === '.html') {
      const source = await storedFile.text();
      if (isLockedStarterDocument(source)) {
        return new Response(
          'This build contains the locked starter rather than generated website output.',
          { status: 409, headers: responseHeaders('text/plain; charset=utf-8') },
        );
      }
      return new Response(preparePreviewHtml(source, base), { headers });
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

export function startPreviewHost(configuration = previewHostConfiguration()) {
  const server = createServer(async (incoming, outgoing) => {
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
  });
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
