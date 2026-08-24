import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import test from 'node:test';
import {
  createWorkspaceStudioToken,
  verifyWorkspaceStudioToken,
} from '../../scripts/workspace-preview-access.mjs';
import {
  startWorkspaceStudioGateway,
  workspaceStudioGatewayConfiguration,
} from '../../scripts/workspace-studio-gateway.mjs';

const ownerUserId = '763647ba-7e4e-493e-a7ab-24a7eed96c40';
const otherOwnerUserId = '163647ba-7e4e-493e-a7ab-24a7eed96c40';
const secret = 'workspace-development-studio-test-secret-123456789';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function httpRequest(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const pending = request(
      {
        headers,
        hostname: '127.0.0.1',
        path,
        port,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
            status: response.statusCode,
          }),
        );
      },
    );
    pending.once('error', reject);
    pending.end();
  });
}

test('Workspace Studio capabilities are short-lived and bound to the exact owner', () => {
  const token = createWorkspaceStudioToken(secret, ownerUserId, {
    lifetimeMs: 120_000,
    now: 1_000,
  });
  assert.deepEqual(verifyWorkspaceStudioToken(token, secret, ownerUserId, { now: () => 60_000 }), {
    expiresAt: 121_000,
    ownerUserId,
    purpose: 'studio-development-exchange',
  });
  assert.equal(
    verifyWorkspaceStudioToken(token, secret, otherOwnerUserId, { now: () => 60_000 }),
    undefined,
  );
  assert.equal(
    verifyWorkspaceStudioToken(token, `${secret}-wrong`, ownerUserId, { now: () => 60_000 }),
    undefined,
  );
  assert.equal(
    verifyWorkspaceStudioToken(token, secret, ownerUserId, { now: () => 121_000 }),
    undefined,
  );
});

test('Workspace Studio configuration rejects insecure origins and colliding ports', () => {
  const environment = {
    SITEFORGE_PUBLIC_ORIGIN: 'https://studio.madesolid.com.au',
    SITEFORGE_RUNTIME_OWNER_USER_ID: ownerUserId,
    SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: 'https://workspace.madesolid.com.au',
    SITEFORGE_WORKSPACE_PREVIEW_SECRET: secret,
    SITEFORGE_WORKSPACE_PROXY_PORT: '3000',
    SITEFORGE_WORKSPACE_STUDIO_PORT: '5173',
  };
  assert.deepEqual(workspaceStudioGatewayConfiguration(environment), {
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
        ...environment,
        SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: 'http://workspace.madesolid.com.au',
      }),
    /exact HTTPS origin/,
  );
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...environment,
        SITEFORGE_WORKSPACE_STUDIO_PORT: '3000',
      }),
    /must be distinct/,
  );
  assert.throws(
    () =>
      workspaceStudioGatewayConfiguration({
        ...environment,
        SITEFORGE_RUNTIME_OWNER_USER_ID: 'not-an-owner-uuid',
      }),
    /valid UUID/,
  );
});

