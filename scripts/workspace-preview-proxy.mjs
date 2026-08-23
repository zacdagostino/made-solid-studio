import { createServer, request as createProxyRequest } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyWorkspacePreviewToken } from './workspace-preview-access.mjs';

const cookieName = '__Host-made-solid-workspace';
const lastWorkspaceCookieName = '__Host-made-solid-workspace-last';
const workspaceQueryName = '__made_solid_workspace';
const returnQueryName = '__made_solid_return';
const frameQueryName = '__made_solid_frame';
const frameCookiePrefix = '__Host-made-solid-workspace-frame-';
const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

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

function safeStudioRoute(value) {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    value.length <= 2_000
    ? value
    : '/prospects';
}

function workspaceRequestDetails(requestUrl = '/') {
  const requested = new URL(requestUrl, 'https://workspace.madesolid.invalid');
  const directory = requested.searchParams.get(workspaceQueryName) || undefined;
  const studioRoute = safeStudioRoute(requested.searchParams.get(returnQueryName));
  requested.searchParams.delete('access');
  requested.searchParams.delete(workspaceQueryName);
  requested.searchParams.delete(returnQueryName);
  const returnPath = `${requested.pathname}${requested.search}`;
  return {
    directory: directoryPattern.test(directory || '') ? directory : undefined,
    returnPath,
    studioRoute,
  };
}

