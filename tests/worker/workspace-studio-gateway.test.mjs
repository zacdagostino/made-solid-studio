import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  createWorkspaceStudioToken,
  verifyWorkspaceStudioToken,
} from '../../scripts/workspace-preview-access.mjs';
import {
  startWorkspaceStudioGateway,
  workspaceStudioGatewayConfiguration,
  workspaceStudioReentryDocument,
} from '../../scripts/workspace-studio-gateway.mjs';

const ownerUserId = '11111111-1111-4111-8111-111111111111';
const otherOwnerUserId = '22222222-2222-4222-8222-222222222222';
const secret = 'workspace-studio-gateway-test-secret-longer-than-thirty-two-characters';

async function listening(server) {
  if (!server.listening) await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return address.port;
}

test('creates owner-bound expiring Workspace Studio tokens', () => {
  const token = createWorkspaceStudioToken(secret, ownerUserId, {
    lifetimeMs: 60_000,
    now: 1_000,
  });
  assert.deepEqual(verifyWorkspaceStudioToken(token, secret, ownerUserId, { now: () => 30_000 }), {
    expiresAt: 61_000,
    ownerUserId,
    purpose: 'studio-development-exchange',
  });
  assert.equal(
    verifyWorkspaceStudioToken(token, secret, otherOwnerUserId, { now: () => 30_000 }),
    undefined,
  );
  assert.equal(
    verifyWorkspaceStudioToken(token, secret, ownerUserId, {
      now: () => 30_000,
      purpose: 'studio-development-session',
    }),
    undefined,
  );
  assert.equal(
    verifyWorkspaceStudioToken(token, secret, ownerUserId, { now: () => 61_000 }),
    undefined,
  );
});

test('requires exact HTTPS origins and distinct gateway and Vite ports', () => {
  const base = {
    SITEFORGE_PUBLIC_ORIGIN: 'https://studio.madesolid.com.au',
    SITEFORGE_RUNTIME_OWNER_USER_ID: ownerUserId,
    SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: 'https://workspace.madesolid.com.au',
    SITEFORGE_WORKSPACE_PREVIEW_SECRET: secret,
  };
  assert.deepEqual(workspaceStudioGatewayConfiguration(base), {
    ownerUserId,
    port: 3000,
    secret,
    studioOrigin: 'https://studio.madesolid.com.au',
    upstreamPort: 5173,
    workspaceOrigin: 'https://workspace.madesolid.com.au',
  });
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...base,
        SITEFORGE_WORKSPACE_PROXY_PORT: '5173',
      }),
    /must be distinct/,
  );
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...base,
        SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: 'http://workspace.madesolid.com.au',
      }),
    /exact HTTPS origin/,
  );
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...base,
        SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: base.SITEFORGE_PUBLIC_ORIGIN,
      }),
    /origins must be distinct/,
  );
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...base,
        SITEFORGE_WORKSPACE_PREVIEW_SECRET: 'too-short',
      }),
    /at least 32 characters/,
  );
});

test('preserves an expired direct Workspace hash route in the browser reentry handoff', () => {
  const document = workspaceStudioReentryDocument('https://studio.madesolid.com.au', 'test-nonce');
  assert.match(document, /location\.pathname \+ location\.search \+ location\.hash/);
  assert.match(document, /workspace-development-access\?path=/);
  assert.match(document, /window\.location\.replace\(destination\.href\)/);
  assert.doesNotMatch(document, /access=/);
});

test('protects every Vite request behind an owner cookie and keeps access out of the clean URL', async () => {
  const upstreamRequests = [];
  const upstream = createServer((request, response) => {
    upstreamRequests.push({ cookie: request.headers.cookie || '', url: request.url });
    response.writeHead(200, {
      'Content-Type': request.url === '/src/main.tsx' ? 'text/javascript' : 'text/html',
      'Set-Cookie': 'upstream=must-not-escape',
    });
    response.end(
      request.url === '/src/main.tsx' ? 'export const ready = true;' : '<h1>Studio</h1>',
    );
  });
  upstream.listen(0, '127.0.0.1');
  const upstreamPort = await listening(upstream);
  const gateway = startWorkspaceStudioGateway({
    ownerUserId,
    port: 0,
    secret,
    studioOrigin: 'https://studio.madesolid.com.au',
    upstreamPort,
    workspaceOrigin: 'https://workspace.madesolid.com.au',
  });
  const gatewayPort = await listening(gateway);
  const origin = `http://127.0.0.1:${gatewayPort}`;
  const documentHeaders = {
    Accept: 'text/html',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
  };
  try {
    const signedOut = await fetch(`${origin}/#/prospects`, {
      headers: documentHeaders,
      redirect: 'manual',
    });
    assert.equal(signedOut.status, 200);
    assert.match(await signedOut.text(), /workspace-development-access\?path=/);
    assert.match(
      signedOut.headers.get('content-security-policy') || '',
      /script-src 'nonce-[^']+';[^;]*base-uri 'none'/,
    );

    const privateModule = await fetch(`${origin}/src/main.tsx`, { redirect: 'manual' });
    assert.equal(privateModule.status, 404);
    assert.equal(upstreamRequests.length, 0);

    const token = createWorkspaceStudioToken(secret, ownerUserId);
    const exchange = await fetch(`${origin}/?access=${encodeURIComponent(token)}`, {
      headers: documentHeaders,
      redirect: 'manual',
    });
    assert.equal(exchange.status, 303);
    assert.equal(exchange.headers.get('location'), '/');
    assert.doesNotMatch(exchange.headers.get('location') || '', /access=/);
    const cookie = (exchange.headers.get('set-cookie') || '').split(';', 1)[0];
    assert.match(cookie, /^__Host-made-solid-studio-workspace=/);
    assert.match(exchange.headers.get('set-cookie') || '', /HttpOnly; Secure; SameSite=Strict/);
    const sessionToken = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
    assert.ok(
      verifyWorkspaceStudioToken(sessionToken, secret, ownerUserId, {
        purpose: 'studio-development-session',
      }),
    );

    const document = await fetch(`${origin}/`, { headers: { Cookie: cookie } });
    assert.equal(document.status, 200);
    assert.equal(await document.text(), '<h1>Studio</h1>');
    assert.equal(document.headers.get('set-cookie'), null);
    const module = await fetch(`${origin}/src/main.tsx`, { headers: { Cookie: cookie } });
    assert.equal(module.status, 200);
    assert.match(await module.text(), /ready = true/);
    assert.deepEqual(
      upstreamRequests.map(({ cookie: upstreamCookie }) => upstreamCookie),
      ['', ''],
    );
  } finally {
    await new Promise((resolve) => gateway.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  }
});
