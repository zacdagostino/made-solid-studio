import { createHash } from 'node:crypto';
import { createServer, request as createProxyRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { verifyWorkspacePreviewToken } from '../scripts/workspace-preview-access.mjs';

const defaultPort = 8787;
const previewRoutePrefix = '/site/';
const workspaceFrameRoutePrefix = '/__made-solid/workspace-frame/';
const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
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
  return {
    activeWorkspacePreviewPath: environment.SITEFORGE_ACTIVE_PREVIEW_PATH?.trim(),
    port: Number(environment.SITEFORGE_PREVIEW_PORT) || defaultPort,
    publicOrigin: configuredOrigin,
    serviceRoleKey,
    supabaseUrl,
    workspaceOrigin: environment.SITEFORGE_WORKSPACE_PREVIEW_ORIGIN?.trim().replace(/\/+$/, ''),
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

export function rewriteWorkspaceFrameRuntimeReferences(source, base) {
  const pathBase = new URL(base, 'https://preview.madesolid.invalid').pathname;
  return rewritePreviewRuntimeReferences(source, base)
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
    )
    .replace(
      /(["'`])\/(?!\/|__made-solid\/workspace-frame\/)/g,
      (_match, quote) => `${quote}${base}`,
    );
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

export function prepareWorkspaceFrameHtml(source, base) {
  const rootedSource = rewriteWorkspaceFrameRuntimeReferences(source, base);
  const baseElement = `<base href="${base}">`;
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
  try {
    parsedWorkspaceOrigin = new URL(workspaceOrigin);
    parsedPublicOrigin = new URL(publicOrigin);
  } catch {
    return undefined;
  }
  if (
    parsedWorkspaceOrigin.protocol !== 'https:' ||
    parsedPublicOrigin.protocol !== 'https:' ||
    parsedWorkspaceOrigin.href !== `${parsedWorkspaceOrigin.origin}/` ||
    parsedPublicOrigin.href !== `${parsedPublicOrigin.origin}/` ||
    parsedWorkspaceOrigin.origin === parsedPublicOrigin.origin
  ) {
    return undefined;
  }
  return { activeWorkspacePreviewPath, publicOrigin, workspaceOrigin, workspacePreviewSecret };
}

async function activeWorkspacePreview(configuration) {
  const source = await readFile(configuration.activeWorkspacePreviewPath, 'utf8');
  const value = JSON.parse(source);
  if (
    !Number.isInteger(value.port) ||
    value.port < 1 ||
    value.port > 65_535 ||
    !directoryPattern.test(value.directory || '')
  ) {
    throw new Error('The active workspace preview record is invalid.');
  }
  return value;
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

function workspaceFrameUpstreamHeaders(request, active, configuration) {
  const headers = { ...request.headers };
  delete headers.cookie;
  delete headers['accept-encoding'];
  delete headers.referer;
  headers.host = `127.0.0.1:${active.port}`;
  headers['x-forwarded-host'] = request.headers.host || '';
  headers['x-forwarded-proto'] = 'https';
  if (headers.origin === 'null') headers.origin = configuration.publicOrigin;
  return headers;
}

function workspaceFrameUpstreamPath(requestUrl, parsed) {
  return `${parsed.upstreamPath}${requestUrl.search}`;
}

function workspaceFrameContentSecurityPolicy(existing, workspaceOrigin, publicOrigin) {
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
    `frame-ancestors ${workspaceOrigin}`,
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
      headers: workspaceFrameUpstreamHeaders(request, active, configuration),
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
          configuration.workspaceOrigin,
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
        const document = contentType.includes('text/html')
          ? prepareWorkspaceFrameHtml(source, frameBase)
          : contentType.includes('javascript') ||
              contentType.includes('text/css') ||
              contentType.includes('application/json')
            ? rewriteWorkspaceFrameRuntimeReferences(source, frameBase)
            : rewritePreviewRootReferences(source, frameBase);
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
    const active = await activeWorkspacePreview(frameConfiguration);
    if (active.directory !== access.directory) {
      workspaceFrameUnavailable(response);
      return true;
    }
    proxyWorkspaceFrameHttp(request, response, requestUrl, parsed, active, frameConfiguration);
  } catch {
    workspaceFrameUnavailable(response, 503);
  }
  return true;
}

function proxyWorkspaceFrameUpgrade(
  request,
  socket,
  head,
  requestUrl,
  parsed,
  active,
  configuration,
) {
  const upstream = createProxyRequest({
    headers: workspaceFrameUpstreamHeaders(request, active, configuration),
    hostname: '127.0.0.1',
    method: request.method,
    path: workspaceFrameUpstreamPath(requestUrl, parsed),
    port: active.port,
  });
  upstream.on('upgrade', (upstreamResponse, upstreamSocket, upstreamHead) => {
    const statusLine = `HTTP/${upstreamResponse.httpVersion} ${upstreamResponse.statusCode} ${upstreamResponse.statusMessage}\r\n`;
    const headers = Object.entries(upstreamResponse.headers)
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
    const active = access ? await activeWorkspacePreview(frameConfiguration) : undefined;
    if (!access || active?.directory !== access.directory) {
      socket.destroy();
      return true;
    }
    proxyWorkspaceFrameUpgrade(
      request,
      socket,
      head,
      requestUrl,
      parsed,
      active,
      frameConfiguration,
    );
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
