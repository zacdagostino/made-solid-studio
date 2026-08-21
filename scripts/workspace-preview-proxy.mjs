import { createServer, request as createProxyRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyWorkspacePreviewToken } from './workspace-preview-access.mjs';

const cookieName = '__Host-made-solid-workspace';

function requiredEnvironment(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required by the private workspace preview proxy.`);
  return value;
}

export function workspacePreviewProxyConfiguration(environment = process.env) {
  const studioOrigin = new URL(requiredEnvironment('SITEFORGE_PUBLIC_ORIGIN', environment));
  if (studioOrigin.protocol !== 'https:') {
    throw new Error('SITEFORGE_PUBLIC_ORIGIN must use HTTPS for workspace preview re-entry.');
  }
  return {
    activePreviewPath: requiredEnvironment('SITEFORGE_ACTIVE_PREVIEW_PATH', environment),
    port: Number(environment.SITEFORGE_WORKSPACE_PROXY_PORT) || 3000,
    secret: requiredEnvironment('SITEFORGE_WORKSPACE_PREVIEW_SECRET', environment),
    studioOrigin: studioOrigin.origin,
  };
}

export function workspacePreviewReentryUrl(studioOrigin, requestUrl = '/') {
  const requested = new URL(requestUrl, 'https://workspace.madesolid.invalid');
  const returnPath = `${requested.pathname}${requested.search}`;
  const destination = new URL(studioOrigin);
  destination.pathname = '/';
  destination.search = '';
  destination.hash = `/workspace-preview-access?path=${encodeURIComponent(returnPath)}`;
  return destination.href;
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

async function activePreview(configuration) {
  const source = await readFile(configuration.activePreviewPath, 'utf8');
  const value = JSON.parse(source);
  if (
    !Number.isInteger(value.port) ||
    value.port < 1 ||
    value.port > 65_535 ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value.directory)
  ) {
    throw new Error('The active workspace preview record is invalid.');
  }
  return value;
}

function accessForRequest(request, configuration) {
  const requestUrl = new URL(request.url || '/', 'http://made-solid-preview.local');
  const queryToken = requestUrl.searchParams.get('access');
  const cookieToken = requestCookie(request, cookieName);
  const token = queryToken || cookieToken;
  const access = verifyWorkspacePreviewToken(token, configuration.secret);
  return { access, queryToken, requestUrl, token };
}

function cleanAccessRedirect(response, requestUrl, token) {
  requestUrl.searchParams.delete('access');
  const location = `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
  response.writeHead(303, {
    'Cache-Control': 'no-store',
    Location: location || '/',
    'Set-Cookie': `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end();
}

function unavailable(response, status = 404) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end('Private workspace preview unavailable.');
}

function requestsDocument(request) {
  const fetchMode = String(request.headers['sec-fetch-mode'] || '').toLowerCase();
  const accept = String(request.headers.accept || '').toLowerCase();
  return (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (fetchMode === 'navigate' || accept.includes('text/html'))
  );
}

function requestStudioReentry(request, response, configuration) {
  if (!requestsDocument(request)) {
    unavailable(response);
    return;
  }
  response.writeHead(303, {
    'Cache-Control': 'no-store',
    Location: workspacePreviewReentryUrl(configuration.studioOrigin, request.url),
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end();
}

function upstreamHeaders(request, active) {
  const headers = { ...request.headers };
  delete headers.cookie;
  headers.host = `127.0.0.1:${active.port}`;
  headers['x-forwarded-host'] = request.headers.host || '';
  headers['x-forwarded-proto'] = 'https';
  return headers;
}

function proxyHttp(request, response, active, configuration) {
  const upstream = createProxyRequest(
    {
      headers: upstreamHeaders(request, active),
      hostname: '127.0.0.1',
      method: request.method,
      path: request.url,
      port: active.port,
    },
    (upstreamResponse) => {
      const headers = {
        ...upstreamResponse.headers,
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      };
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.setTimeout(configuration.upstreamTimeoutMs ?? 8_000, () => {
    upstream.destroy(new Error('The private workspace preview timed out.'));
  });
  upstream.on('error', () => {
    if (response.headersSent || response.destroyed) return;
    if (requestsDocument(request)) requestStudioReentry(request, response, configuration);
    else unavailable(response, 502);
  });
  request.pipe(upstream);
}

function proxyUpgrade(request, socket, head, active) {
  const upstream = createProxyRequest({
    headers: upstreamHeaders(request, active),
    hostname: '127.0.0.1',
    method: request.method,
    path: request.url,
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

export function startWorkspacePreviewProxy(configuration = workspacePreviewProxyConfiguration()) {
  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/health') {
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('ok');
        return;
      }
      const { access, queryToken, requestUrl, token } = accessForRequest(request, configuration);
      if (!access) {
        requestStudioReentry(request, response, configuration);
        return;
      }
      if (queryToken) {
        cleanAccessRedirect(response, requestUrl, token);
        return;
      }
      const active = await activePreview(configuration);
      if (active.directory !== access.directory) {
        requestStudioReentry(request, response, configuration);
        return;
      }
      proxyHttp(request, response, active, configuration);
    } catch {
      unavailable(response, 503);
    }
  });
  server.on('upgrade', async (request, socket, head) => {
    try {
      const { access } = accessForRequest(request, configuration);
      if (!access) {
        socket.destroy();
        return;
      }
      const active = await activePreview(configuration);
      if (active.directory !== access.directory) {
        socket.destroy();
        return;
      }
      proxyUpgrade(request, socket, head, active);
    } catch {
      socket.destroy();
    }
  });
  return server.listen(configuration.port, '0.0.0.0', () => {
    console.log(`[workspace-preview] private proxy listening on ${configuration.port}`);
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  startWorkspacePreviewProxy();
}
