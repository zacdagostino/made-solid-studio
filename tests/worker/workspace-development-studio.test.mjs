import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createServer as createViteServer } from 'vite';
import {
  createWorkspaceStudioToken,
  verifyWorkspaceStudioToken,
} from '../../scripts/workspace-preview-access.mjs';
import { workspaceCodexBranchPlugin } from '../../scripts/workspace-codex-branch-vite-plugin.mjs';
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

function httpRequest(port, path, headers = {}, { body = '', method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const pending = request(
      {
        headers,
        hostname: '127.0.0.1',
        method,
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
    pending.end(body);
  });
}

function pluginRequest({ body = '', headers = {}, method = 'POST', url }) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(request, { headers, method, url });
  return request;
}

function pluginResponse() {
  let resolveFinished;
  const finished = new Promise((resolve) => {
    resolveFinished = resolve;
  });
  return {
    body: '',
    finished,
    statusCode: undefined,
    end(value = '') {
      this.body += String(value);
      resolveFinished();
    },
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
  };
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
    websiteOrigin: undefined,
    workspaceOrigin: 'https://workspace.madesolid.com.au',
    workspaceOrigins: ['https://workspace.madesolid.com.au'],
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

test('Workspace Studio owns live Codex branch and phone-notification requests', async () => {
  let middleware;
  const runtimeDataDirectory = await mkdtemp(join(tmpdir(), 'made-solid-workspace-studio-'));
  workspaceCodexBranchPlugin({
    SITEFORGE_RUNTIME_DATA_DIR: runtimeDataDirectory,
    SITEFORGE_STUDIO_WORKSPACE_DIR: new URL('../..', import.meta.url).pathname,
    SITEFORGE_WORKSPACE_DEVELOPMENT: '1',
  }).configureServer({
    middlewares: {
      use(candidate) {
        middleware = candidate;
      },
    },
  });
  assert.equal(typeof middleware, 'function');

  const ignoredResponse = pluginResponse();
  let continued = false;
  await middleware(pluginRequest({ url: '/__made-solid/codex-feedback' }), ignoredResponse, () => {
    continued = true;
  });
  assert.equal(continued, true);

  const rejectedResponse = pluginResponse();
  await middleware(
    pluginRequest({
      body: JSON.stringify({ action: 'not-a-branch' }),
      headers: { 'sec-fetch-site': 'same-origin' },
      url: '/__made-solid/codex-branch',
    }),
    rejectedResponse,
    () => undefined,
  );
  await rejectedResponse.finished;
  assert.equal(rejectedResponse.statusCode, 400);
  assert.match(rejectedResponse.body, /valid branch action/);

  const notificationResponse = pluginResponse();
  await middleware(
    pluginRequest({
      headers: { 'sec-fetch-site': 'same-origin' },
      method: 'GET',
      url: '/__made-solid/codex-notifications',
    }),
    notificationResponse,
    () => undefined,
  );
  await notificationResponse.finished;
  assert.equal(notificationResponse.statusCode, 200);
  assert.equal(JSON.parse(notificationResponse.body).status, 'ready');
  assert.match(JSON.parse(notificationResponse.body).publicKey, /^[A-Za-z0-9_-]{80,100}$/);
});

test('Workspace Vite intercepts Codex branches before the runtime fallback proxy', async () => {
  let fallbackRequests = 0;
  const fallback = createServer((_request, response) => {
    fallbackRequests += 1;
    response.writeHead(404, { 'Content-Length': '0' });
    response.end();
  });
  const fallbackPort = await listen(fallback);
  const runtimeDataDirectory = await mkdtemp(join(tmpdir(), 'made-solid-workspace-vite-'));
  const previousEnvironment = {
    SITEFORGE_RUNTIME_API_PROXY_ORIGIN: process.env.SITEFORGE_RUNTIME_API_PROXY_ORIGIN,
    SITEFORGE_RUNTIME_DATA_DIR: process.env.SITEFORGE_RUNTIME_DATA_DIR,
    SITEFORGE_STUDIO_WORKSPACE_DIR: process.env.SITEFORGE_STUDIO_WORKSPACE_DIR,
    SITEFORGE_WORKSPACE_DEVELOPMENT: process.env.SITEFORGE_WORKSPACE_DEVELOPMENT,
  };
  process.env.SITEFORGE_RUNTIME_API_PROXY_ORIGIN = `http://127.0.0.1:${fallbackPort}`;
  process.env.SITEFORGE_RUNTIME_DATA_DIR = runtimeDataDirectory;
  process.env.SITEFORGE_STUDIO_WORKSPACE_DIR = new URL('../..', import.meta.url).pathname;
  process.env.SITEFORGE_WORKSPACE_DEVELOPMENT = '1';
  const vite = await createViteServer({
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
    logLevel: 'silent',
    mode: 'development',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });

  try {
    await vite.listen();
    const address = vite.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/__made-solid/codex-branch`, {
      body: JSON.stringify({ action: 'not-a-branch' }),
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'same-origin',
      },
      method: 'POST',
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    assert.match((await response.json()).detail, /valid branch action/);
    assert.equal(fallbackRequests, 0);
  } finally {
    await vite.close();
    await close(fallback);
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
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
    workspaceOrigins: ['https://workspace.madesolid.com.au'],
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
    assert.equal(authenticatedAsset.headers['cache-control'], 'private, no-cache');
    assert.equal(authenticatedAsset.headers['set-cookie'], undefined);
    assert.equal(upstreamHeaders.cookie, undefined);
    assert.equal(upstreamHeaders.origin, undefined);
    assert.equal(upstreamHeaders.referer, undefined);
    assert.equal(upstreamHeaders['x-forwarded-host'], 'workspace.madesolid.com.au');
    assert.equal(upstreamHeaders['x-forwarded-proto'], 'https');

    const optimizedDependency = await httpRequest(
      gatewayPort,
      '/node_modules/.vite/deps/react.js?v=stable-hash',
      { cookie },
    );
    assert.equal(optimizedDependency.status, 200);
    assert.equal(
      optimizedDependency.headers['cache-control'],
      'private, max-age=31536000, immutable',
    );

    const runtimeData = await httpRequest(gatewayPort, '/__made-solid/codex-status', { cookie });
    assert.equal(runtimeData.status, 200);
    assert.equal(runtimeData.headers['cache-control'], 'private, no-store');
  } finally {
    await Promise.all([close(gateway), close(upstream)]);
  }
});

test('Workspace Studio gives native Codex branches time to preserve a long conversation', async () => {
  const upstream = createServer((incoming, response) => {
    if (incoming.url !== '/__made-solid/codex-branch') {
      response.writeHead(404).end();
      return;
    }
    setTimeout(() => {
      response.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ready', thread: { id: 'thread-fork-1' } }));
    }, 80);
  });
  const upstreamPort = await listen(upstream);
  const gateway = startWorkspaceStudioGateway({
    codexBranchTimeoutMs: 500,
    ownerUserId,
    port: 0,
    secret,
    studioOrigin: 'https://studio.madesolid.com.au',
    upstreamPort,
    upstreamTimeoutMs: 20,
    workspaceOrigin: 'https://workspace.madesolid.com.au',
    workspaceOrigins: ['https://workspace.madesolid.com.au'],
  });
  await new Promise((resolve) => gateway.once('listening', resolve));
  const gatewayPort = gateway.address().port;

  try {
    const token = createWorkspaceStudioToken(secret, ownerUserId, {
      purpose: 'studio-development-session',
    });
    const branch = await httpRequest(
      gatewayPort,
      '/__made-solid/codex-branch',
      {
        accept: 'application/json',
        cookie: `__Host-made-solid-studio-workspace=${encodeURIComponent(token)}`,
        'content-type': 'application/json',
        origin: 'https://workspace.madesolid.com.au',
        'sec-fetch-site': 'same-origin',
      },
      {
        body: JSON.stringify({
          action: 'branch-thread',
          threadId: 'thread-1',
          turnId: 'turn-1',
        }),
        method: 'POST',
      },
    );
    assert.equal(branch.status, 202);
    assert.equal(JSON.parse(branch.body).thread.id, 'thread-fork-1');
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
  assert.match(developmentSupervisor, /SITEFORGE_RUNTIME_DATA_DIR=/);
  assert.match(developmentSupervisor, /SITEFORGE_STUDIO_WORKSPACE_DIR=/);
  assert.match(developmentSupervisor, /SITEFORGE_PROSPECT_WORKSPACES_DIR=/);
  assert.match(developmentSupervisor, /MADE_SOLID_WEBSITE_DIRECTORY=/);
  assert.match(developmentSupervisor, /SITEFORGE_WORKSPACE_DEVELOPMENT=1/);
  assert.match(developmentSupervisor, /--config "\$studio_workspace_directory\/vite\.config\.ts"/);
  assert.doesNotMatch(
    developmentSupervisor,
    /--config "\$application_directory\/vite\.config\.ts"/,
  );
  assert.match(developmentSupervisor, /--host 127\.0\.0\.1/);
  assert.match(developmentSupervisor, /--mode development/);
  assert.doesNotMatch(developmentSupervisor, /--force/);
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
    /workspaceDevelopment[\s\S]*?workspaceCodexBranchPlugin\(\), workspaceHmrHeartbeatPlugin\(\)/,
  );
  assert.match(viteConfiguration, /frame-ancestors 'none'/);
  assert.match(viteConfiguration, /SITEFORGE_RUNTIME_API_PROXY_ORIGIN/);
  assert.match(viteConfiguration, /target: runtimeApiTarget/);
  assert.match(viteConfiguration, /ws: true/);
});
