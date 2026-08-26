import { randomBytes } from 'node:crypto';
import { createServer, request as createProxyRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  createWorkspaceStudioToken,
  verifyWorkspaceStudioToken,
} from './workspace-preview-access.mjs';
import {
  studioDevelopmentOriginForRequest,
  studioDevelopmentOrigins,
} from './studio-development-origins.mjs';

const cookieName = '__Host-made-solid-studio-workspace';
const sessionLifetimeMs = 8 * 60 * 60 * 1_000;
const codexBranchPath = '/__made-solid/codex-branch';
const codexBranchTimeoutMs = 120_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredEnvironment(name, environment = process.env) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required by the Workspace Studio gateway.`);
  return value;
}

function exactHttpsOrigin(name, environment) {
  const value = new URL(requiredEnvironment(name, environment));
  if (value.protocol !== 'https:' || value.href !== `${value.origin}/`) {
    throw new Error(`${name} must be an exact HTTPS origin.`);
  }
  return value.origin;
}

function validPort(name, value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return port;
}

export function workspaceStudioGatewayConfiguration(environment = process.env) {
  const port = validPort(
    'SITEFORGE_WORKSPACE_PROXY_PORT',
    environment.SITEFORGE_WORKSPACE_PROXY_PORT || 3000,
  );
  const upstreamPort = validPort(
    'SITEFORGE_WORKSPACE_STUDIO_PORT',
    environment.SITEFORGE_WORKSPACE_STUDIO_PORT || 5173,
  );
  if (port === upstreamPort) {
    throw new Error('Workspace gateway and development Studio ports must be distinct.');
  }
  const ownerUserId = requiredEnvironment(
    'SITEFORGE_RUNTIME_OWNER_USER_ID',
    environment,
  ).toLowerCase();
  if (!uuidPattern.test(ownerUserId)) {
    throw new Error('SITEFORGE_RUNTIME_OWNER_USER_ID must be a valid UUID.');
  }
  const secret = requiredEnvironment('SITEFORGE_WORKSPACE_PREVIEW_SECRET', environment);
  if (secret.length < 32) {
    throw new Error('SITEFORGE_WORKSPACE_PREVIEW_SECRET must contain at least 32 characters.');
  }
  const studioOrigin = exactHttpsOrigin('SITEFORGE_PUBLIC_ORIGIN', environment);
  const { canonicalOrigin: workspaceOrigin, origins: workspaceOrigins } =
    studioDevelopmentOrigins(environment);
  if (workspaceOrigins.includes(studioOrigin)) {
    throw new Error('Production Studio and Workspace Studio origins must be distinct.');
  }
  return {
    ownerUserId,
    port,
    secret,
    studioOrigin,
    upstreamPort,
    workspaceOrigin,
    workspaceOrigins,
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

function accessForRequest(request, configuration) {
  const requestOrigin = studioDevelopmentOriginForRequest(
    request,
    configuration.workspaceOrigins || [configuration.workspaceOrigin],
    { allowLoopback: true },
  );
  if (!requestOrigin) return {};
  const requestUrl = new URL(request.url || '/', requestOrigin);
  const queryToken = requestUrl.searchParams.get('access');
  const cookieToken = requestCookie(request, cookieName);
  const token = queryToken || cookieToken;
  const access = queryToken
    ? verifyWorkspaceStudioToken(token, configuration.secret, configuration.ownerUserId, {
        purpose: 'studio-development-exchange',
      })
    : verifyWorkspaceStudioToken(token, configuration.secret, configuration.ownerUserId, {
        purpose: 'studio-development-session',
      });
  return { access, queryToken, requestOrigin, requestUrl, token };
}

function requestsDocument(request) {
  const mode = String(request.headers['sec-fetch-mode'] || '').toLowerCase();
  const destination = String(request.headers['sec-fetch-dest'] || '').toLowerCase();
  const accept = String(request.headers.accept || '').toLowerCase();
  return (
    (request.method === 'GET' || request.method === 'HEAD') &&
    destination !== 'iframe' &&
    (mode === 'navigate' || destination === 'document' || accept.includes('text/html'))
  );
}

function safeReturnPath(requestUrl) {
  requestUrl.searchParams.delete('access');
  const path = `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
  return path.startsWith('/') && !path.startsWith('//') && path.length <= 2_000 ? path : '/';
}

function unavailable(response, status = 404) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end('Private Workspace Studio unavailable.');
}

