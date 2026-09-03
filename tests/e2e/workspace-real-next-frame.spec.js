import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { join, relative } from 'node:path';
import {
  attachPreviewHostUpgradeHandler,
  previewHostRequestListener,
} from '../../preview-host/server.mjs';
import { createWorkspacePreviewToken } from '../../scripts/workspace-preview-access.mjs';
import { workspaceShellDocument } from '../../scripts/workspace-preview-proxy.mjs';

const secret = 'real-next-browser-secret-longer-than-thirty-two-characters';

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

async function freePort() {
  const reservation = createHttpServer();
  const port = await listen(reservation);
  await closeServer(reservation);
  return port;
}

async function waitForNext(port, child) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`The real Next fixture exited before startup.\n${child.__testOutput || ''}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}`);
      if (response.ok) return;
    } catch {
      // Next is still compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The real Next fixture did not start.');
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

test('executes and hot-reloads a real Next client inside the opaque Workspace frame', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One real Next browser covers runtime semantics.');
  test.setTimeout(120_000);

  const fixtureRoot = await mkdtemp(join(process.cwd(), 'worker/.test-real-next-frame-'));
  const templateRoot = join(process.cwd(), 'worker/builder-template');
  const appRoot = join(fixtureRoot, 'client');
  await cp(templateRoot, appRoot, {
    filter(source) {
      const [firstSegment] = relative(templateRoot, source).split('/');
      return !['.next', 'node_modules', 'out'].includes(firstSegment);
    },
    recursive: true,
  });
  await symlink(join(templateRoot, 'node_modules'), join(appRoot, 'node_modules'));
  const pagePath = join(appRoot, 'src/app/page.tsx');
  const pageSource = (heading) => `import Link from 'next/link';
import { RuntimeProof } from './runtime-proof';

export default function Page() {
  return <main className="runtime-proof"><h1>${heading}</h1><RuntimeProof /><Link href="/contact/">Contact</Link></main>;
}
`;
  await mkdir(join(appRoot, 'src/app/contact'), { recursive: true });
  await Promise.all([
    writeFile(pagePath, pageSource('Real Next workspace')),
    writeFile(
      join(appRoot, 'src/app/contact/page.tsx'),
      `import Link from 'next/link';
export default function ContactPage() {
  return <main><h1>Real Next contact</h1><Link href="/">Home</Link></main>;
}
`,
    ),
    writeFile(
      join(appRoot, 'src/app/runtime-proof.tsx'),
      `'use client';
import { useEffect, useState } from 'react';
export function RuntimeProof() {
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.nextHydrated = 'true';
    setHydrated(true);
  }, []);
  return <button data-runtime-proof type="button" disabled={!hydrated} onClick={() => setCount((value) => value + 1)}>Hydrated clicks: {count}</button>;
}
`,
    ),
  ]);
  const nextPort = await freePort();
  const next = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(nextPort),
    ],
    {
      cwd: appRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  next.__testOutput = '';
  for (const stream of [next.stdout, next.stderr]) {
    stream.on('data', (chunk) => {
      next.__testOutput += chunk;
    });
  }

  const keyPath = join(fixtureRoot, 'localhost-key.pem');
  const certificatePath = join(fixtureRoot, 'localhost-cert.pem');
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
  const tls = { cert: await readFile(certificatePath), key: await readFile(keyPath) };
  const activeWorkspacePreviewPath = join(fixtureRoot, 'active.json');
  await writeFile(
    activeWorkspacePreviewPath,
    JSON.stringify({ directory: 'real-next-client', port: nextPort }),
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
  const token = createWorkspacePreviewToken('real-next-client', secret);
  const workspace = createHttpsServer(tls, (request, response) => {
    const nonce = 'real-next-shell-nonce';
    response.writeHead(200, {
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src ${previewOrigin} https://studio.madesolid.com.au; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(
      workspaceShellDocument(
        'https://studio.madesolid.com.au',
        request.url || '/',
        'real-next-client',
        token,
        nonce,
        previewOrigin,
      ),
    );
  });
  const workspacePort = await listen(workspace);
  workspaceOrigin = `https://localhost:${workspacePort}`;
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const webSockets = [];
  const pageErrors = [];
  const page = await context.newPage();
  page.on('websocket', (socket) => webSockets.push(socket.url()));
  page.on('pageerror', (error) => pageErrors.push(error));
  try {
    await waitForNext(nextPort, next);
    await page.goto(workspaceOrigin);
    const frame = page.frameLocator('iframe.client-preview');
    await expect(frame.getByRole('heading', { name: 'Real Next workspace' })).toBeVisible();
    await expect
      .poll(() => frame.locator('body').evaluate(() => window.next?.version))
      .toMatch(/^\d+\./);
    await expect(frame.locator('html')).toHaveAttribute('data-next-hydrated', 'true');
    const button = frame.getByRole('button', { name: 'Hydrated clicks: 0' });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(frame.getByRole('button', { name: 'Hydrated clicks: 1' })).toBeVisible();
    await frame.getByRole('link', { name: 'Contact' }).click();
    await expect(frame.getByRole('heading', { name: 'Real Next contact' })).toBeVisible();
    const contactFrame = page.frames().find((candidate) => candidate.url().includes('/contact/'));
    expect(contactFrame?.url()).toContain(
      `/__made-solid/workspace-frame/real-next-client/${token}/contact/`,
    );
    await frame.getByRole('link', { name: 'Home' }).click();
    await expect(frame.getByRole('heading', { name: 'Real Next workspace' })).toBeVisible();
    await expect
      .poll(() =>
        webSockets.some((url) =>
          url.startsWith(
            `${previewOrigin.replace(/^https:/, 'wss:')}/__made-solid/workspace-frame/real-next-client/${token}/_next/webpack-hmr`,
          ),
        ),
      )
      .toBe(true);
    await expect(frame.locator('main')).toHaveScreenshot('workspace-real-next-client.png');

    await writeFile(pagePath, pageSource('Real Next hot update'));
    await expect(frame.getByRole('heading', { name: 'Real Next hot update' })).toBeVisible({
      timeout: 20_000,
    });
    const refreshedButton = frame.getByRole('button', { name: 'Hydrated clicks: 0' });
    await expect(refreshedButton).toBeEnabled();
    await refreshedButton.click();
    await expect(frame.getByRole('button', { name: 'Hydrated clicks: 1' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
    await Promise.all([closeServer(workspace), closeServer(preview), stopChild(next)]);
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});
