import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';
import { preparePreviewHtml, startPreviewHost } from '../../preview-host/server.mjs';

const runId = '12345678-1234-1234-1234-123456789abc';
const token = 'b'.repeat(64);
const runFile = promisify(execFile);

function json(response, value) {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

function createMockSupabase() {
  const siteFiles = new Set([
    'index.html',
    'about/index.html',
    '_next/static/app.js',
    'assets/site.css',
  ]);
  return createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/rest/v1/builder_preview_access') {
      json(response, [{ expires_at: '2999-01-01T00:00:00.000Z', preview_mode: 'ready' }]);
      return;
    }
    if (url.pathname === '/rest/v1/builder_runs') {
      json(response, [{ organization_id: 'organisation', status: 'ready' }]);
      return;
    }
    if (url.pathname === '/rest/v1/builder_artifacts') {
      const storagePath = url.searchParams.get('storage_path')?.replace(/^eq\./, '') ?? '';
      const relativePath = storagePath.split('/site/')[1] ?? '';
      json(response, siteFiles.has(relativePath) ? [{ id: relativePath }] : []);
      return;
    }
    if (url.pathname.includes('/storage/v1/object/authenticated/siteforge-artifacts/')) {
      const relativePath = decodeURIComponent(url.pathname).split('/site/')[1] ?? '';
      if (relativePath === 'index.html') {
        response.end(`<!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Visitor preview</title>
              <link rel="stylesheet" href="/assets/site.css">
              <script src="/_next/static/app.js" defer></script>
            </head>
            <body>
              <header>
                <button aria-expanded="false" id="menu" type="button">Menu</button>
                <nav aria-label="Primary"><a href="/about/">About</a></nav>
              </header>
              <main><h1>Visitor preview</h1><p id="runtime-status">Waiting for runtime</p></main>
            </body>
          </html>`);
        return;
      }
      if (relativePath === 'about/index.html') {
        response.end(`<!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>About</title>
              <link rel="stylesheet" href="/assets/site.css">
            </head>
            <body><main><h1>About this visitor preview</h1><a href="/">Home</a></main></body>
          </html>`);
        return;
      }
      if (relativePath === '_next/static/app.js') {
        response.writeHead(200, { 'content-type': 'text/javascript' });
        response.end(`
          document.querySelector('#runtime-status').textContent = 'Runtime ready';
          document.querySelector('#menu').addEventListener('click', (event) => {
            const button = event.currentTarget;
            button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'));
          });
        `);
        return;
      }
      if (relativePath === 'assets/site.css') {
        response.writeHead(200, { 'content-type': 'text/css' });
        response.end(`
          * { box-sizing: border-box; }
          body { margin: 0; color: #171717; background: #fff; font: 1rem/1.5 system-ui; }
          header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; }
          button, a { min-height: 44px; }
          button { padding: .5rem 1rem; }
          nav a { display: inline-flex; align-items: center; }
          main { width: min(100% - 2rem, 64rem); margin-inline: auto; padding-block: 3rem; }
        `);
        return;
      }
    }
    response.writeHead(404).end();
  });
}

async function filesBelow(directory, relativeDirectory = '') {
  const entries = await readdir(join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = [relativeDirectory, entry.name].filter(Boolean).join('/');
    if (entry.isDirectory()) files.push(...(await filesBelow(directory, relativePath)));
    if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function compileInteractiveNextFixture() {
  const foundationDirectory = join(process.cwd(), 'worker/builder-template');
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'siteforge-private-preview-'));
  await cp(foundationDirectory, fixtureDirectory, {
    filter(source) {
      const [firstSegment] = relative(foundationDirectory, source).split('/');
      return !['.next', 'node_modules', 'out'].includes(firstSegment);
    },
    recursive: true,
  });
  await symlink(join(foundationDirectory, 'node_modules'), join(fixtureDirectory, 'node_modules'));
  await Promise.all([
    mkdir(join(fixtureDirectory, 'public'), { recursive: true }),
    mkdir(join(fixtureDirectory, 'src/components/site'), { recursive: true }),
  ]);
  await Promise.all([
    copyFile(
      join(process.cwd(), 'tests/fixtures/private-preview-next-page.tsx'),
      join(fixtureDirectory, 'src/app/page.tsx'),
    ),
    copyFile(
      join(process.cwd(), 'tests/fixtures/private-preview-next-navigation.tsx'),
      join(fixtureDirectory, 'src/components/site/private-preview-navigation.tsx'),
    ),
    writeFile(
      join(fixtureDirectory, 'public/made-solid-codex-bridge.js'),
      '/* The production builder stages the authenticated workspace bridge here. */\n',
    ),
  ]);
  await runFile('npm', ['run', 'build'], {
    cwd: fixtureDirectory,
    env: { ...process.env, MADE_SOLID_STUDIO_ORIGIN: '' },
  });
  return {
    outputDirectory: join(fixtureDirectory, 'out'),
    remove: () => rm(fixtureDirectory, { force: true, recursive: true }),
  };
}