export function workspaceStudioReentryDocument(studioOrigin, nonce) {
  const studioSource = JSON.stringify(studioOrigin).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Opening Made Solid Workspace</title>
  </head>
  <body>
    <p>Verifying access to Made Solid Workspace…</p>
    <script nonce="${nonce}">
      (() => {
        const destination = new URL(${studioSource});
        const path = location.pathname + location.search + location.hash;
        destination.hash = '/workspace-development-access?path=' + encodeURIComponent(path);
        window.location.replace(destination.href);
      })();
    </script>
    <noscript><a href="${studioOrigin}/#/prospects">Open Made Solid Studio to continue</a></noscript>
  </body>
</html>`;
}

function requestOwnerReentry(response, configuration, request) {
  const nonce = randomBytes(18).toString('base64');
  const document = workspaceStudioReentryDocument(configuration.studioOrigin, nonce);
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  if (request.method === 'HEAD') response.end();
  else response.end(document);
}

function exchangeAccess(response, requestUrl, configuration) {
  const sessionToken = createWorkspaceStudioToken(configuration.secret, configuration.ownerUserId, {
    lifetimeMs: sessionLifetimeMs,
    purpose: 'studio-development-session',
  });
  response.writeHead(303, {
    'Cache-Control': 'no-store',
    Location: safeReturnPath(requestUrl),
    'Referrer-Policy': 'no-referrer',
    'Set-Cookie': `${cookieName}=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=${Math.floor(
      sessionLifetimeMs / 1_000,
    )}; HttpOnly; Secure; SameSite=Strict`,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  });
  response.end();
}

function upstreamHeaders(request, configuration, requestOrigin = configuration.workspaceOrigin) {
  const headers = { ...request.headers };
  delete headers.cookie;
  delete headers.origin;
  delete headers.referer;
  headers.host = `127.0.0.1:${configuration.upstreamPort}`;
  headers['x-forwarded-host'] = new URL(requestOrigin).host;
  headers['x-forwarded-proto'] = 'https';
  return headers;
}

function workspaceResponseCacheControl(request) {
  const url = new URL(request.url || '/', 'http://made-solid-workspace.local');
  if (requestsDocument(request) || url.pathname.startsWith('/__made-solid/')) {
    return 'private, no-store';
  }
  if (url.pathname.startsWith('/node_modules/.vite/deps/') && url.searchParams.has('v')) {
    return 'private, max-age=31536000, immutable';
  }
  return 'private, no-cache';
}

function proxyHttp(request, response, configuration, requestOrigin) {
  const requestPath = new URL(request.url || '/', requestOrigin).pathname;
  const upstream = createProxyRequest(
    {
      headers: upstreamHeaders(request, configuration, requestOrigin),
      hostname: '127.0.0.1',
      method: request.method,
      path: request.url,
      port: configuration.upstreamPort,
    },
    (upstreamResponse) => {
      const headers = {
        ...upstreamResponse.headers,
        'cache-control': workspaceResponseCacheControl(request),
        'content-security-policy': "frame-ancestors 'none'; base-uri 'self'",
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      };
      delete headers['set-cookie'];
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(response);
    },
  );
  const timeoutMs =
    requestPath === codexBranchPath
      ? (configuration.codexBranchTimeoutMs ?? codexBranchTimeoutMs)
      : (configuration.upstreamTimeoutMs ?? 8_000);
  upstream.setTimeout(timeoutMs, () => {
    upstream.destroy(new Error('Workspace Studio upstream timed out.'));
  });
  upstream.on('error', () => {
    if (!response.headersSent && !response.destroyed) unavailable(response, 502);
  });
  request.pipe(upstream);
}

function proxyUpgrade(request, socket, head, configuration, requestOrigin) {
  const upstream = createProxyRequest({
    headers: upstreamHeaders(request, configuration, requestOrigin),
    hostname: '127.0.0.1',
    method: request.method,
    path: request.url,
    port: configuration.upstreamPort,
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
  upstream.setTimeout(configuration.upstreamTimeoutMs ?? 8_000, () => upstream.destroy());
  upstream.on('error', () => socket.destroy());
  upstream.end();
}

export function startWorkspaceStudioGateway(configuration = workspaceStudioGatewayConfiguration()) {
  const server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('ok');
      return;
    }
    const { access, queryToken, requestOrigin, requestUrl } = accessForRequest(
      request,
      configuration,
    );
    if (!requestOrigin || !requestUrl) {
      unavailable(response);
      return;
    }
    if (!access) {
      if (requestsDocument(request)) requestOwnerReentry(response, configuration, request);
      else unavailable(response);
      return;
    }
    if (queryToken) {
      if (!requestsDocument(request)) {
        unavailable(response);
        return;
      }
      exchangeAccess(response, requestUrl, configuration);
      return;
    }
    proxyHttp(request, response, configuration, requestOrigin);
  });
  server.on('upgrade', (request, socket, head) => {
    const { access, queryToken, requestOrigin } = accessForRequest(request, configuration);
    if (!access || queryToken || !requestOrigin) {
      socket.destroy();
      return;
    }
    proxyUpgrade(request, socket, head, configuration, requestOrigin);
  });
  return server.listen(configuration.port, '0.0.0.0', () => {
    console.log(`[workspace-studio] owner gateway listening on ${configuration.port}`);
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  startWorkspaceStudioGateway();
}