export function workspacePreviewReentryUrl(studioOrigin, requestUrl = '/', workspaceDirectory) {
  const requestDetails = workspaceRequestDetails(requestUrl);
  const destination = new URL(studioOrigin);
  destination.pathname = '/';
  destination.search = '';
  const query = new URLSearchParams({
    path: requestDetails.returnPath,
  });
  if (requestDetails.studioRoute !== '/prospects') {
    query.set('return', requestDetails.studioRoute);
  }
  const directory = directoryPattern.test(workspaceDirectory || '')
    ? workspaceDirectory
    : requestDetails.directory;
  if (directory) query.set('workspace', directory);
  destination.hash = `/workspace-preview-access?${query.toString()}`;
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

function requestCookies(request) {
  const cookies = new Map();
  for (const source of String(request.headers.cookie || '').split(';')) {
    const [name, ...value] = source.trim().split('=');
    if (!name || !value.length) continue;
    try {
      cookies.set(name, decodeURIComponent(value.join('=')));
    } catch {
      // Ignore a malformed cookie without affecting other workspace tabs.
    }
  }
  return cookies;
}

function workspaceFrameId(token) {
  return createHash('sha256').update(token).digest('hex').slice(0, 24);
}

function requestFrameId(request) {
  const requested = new URL(request.url || '/', 'https://workspace.madesolid.invalid');
  const direct = requested.searchParams.get(frameQueryName) || '';
  if (/^[a-f0-9]{24}$/.test(direct)) return direct;
  try {
    const referrer = new URL(String(request.headers.referer || ''));
    const inherited = referrer.searchParams.get(frameQueryName) || '';
    return /^[a-f0-9]{24}$/.test(inherited) ? inherited : undefined;
  } catch {
    return undefined;
  }
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

function accessForRequest(request, configuration, topLevel = false) {
  const requestUrl = new URL(request.url || '/', 'http://made-solid-preview.local');
  const queryToken = requestUrl.searchParams.get('access');
  let cookieToken;
  if (topLevel) {
    cookieToken = requestCookie(request, cookieName);
  } else {
    const cookies = requestCookies(request);
    const frameId = requestFrameId(request);
    if (frameId) {
      cookieToken = cookies.get(`${frameCookiePrefix}${frameId}`);
    } else {
      const validFrameTokens = [...cookies.entries()]
        .filter(([name]) => name.startsWith(frameCookiePrefix))
        .map(([, value]) => value)
        .filter((value) => verifyWorkspacePreviewToken(value, configuration.secret));
      const directories = new Set(
        validFrameTokens.map(
          (value) => verifyWorkspacePreviewToken(value, configuration.secret)?.directory,
        ),
      );
      if (validFrameTokens.length && directories.size === 1) cookieToken = validFrameTokens[0];
    }
  }
  const token = queryToken || cookieToken;
  const access = verifyWorkspacePreviewToken(token, configuration.secret);
  return { access, queryToken, requestUrl, token };
}

function cleanAccessRedirect(response, requestUrl, token, directory) {
  requestUrl.searchParams.delete('access');
  requestUrl.searchParams.set(workspaceQueryName, directory);
  const location = `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
  response.writeHead(303, {
    'Cache-Control': 'no-store',
    Location: location || '/',
    'Set-Cookie': [
      `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      `${lastWorkspaceCookieName}=${encodeURIComponent(directory)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`,
    ],
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

function requestsTopLevelDocument(request) {
  return requestsDocument(request) && request.headers['sec-fetch-dest'] === 'document';
}

export function workspaceShellDocument(studioOrigin, requestUrl, directory, token, nonce) {
  const requested = new URL(requestUrl, 'https://workspace.madesolid.invalid');
  const requestDetails = workspaceRequestDetails(requestUrl);
  requested.searchParams.delete(workspaceQueryName);
  requested.searchParams.delete(returnQueryName);
  requested.searchParams.delete('access');
  requested.searchParams.set(frameQueryName, workspaceFrameId(token));
  const studio = new URL(studioOrigin);
  studio.pathname = '/';
  studio.search = '';
  studio.hash = requestDetails.studioRoute;
  const codex = new URL('/__made-solid/workspace-codex', studioOrigin);
  codex.searchParams.set('access', token);
  codex.searchParams.set('workspace', directory);
  codex.hash = `/codex-panel?workspace=${encodeURIComponent(directory)}`;
  const source = JSON.stringify(
    `${requested.pathname}${requested.search}${requested.hash}`,
  ).replaceAll('<', '\\u003c');
  const studioSource = JSON.stringify(studio.href).replaceAll('<', '\\u003c');
  const codexSource = JSON.stringify(codex.href).replaceAll('<', '\\u003c');
  const studioOriginSource = JSON.stringify(studioOrigin).replaceAll('<', '\\u003c');
  const workspaceLabel = directory.replaceAll('-', ' ').replaceAll('_', ' ');
  // This isolated runtime-owned HTML cannot import the React UI primitives. Its two native
  // surface controls keep the same 44px target and explicit hover, focus, active, and pressed states.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Made Solid Workspace</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; }
      body { display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; background: #111; color: #f7f7f4; }
      header { min-height: 72px; display: grid; grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto auto; align-items: center; gap: 18px; padding: 10px 16px; border-bottom: 1px solid #343434; background: #171717; }
      a { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid #555; border-radius: 8px; color: inherit; text-decoration: none; font-weight: 700; white-space: nowrap; }
      a:hover { background: #292929; }
      a:focus-visible { outline: 3px solid #dfff00; outline-offset: 2px; }
      p { min-width: 0; margin: 0; color: #c8c8c2; }
      strong { color: #f7f7f4; }
      .workspace-brand { min-width: 0; display: flex; align-items: center; gap: 10px; }
      .workspace-mark { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 8px; background: #dfff00; color: #111; font-size: 12px; font-weight: 900; letter-spacing: -.04em; }
      .workspace-name { min-width: 0; display: grid; gap: 1px; }
      .workspace-name strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; line-height: 1.2; }
      .workspace-name span { color: #aaa9a2; font-size: 12px; line-height: 1.3; }
      .workspace-context { min-width: 0; display: flex; align-items: center; justify-content: center; gap: 10px; overflow: hidden; }
      .workspace-context p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .workspace-context strong { text-transform: capitalize; }
      .workspace-live { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; color: #dfff00; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      .workspace-live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #75dfb3; box-shadow: 0 0 0 3px rgba(117, 223, 179, .12); }
      .workspace-scope { color: #aaa9a2; font-size: 12px; }
      .workspace-switcher { display: inline-flex; gap: 4px; padding: 3px; border: 1px solid #3d3d3d; border-radius: 9px; background: #101010; }
      .workspace-switcher button { min-width: 72px; min-height: 44px; border: 0; border-radius: 6px; padding: 0 12px; color: #c8c8c2; background: transparent; font: inherit; font-weight: 750; cursor: pointer; }
      .workspace-switcher button:hover { background: #292929; color: #fff; }
      .workspace-switcher button:active { background: #3a3a3a; transform: translateY(1px); }
      .workspace-switcher button[aria-pressed='true'] { background: #dfff00; color: #111; }
      .workspace-switcher button[aria-pressed='true']:active { background: #c8e600; }
      .workspace-switcher button:focus-visible { outline: 3px solid #dfff00; outline-offset: 3px; }
      .workspace-surfaces { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: hidden; }
      iframe { display: block; border: 0; }
      .client-preview { width: 100%; height: 100%; background: #fff; }
      .codex-editor { position: fixed; z-index: 2; right: 0; bottom: 0; width: 84px; height: 84px; background: transparent; transition: width 160ms ease, height 160ms ease; }
      body[data-surface='codex'] .workspace-surfaces, body[data-codex-open='true'] .workspace-surfaces { grid-template-columns: minmax(0, 3fr) minmax(360px, 2fr); }
      body[data-surface='codex'] .codex-editor, body[data-codex-open='true'] .codex-editor { position: static; width: 100%; height: 100%; border-left: 1px solid #343434; background: #181818; }
      @media (max-width: 1000px) {
        header { grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px 12px; }
        .workspace-context { grid-column: 1 / -1; justify-content: flex-start; }
        .workspace-scope { margin-left: auto; }
      }
      @media (max-width: 760px) {
        .workspace-surfaces, body[data-surface='codex'] .workspace-surfaces, body[data-codex-open='true'] .workspace-surfaces { display: block; }
        .client-preview, .codex-editor, body[data-surface='codex'] .codex-editor, body[data-codex-open='true'] .codex-editor { position: static; width: 100%; height: 100%; border: 0; }
        body[data-surface='preview'] .codex-editor { display: none; }
        body[data-surface='codex'] .client-preview, body[data-codex-open='true'] .client-preview { display: none; }
      }
      @media (max-width: 520px) {
        header { grid-template-columns: minmax(0, 1fr) auto; }
        .workspace-switcher { grid-column: 1 / -1; width: 100%; }
        .workspace-switcher button { flex: 1; }
        .workspace-context { grid-row: 2; }
        .workspace-switcher { grid-row: 3; }
      }
      @media (max-width: 420px) {
        header { padding-inline: 10px; }
        .workspace-mark { width: 34px; height: 34px; flex-basis: 34px; }
        .workspace-name strong { font-size: 14px; }
        .workspace-name span { font-size: 11px; }
        .workspace-context { gap: 8px; }
        .workspace-scope { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        a { padding-inline: 10px; font-size: 13px; }
      }
      @media (prefers-reduced-motion: reduce) { .codex-editor { transition: none; } }
    </style>
  </head>
  <body>
    <header>
      <div class="workspace-brand">
        <span aria-hidden="true" class="workspace-mark">MS</span>
        <span class="workspace-name">
          <strong>Made Solid Workspace</strong>
          <span>Instant live development</span>
        </span>
      </div>
      <div class="workspace-context" aria-label="Current development workspace">
        <span class="workspace-live">Live</span>
        <p><strong>${workspaceLabel}</strong> website preview</p>
        <span class="workspace-scope">Codex scoped to this website</span>
      </div>
      <div class="workspace-switcher" aria-label="Workspace surface">
        <button aria-pressed="true" data-surface="preview" type="button">Preview</button>
        <button aria-pressed="false" data-surface="codex" type="button">Codex</button>
      </div>
      <a href=${studioSource}>Exit to Studio</a>
    </header>
    <main aria-label="Workspace development surfaces" class="workspace-surfaces">
      <iframe class="client-preview" sandbox="allow-modals allow-popups allow-scripts" src=${source} title="Client website live preview"></iframe>
      <iframe class="codex-editor" sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts" src=${codexSource} title="Client website Codex editor"></iframe>
    </main>
    <script nonce="${nonce}">
      (() => {
        const editor = document.querySelector('.codex-editor');
        const surfaceButtons = [...document.querySelectorAll('[data-surface]')];
        const selectSurface = (surface, openEditor = false) => {
          document.body.dataset.surface = surface;
          surfaceButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.surface === surface));
          });
          if (openEditor && editor.contentWindow) {
            editor.contentWindow.postMessage(
              { source: 'made-solid-codex-host', action: 'open' },
              ${studioOriginSource},
            );
          }
        };
        selectSurface('preview');
        surfaceButtons.forEach((button) => {
          button.addEventListener('click', () => selectSurface(button.dataset.surface, button.dataset.surface === 'codex'));
        });
        window.addEventListener('message', (event) => {
          if (event.origin !== ${studioOriginSource} || event.source !== editor.contentWindow) return;
          if (!event.data || event.data.source !== 'made-solid-codex-panel') return;
          document.body.dataset.codexOpen = event.data.open ? 'true' : 'false';
          if (event.data.open) selectSurface('codex');
        });
      })();
    </script>
  </body>
</html>`;
}

function serveWorkspaceShell(request, response, configuration, directory, token) {
  const nonce = randomBytes(18).toString('base64');
  const document = workspaceShellDocument(
    configuration.studioOrigin,
    request.url,
    directory,
    token,
    nonce,
  );
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src 'self' ${configuration.studioOrigin}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Set-Cookie': [
      `${frameCookiePrefix}${workspaceFrameId(token)}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`,
      `${lastWorkspaceCookieName}=${encodeURIComponent(directory)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`,
    ],
  });
  if (request.method === 'HEAD') response.end();
  else response.end(document);
}

function requestStudioReentry(request, response, configuration, workspaceDirectory) {
  if (!requestsDocument(request)) {
    unavailable(response);
    return;
  }
  response.writeHead(303, {
    'Cache-Control': 'no-store',
    Location: workspacePreviewReentryUrl(
      configuration.studioOrigin,
      request.url,
      directoryPattern.test(workspaceDirectory || '')
        ? workspaceDirectory
        : requestCookie(request, lastWorkspaceCookieName),
    ),
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

function upstreamPath(requestUrl = '/') {
  const requested = new URL(requestUrl, 'https://workspace.madesolid.invalid');
  requested.searchParams.delete('access');
  requested.searchParams.delete(workspaceQueryName);
  requested.searchParams.delete(returnQueryName);
  requested.searchParams.delete(frameQueryName);
  return `${requested.pathname}${requested.search}${requested.hash}`;
}

function proxyHttp(request, response, active, configuration) {
  const upstream = createProxyRequest(
    {
      headers: upstreamHeaders(request, active),
      hostname: '127.0.0.1',
      method: request.method,
      path: upstreamPath(request.url),
      port: active.port,
    },
    (upstreamResponse) => {
      const headers = {
        ...upstreamResponse.headers,
        'content-security-policy': clientPreviewContentSecurityPolicy(
          upstreamResponse.headers['content-security-policy'],
        ),
        'referrer-policy': 'same-origin',
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

function clientPreviewContentSecurityPolicy(existing) {
  const sources = Array.isArray(existing) ? existing : [existing || ''];
  const policies = sources.map((source) => {
    const directives = String(source)
      .split(';')
      .map((value) => value.trim())
      .filter((value) => value && !value.toLowerCase().startsWith('frame-ancestors'));
    directives.push("frame-ancestors 'self'");
    return directives.join('; ');
  });
  return Array.isArray(existing) ? policies : policies[0];
}

function proxyUpgrade(request, socket, head, active) {
  const upstream = createProxyRequest({
    headers: upstreamHeaders(request, active),
    hostname: '127.0.0.1',
    method: request.method,
    path: upstreamPath(request.url),
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
      const topLevel = requestsTopLevelDocument(request);
      const { access, queryToken, requestUrl, token } = accessForRequest(
        request,
        configuration,
        topLevel,
      );
      if (!access) {
        requestStudioReentry(request, response, configuration);
        return;
      }
      if (queryToken) {
        cleanAccessRedirect(response, requestUrl, token, access.directory);
        return;
      }
      const active = await activePreview(configuration);
      if (active.directory !== access.directory) {
        requestStudioReentry(request, response, configuration, access.directory);
        return;
      }
      if (topLevel) {
        const requestedDirectory = workspaceRequestDetails(request.url).directory;
        if (requestedDirectory && requestedDirectory !== access.directory) {
          requestStudioReentry(request, response, configuration, requestedDirectory);
          return;
        }
        if (!requestedDirectory) {
          cleanAccessRedirect(response, requestUrl, token, access.directory);
          return;
        }
        serveWorkspaceShell(request, response, configuration, access.directory, token);
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