test('serves a private build as an interactive visitor website', async ({ page }) => {
  const mockSupabase = createMockSupabase();
  mockSupabase.listen(0, '127.0.0.1');
  await once(mockSupabase, 'listening');
  const mockAddress = mockSupabase.address();
  if (!mockAddress || typeof mockAddress === 'string') throw new Error('Mock API did not start.');

  const previewServer = startPreviewHost({
    port: 0,
    publicOrigin: undefined,
    serviceRoleKey: 'server-only-test-key',
    supabaseUrl: `http://127.0.0.1:${mockAddress.port}`,
  });
  if (!previewServer.listening) await once(previewServer, 'listening');
  const previewAddress = previewServer.address();
  if (!previewAddress || typeof previewAddress === 'string') {
    throw new Error('Preview host did not start.');
  }

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto(`http://127.0.0.1:${previewAddress.port}/site/${runId}/${token}/`);
    await expect(page).toHaveTitle('Visitor preview');
    await expect(page.getByRole('heading', { name: 'Visitor preview' })).toBeVisible();
    await expect(page.getByText('Runtime ready')).toBeVisible();

    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('heading', { name: 'About this visitor preview' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/site/${runId}/${token}/about/$`));
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await Promise.all([
      new Promise((resolve) => previewServer.close(resolve)),
      new Promise((resolve) => mockSupabase.close(resolve)),
    ]);
  }
});

test('hydrates the compiled Next runtime inside the fallback preview frame', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'The runtime path is shared across viewports.');
  test.setTimeout(90_000);
  const fixture = await compileInteractiveNextFixture();
  const previewRoot = `https://preview-test.supabase.co/functions/v1/siteforge-preview/${runId}/${token}/`;
  const siteFiles = new Set(await filesBelow(fixture.outputDirectory));
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const sourceUrl = message.location().url;
      browserErrors.push(sourceUrl ? `${message.text()} (${sourceUrl})` : message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.stack ?? error.message));
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        account: null,
        agents: [],
        defaultEffort: 'medium',
        defaultModel: '',
        detail: 'Codex is not needed by the isolated preview fixture.',
        messages: [],
        models: [],
        queuedCount: 0,
        queuedMessages: [],
        status: 'unavailable',
        thread: null,
        threads: [],
      }),
      contentType: 'application/json',
    });
  });
  await page.route('https://preview-test.supabase.co/made-solid-codex-bridge.js', async (route) => {
    await route.fulfill({
      body: '/* Authenticated workspace bridge staged by the production builder. */\n',
      contentType: 'text/javascript',
    });
  });
  await page.route(`${previewRoot}**`, async (route) => {
    const url = new URL(route.request().url());
    const relativePath = url.pathname.slice(new URL(previewRoot).pathname.length) || 'index.html';
    if (url.searchParams.get('render') === 'srcdoc') {
      const html = preparePreviewHtml(
        String(await readFile(join(fixture.outputDirectory, 'index.html'))),
        previewRoot,
      );
      await route.fulfill({
        body: JSON.stringify({ html }),
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
      });
      return;
    }
    if (!siteFiles.has(relativePath)) {
      await route.fulfill({ status: 404 });
      return;
    }
    await route.fulfill({
      body: await readFile(join(fixture.outputDirectory, relativePath)),
      headers: { 'access-control-allow-origin': '*' },
    });
  });

  try {
    await page.goto(`/#/preview?source=${encodeURIComponent(previewRoot)}`);
    const preview = page.frameLocator('.private-preview-frame');
    await expect(
      preview.getByRole('heading', { name: 'Interactive private preview' }),
    ).toBeVisible();
    await expect(preview.locator('html')).toHaveClass(/sf-runtime/);
    await expect(preview.locator('main h1')).toHaveAttribute('data-sf-reveal', 'true');
    await expect(preview.locator('main h1')).toHaveClass(/is-visible/);

    const trigger = preview.locator('[data-siteforge-menu-trigger]');
    await expect(trigger).toHaveAccessibleName('Open navigation');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAccessibleName('Close navigation');
    await expect(preview.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    expect(browserErrors).toEqual([]);
  } finally {
    await fixture.remove();
  }
});
