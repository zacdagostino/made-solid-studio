import { expect, test } from '@playwright/test';
import { basename, resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createWorkspacePreviewToken } from '../../scripts/workspace-preview-access.mjs';

const secret = 'workspace-codex-browser-transform-secret-32-characters';
const workspaceRoot = resolve(process.cwd());
const directory = basename(workspaceRoot);
let devServer;
let devOrigin;

test.beforeAll(async () => {
  process.env.SITEFORGE_STUDIO_WORKSPACE_DIR = workspaceRoot;
  process.env.SITEFORGE_WORKSPACE_PREVIEW_SECRET = secret;
  process.env.VITE_SITEFORGE_STORAGE = 'local';
  devServer = await createViteServer({
    configFile: resolve(workspaceRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0 },
  });
  await devServer.listen();
  const address = devServer.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not expose a test port.');
  devOrigin = `http://localhost:${address.port}`;
});

test.afterAll(async () => {
  await devServer?.close();
});

test('renders the real transformed Workspace Codex document and keeps normal Studio non-frameable', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to Codex.',
        messages: [],
        activities: [],
        agents: [],
        models: [],
        threads: [],
        queuedCount: 0,
        queuedMessages: [],
      }),
    });
  });

  const token = createWorkspacePreviewToken(directory, secret);
  const response = await page.goto(
    `${devOrigin}/__made-solid/workspace-codex?access=${encodeURIComponent(token)}&workspace=${encodeURIComponent(directory)}#/codex-panel?workspace=${encodeURIComponent(directory)}`,
  );
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain('access=');
  await expect(page).toHaveTitle(`${directory.replace(/[._-]+/g, ' ')} Codex editor`);
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
  expect(await page.locator('#root').evaluate((root) => root.childElementCount)).toBeGreaterThan(0);
  expect(pageErrors).not.toContain(
    "@vitejs/plugin-react can't detect preamble. Something is wrong.",
  );
  expect(response?.headers()['content-security-policy']).toBe(
    "frame-ancestors https://workspace.madesolid.com.au; base-uri 'none'; form-action 'none'",
  );

  const normalStudio = await page.request.get(`${devOrigin}/`);
  expect(normalStudio.headers()['content-security-policy']).not.toContain(
    'workspace.madesolid.com.au',
  );
});
