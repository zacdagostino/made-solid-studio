import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  attachPreviewHostUpgradeHandler,
  previewHostRequestListener,
} from '../../preview-host/server.mjs';
import { createWorkspacePreviewToken } from '../../scripts/workspace-preview-access.mjs';
import { workspaceShellDocument } from '../../scripts/workspace-preview-proxy.mjs';

const secret = 'browser-workspace-secret-longer-than-thirty-two-characters';

test.use({ ignoreHTTPSErrors: true });

async function listen(server) {
  server.__testSockets = new Set();
  server.on('connection', (socket) => {
    server.__testSockets.add(socket);
    socket.on('close', () => server.__testSockets.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an Internet server.');
  return address.port;
}

async function closeServer(server) {
  for (const socket of server.__testSockets || []) socket.destroy();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

test('loads live client resources through a secure distinct-origin frame and isolates stale clients', async ({
  browser,
}) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-https-frame-'));
  const keyPath = join(fixtureRoot, 'localhost-key.pem');
  const certificatePath = join(fixtureRoot, 'localhost-cert.pem');
  const activeWorkspacePreviewPath = join(fixtureRoot, 'active.json');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-sha256',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
      '-keyout',
      keyPath,
      '-out',
      certificatePath,
    ],
    { stdio: 'ignore' },
  );
  const tls = {
    cert: await readFile(certificatePath),
    key: await readFile(keyPath),
  };
  const upstreamRequests = [];
  const upstreamUpgrades = [];
  const upstream = createHttpServer((request, response) => {
    upstreamRequests.push({
      cookie: request.headers.cookie || '',
      origin: request.headers.origin || '',
      secFetchMode: request.headers['sec-fetch-mode'] || '',
      secFetchSite: request.headers['sec-fetch-site'] || '',
      url: request.url || '',
    });
    if (
      request.headers.origin ||
      request.headers['sec-fetch-mode'] ||
      request.headers['sec-fetch-site']
    ) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Unauthorized');
      return;
    }
    if (request.url === '/_next/static/app.css') {
      response.writeHead(200, {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'text/css; charset=utf-8',
      });
      response.end('#client-runtime{color:rgb(12,34,56)}');
      return;
    }
    if (request.url === '/_next/static/app.js') {
      response.writeHead(200, {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'text/javascript; charset=utf-8',
      });
      response.end(
        "document.querySelector('#client-runtime').dataset.javascript='loaded';window.__clientJavaScriptLoaded=true;",
      );
      return;
    }
    if (request.url?.startsWith('/_next/image')) {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      response.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#dfff00"/></svg>',
      );
      return;
    }
    response.writeHead(200, {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors *",
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(`<!doctype html><html lang="en"><head>
      <meta name="referrer" content="no-referrer">
      <link rel="stylesheet" href="/_next/static/app.css">
      <script defer src="/_next/static/app.js"></script>
    </head><body><main>
      <h1>LECE live website</h1>
      <p id="client-runtime">Client runtime</p>
      <img alt="Client runtime asset" src="/_next/image?url=%2Fhero.jpg&w=640&q=75">
    </main></body></html>`);
  });
  upstream.on('upgrade', (request, socket) => {
    upstreamUpgrades.push({
      cookie: request.headers.cookie || '',
      origin: request.headers.origin || '',
      secFetchMode: request.headers['sec-fetch-mode'] || '',
      secFetchSite: request.headers['sec-fetch-site'] || '',
      url: request.url || '',
    });
    if (
      request.headers.origin ||
      request.headers['sec-fetch-mode'] ||
      request.headers['sec-fetch-site']
    ) {
      socket.end('HTTP/1.1 403 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    const websocketAccept = createHash('sha1')
      .update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept}\r\n\r\n`,
    );
    setTimeout(() => socket.destroy(), 100);
  });
  const upstreamPort = await listen(upstream);
  await writeFile(
    activeWorkspacePreviewPath,
    JSON.stringify({ directory: 'lece-client', port: upstreamPort }),
  );

  let workspaceOrigin = '';
  let previewOrigin = '';
  const previewConfiguration = {
    activeWorkspacePreviewPath,
    get publicOrigin() {
      return previewOrigin;
    },
    serviceRoleKey: 'not-used',
    supabaseUrl: 'https://project.supabase.co',
    get workspaceOrigin() {
      return workspaceOrigin;
    },
    workspacePreviewSecret: secret,
  };
  const preview = createHttpsServer(tls, previewHostRequestListener(previewConfiguration));
  attachPreviewHostUpgradeHandler(preview, previewConfiguration);
  const previewPort = await listen(preview);
  previewOrigin = `https://localhost:${previewPort}`;

  const tokens = {
    '/': createWorkspacePreviewToken('lece-client', secret),
    '/other': createWorkspacePreviewToken('other-client', secret),
  };
  const workspace = createHttpsServer(tls, (request, response) => {
    const pathname = new URL(request.url || '/', 'https://localhost').pathname;
    const token = tokens[pathname] || tokens['/'];
    const directory = pathname === '/other' ? 'other-client' : 'lece-client';
    const nonce = 'browser-test-nonce';
    response.writeHead(200, {
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src ${previewOrigin} https://studio.madesolid.com.au; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(
      workspaceShellDocument(
        'https://studio.madesolid.com.au',
        request.url || '/',
        directory,
        token,
        nonce,
        previewOrigin,
      ),
    );
  });
  const workspacePort = await listen(workspace);
  workspaceOrigin = `https://localhost:${workspacePort}`;

  const unrelated = createHttpsServer(tls, (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><iframe title="Foreign frame"></iframe>');
  });
  const unrelatedPort = await listen(unrelated);

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  try {
    await page.goto(workspaceOrigin);
    const clientFrame = page.frameLocator('iframe.client-preview');
    await expect(clientFrame.getByRole('heading', { name: 'LECE live website' })).toBeVisible();
    const runtime = clientFrame.locator('#client-runtime');
    await expect(runtime).toHaveAttribute('data-javascript', 'loaded');
    await expect(runtime).toHaveCSS('color', 'rgb(12, 34, 56)');
    await expect(clientFrame.getByAltText('Client runtime asset')).toHaveJSProperty(
      'complete',
      true,
    );

    const clientDocumentFrame = page
      .frames()
      .find((frame) =>
        frame.url().startsWith(`${previewOrigin}/__made-solid/workspace-frame/lece-client/`),
      );
    expect(clientDocumentFrame).toBeTruthy();
    expect(new URL(clientDocumentFrame.url()).searchParams.has('access')).toBe(false);
    expect(await clientDocumentFrame.evaluate(() => location.origin)).toBe(previewOrigin);
    await expect(
      clientDocumentFrame.evaluate(() => window.parent.document.title),
    ).rejects.toThrow();
    expect(upstreamRequests.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        '/',
        '/_next/static/app.css',
        '/_next/static/app.js',
        '/_next/image?url=%2Fhero.jpg&w=640&q=75',
      ]),
    );
    expect(upstreamRequests.every(({ cookie }) => cookie === '')).toBe(true);
    expect(upstreamRequests.every(({ origin }) => origin === '')).toBe(true);
    expect(upstreamRequests.every(({ secFetchMode }) => secFetchMode === '')).toBe(true);
    expect(upstreamRequests.every(({ secFetchSite }) => secFetchSite === '')).toBe(true);
    const websocketOpened = await clientDocumentFrame.evaluate(
      () =>
        new Promise((resolve) => {
          const target = new URL('hmr', document.baseURI);
          target.protocol = 'wss:';
          const socket = new WebSocket(target);
          socket.addEventListener('open', () => {
            resolve(true);
            socket.close();
          });
          socket.addEventListener('error', () => resolve(false));
          setTimeout(() => resolve(false), 3_000);
        }),
    );
    expect(websocketOpened).toBe(true);
    expect(upstreamUpgrades).toEqual([
      { cookie: '', origin: '', secFetchMode: '', secFetchSite: '', url: '/hmr' },
    ]);

    const otherPage = await context.newPage();
    await otherPage.goto(`${workspaceOrigin}/other`);
    await expect(
      otherPage
        .frameLocator('iframe.client-preview')
        .getByText('Private workspace frame unavailable.'),
    ).toBeVisible();
    const liveResult = await clientDocumentFrame.evaluate(async () => {
      const response = await fetch(new URL('_next/static/app.css', document.baseURI));
      return response.status;
    });
    expect(liveResult).toBe(200);

    await writeFile(
      activeWorkspacePreviewPath,
      JSON.stringify({ directory: 'other-client', port: upstreamPort }),
    );
    await otherPage.reload();
    await expect(
      otherPage.frameLocator('iframe.client-preview').getByRole('heading', {
        name: 'LECE live website',
      }),
    ).toBeVisible();
    const staleResult = await clientDocumentFrame.evaluate(async () => {
      const response = await fetch(new URL('_next/static/app.css', document.baseURI));
      return response.status;
    });
    expect(staleResult).toBe(404);

    const foreignPage = await context.newPage();
    const otherClientFrame = otherPage
      .frames()
      .find((frame) =>
        frame.url().startsWith(`${previewOrigin}/__made-solid/workspace-frame/other-client/`),
      );
    expect(otherClientFrame).toBeTruthy();
    const cleanClientUrl = otherClientFrame.url();
    const consoleMessages = [];
    foreignPage.on('console', (message) => consoleMessages.push(message.text()));
    await foreignPage.goto(`https://localhost:${unrelatedPort}`);
    await foreignPage.locator('iframe').evaluate((frame, source) => {
      frame.src = source;
    }, cleanClientUrl);
    await expect(foreignPage.getByRole('heading', { name: 'LECE live website' })).toHaveCount(0);
    await expect.poll(() => consoleMessages.join('\n')).toContain('frame-ancestors');
    expect(foreignPage.frames().some((frame) => frame.url() === cleanClientUrl)).toBe(false);
    await otherPage.close();
    await foreignPage.close();
  } finally {
    await context.close();
    await Promise.all([closeServer(unrelated), closeServer(workspace), closeServer(preview)]);
    await closeServer(upstream);
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
