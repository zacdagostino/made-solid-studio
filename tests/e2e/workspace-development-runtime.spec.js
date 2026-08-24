import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkspaceStudioToken } from '../../scripts/workspace-preview-access.mjs';
import { startWorkspaceStudioGateway } from '../../scripts/workspace-studio-gateway.mjs';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const viteBin = join(projectRoot, 'node_modules/vite/bin/vite.js');
const viteConfig = join(projectRoot, 'vite.config.ts');
const ownerUserId = '11111111-1111-4111-8111-111111111111';
const secret = 'workspace-runtime-browser-secret-longer-than-thirty-two-characters';

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an available port.');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForUrl(url, processError) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processError.value) throw processError.value;
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function settlesWithin(promise, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      promise.then(() => true),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function stopChildProcess(child, exitPromise) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  if (await settlesWithin(exitPromise, 2_000)) return;
  child.kill('SIGKILL');
  await settlesWithin(exitPromise, 2_000);
}

function appSource(label) {
  return `import React from 'react';
export function App() { return <main><h1>Workspace Studio sentinel</h1><p>${label}</p></main>; }
`;
}

test('keeps a hash route while authenticated Vite HMR updates through the Workspace gateway', async ({
  page,
}) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'made-solid-workspace-hmr-'));
  const sourcePath = join(fixtureRoot, 'src/main.tsx');
  await mkdir(dirname(sourcePath), { recursive: true });
  await symlink(join(projectRoot, 'node_modules'), join(fixtureRoot, 'node_modules'), 'dir');
  await writeFile(
    join(fixtureRoot, 'index.html'),
    `<!doctype html><html><body><div id="root"></div><script>window.__workspaceLoads=(window.__workspaceLoads||0)+1</script><script type="module" src="/src/main.tsx"></script></body></html>`,
  );
  await writeFile(
    sourcePath,
    `import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
if (import.meta.hot) {
  import.meta.hot.accept('./App', (module) => module && root.render(<module.App />));
}
`,
  );
  const appPath = join(fixtureRoot, 'src/App.tsx');
  await writeFile(appPath, appSource('before HMR'));

  const vitePort = await availablePort();
  const processError = { value: undefined };
  const vite = spawn(
    process.execPath,
    [
      viteBin,
      '--config',
      viteConfig,
      '--mode',
      'development',
      '--force',
      '--host',
      '127.0.0.1',
      '--port',
      String(vitePort),
      '--strictPort',
    ],
    {
      cwd: fixtureRoot,
      env: {
        PATH: process.env.PATH,
        SITEFORGE_PUBLIC_ORIGIN: 'https://workspace.madesolid.com.au',
        SITEFORGE_RUNTIME_API_PROXY_ORIGIN: 'http://127.0.0.1:65534',
        SITEFORGE_WORKSPACE_DEVELOPMENT: '1',
        SITEFORGE_WORKSPACE_PREVIEW_ORIGIN: 'https://workspace.madesolid.com.au',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  const viteExit = once(vite, 'exit');
  let viteError = '';
  vite.stderr.setEncoding('utf8');
  vite.stderr.on('data', (chunk) => {
    viteError += chunk;
  });
  vite.once('exit', (code) => {
    if (code && code !== 0) {
      processError.value = new Error(`Workspace Vite exited with ${code}: ${viteError}`);
    }
  });

  let gateway;
  try {
    await waitForUrl(`http://127.0.0.1:${vitePort}/`, processError);
    gateway = startWorkspaceStudioGateway({
      ownerUserId,
      port: 0,
      secret,
      studioOrigin: 'https://studio.madesolid.com.au',
      upstreamPort: vitePort,
      workspaceOrigin: 'https://workspace.madesolid.com.au',
    });
    if (!gateway.listening) await once(gateway, 'listening');
    const address = gateway.address();
    if (!address || typeof address === 'string') throw new Error('Expected a Workspace gateway.');
    const gatewayOrigin = `http://localhost:${address.port}`;
    const exchange = createWorkspaceStudioToken(secret, ownerUserId, { lifetimeMs: 120_000 });
    await page.goto(
      `${gatewayOrigin}/?access=${encodeURIComponent(exchange)}#/prospects/client-id/editing`,
    );
    await expect(page.getByRole('heading', { name: 'Workspace Studio sentinel' })).toBeVisible();
    await expect(page.getByText('before HMR')).toBeVisible();
    await expect(page).toHaveURL(/#\/prospects\/client-id\/editing$/);
    expect(await page.evaluate(() => window.__workspaceLoads)).toBe(1);

    await writeFile(appPath, appSource('after HMR'));
    await expect(page.getByText('after HMR')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/#\/prospects\/client-id\/editing$/);
    expect(await page.evaluate(() => window.__workspaceLoads)).toBe(1);
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    await stopChildProcess(vite, viteExit);
    if (gateway) await new Promise((resolve) => gateway.close(resolve));
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});