test('Workspace Studio gateway authenticates documents, assets, and the live-update transport', async () => {
  let upstreamHeaders;
  const upstream = createServer((incoming, response) => {
    upstreamHeaders = incoming.headers;
    response.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Set-Cookie': 'unsafe-upstream-cookie=value',
    });
    response.end(`development:${incoming.url}`);
  });
  const upstreamPort = await listen(upstream);
  const gateway = startWorkspaceStudioGateway({
    ownerUserId,
    port: 0,
    secret,
    studioOrigin: 'https://studio.madesolid.com.au',
    upstreamPort,
    upstreamTimeoutMs: 2_000,
    workspaceOrigin: 'https://workspace.madesolid.com.au',
  });
  await new Promise((resolve) => gateway.once('listening', resolve));
  const gatewayPort = gateway.address().port;

  try {
    const anonymousDocument = await httpRequest(gatewayPort, '/#/prospects', {
      accept: 'text/html',
      'sec-fetch-dest': 'document',
    });
    assert.equal(anonymousDocument.status, 200);
    assert.match(
      anonymousDocument.body,
      /location\.pathname \+ location\.search \+ location\.hash/,
    );
    assert.match(anonymousDocument.body, /workspace-development-access\?path=/);
    assert.match(anonymousDocument.body, /window\.location\.replace\(destination\.href\)/);
    assert.match(
      anonymousDocument.headers['content-security-policy'],
      /script-src 'nonce-[^']+';[^;]*base-uri 'none'/,
    );
    assert.equal(anonymousDocument.headers['cache-control'], 'no-store');

    const anonymousAsset = await httpRequest(gatewayPort, '/src/main.tsx');
    assert.equal(anonymousAsset.status, 404);
    assert.equal(anonymousAsset.body, 'Private Workspace Studio unavailable.');

    const token = createWorkspaceStudioToken(secret, ownerUserId);
    const exchange = await httpRequest(gatewayPort, `/src/main.tsx?access=${token}`, {
      accept: 'text/html',
      'sec-fetch-dest': 'document',
    });
    assert.equal(exchange.status, 303);
    assert.equal(exchange.headers.location, '/src/main.tsx');
    assert.match(
      exchange.headers['set-cookie'][0],
      /^__Host-made-solid-studio-workspace=.*; Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Strict$/,
    );
    assert.doesNotMatch(exchange.headers.location, /access=/);

    const cookie = exchange.headers['set-cookie'][0].split(';', 1)[0];
    const authenticatedAsset = await httpRequest(gatewayPort, '/@vite/client', {
      cookie,
      origin: 'https://workspace.madesolid.com.au',
      referer: 'https://workspace.madesolid.com.au/',
    });
    assert.equal(authenticatedAsset.status, 200);
    assert.equal(authenticatedAsset.body, 'development:/@vite/client');
    assert.equal(authenticatedAsset.headers['cache-control'], 'private, no-store');
    assert.equal(authenticatedAsset.headers['set-cookie'], undefined);
    assert.equal(upstreamHeaders.cookie, undefined);
    assert.equal(upstreamHeaders.origin, undefined);
    assert.equal(upstreamHeaders.referer, undefined);
    assert.equal(upstreamHeaders['x-forwarded-host'], 'workspace.madesolid.com.au');
    assert.equal(upstreamHeaders['x-forwarded-proto'], 'https');
  } finally {
    await Promise.all([close(gateway), close(upstream)]);
  }
});

test('Railway keeps production release serving separate from the restartable live checkout', async () => {
  const [launcher, viteConfiguration] = await Promise.all([
    readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
    readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8'),
  ]);
  const developmentSupervisor = launcher.slice(
    launcher.indexOf('maintain_workspace_studio()'),
    launcher.indexOf('maintain_workspace_gateway()'),
  );
  const productionStart = launcher.slice(
    launcher.indexOf('trap stop_runtime INT TERM EXIT'),
    launcher.indexOf('node "$application_directory/worker/supervisor.mjs"'),
  );

  assert.match(productionStart, /cd "\$application_directory"/);
  assert.match(productionStart, /vite\.js" preview/);
  assert.doesNotMatch(productionStart, /--mode development|--force/);

  assert.match(developmentSupervisor, /cd "\$studio_workspace_directory"/);
  assert.match(developmentSupervisor, /exec env -i/);
  assert.match(developmentSupervisor, /SITEFORGE_WORKSPACE_DEVELOPMENT=1/);
  assert.match(developmentSupervisor, /--host 127\.0\.0\.1/);
  assert.match(developmentSupervisor, /--mode development/);
  assert.match(developmentSupervisor, /--force/);
  assert.doesNotMatch(
    developmentSupervisor,
    /SITEFORGE_SUPABASE_SERVICE_ROLE_KEY=|SITEFORGE_WORKSPACE_PREVIEW_SECRET=|SUPABASE_SERVICE_ROLE_KEY=|SITEFORGE_GITHUB_TOKEN=|CODEX_HOME=/,
  );

  assert.match(launcher, /maintain_workspace_studio &/);
  assert.match(launcher, /maintain_workspace_gateway &/);
  assert.match(launcher, /wait -n "\$\{critical_processes\[@\]\}"/);
  assert.doesNotMatch(launcher, /workspace-preview-proxy\.mjs/);

  assert.match(
    viteConfiguration,
    /plugins: \[react\(\), \.\.\.\(workspaceDevelopment \? \[\] : \[localWorkspacePlugin\(\)\]\)\]/,
  );
  assert.match(viteConfiguration, /frame-ancestors 'none'/);
  assert.match(viteConfiguration, /SITEFORGE_RUNTIME_API_PROXY_ORIGIN/);
  assert.match(viteConfiguration, /target: runtimeApiTarget/);
  assert.match(viteConfiguration, /ws: true/);
});
