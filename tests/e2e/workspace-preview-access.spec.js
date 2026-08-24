import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { workspaceShellDocument } from '../../scripts/workspace-preview-proxy.mjs';

const workspaceOrigin = 'https://workspace.madesolid.com.au';
const capability = 'workspace-capability-for-browser-test';
const directory = 'lece-client';
const studioReturn = '/prospects/client-id/editing';

test('returns an unscoped Workspace bootstrap to Studio without requesting an active client', async ({
  page,
}) => {
  let accessRequests = 0;
  await page.route('**/__made-solid/workspace-preview-access?*', async (route) => {
    accessRequests += 1;
    await route.fulfill({ status: 500, body: 'This endpoint must not be called.' });
  });

  await page.goto('/#/workspace-preview-access');

  await expect(page).toHaveURL(/\/#\/prospects$/);
  expect(accessRequests).toBe(0);
});

test('keeps Workspace top-level, isolated, clean, and bound to the requested client', async ({
  context,
  page,
}, testInfo) => {
  let authenticated = false;
  let accessRequests = 0;
  const requestedDirectories = [];
  const loadedClientResources = new Set();
  let foreignPage;
  let foreignWorkspaceRequests = 0;

  await page.route('**/__made-solid/workspace-preview-access?*', async (route) => {
    accessRequests += 1;
    const requestUrl = new URL(route.request().url());
    requestedDirectories.push(requestUrl.searchParams.get('directory'));
    await route.fulfill({
      body: JSON.stringify({
        directory,
        previewUrl: `${workspaceOrigin}/?access=${capability}`,
        status: 'ready',
      }),
      contentType: 'application/json',
    });
  });
  await context.route(/^https:\/\/workspace\.madesolid\.com\.au(?:\/|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().frame() !== page.mainFrame()) {
      if (foreignPage && route.request().frame().page() === foreignPage) {
        foreignWorkspaceRequests += 1;
      }
      await route.fulfill({ status: 403, body: 'Workspace cannot be framed.' });
      return;
    }
    if (url.searchParams.get('access') === capability) {
      authenticated = true;
      await route.fulfill({
        body: workspaceShellDocument(
          'https://studio.madesolid.com.au',
          url.href,
          directory,
          capability,
          'browser-test-nonce',
          'https://preview.madesolid.com.au',
        ),
        contentType: 'text/html',
        headers: {
          'content-security-policy':
            "default-src 'none'; script-src 'nonce-browser-test-nonce'; style-src 'unsafe-inline'; frame-src https://preview.madesolid.com.au https://studio.madesolid.com.au; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
      });
      return;
    }
    if (!url.searchParams.has('__made_solid_workspace')) {
      await route.fulfill({
        status: 303,
        headers: { location: 'http://127.0.0.1:4175/#/prospects' },
      });
      return;
    }
    if (!authenticated) {
      const returnPath = `${url.pathname}${url.search}`;
      await route.fulfill({
        status: 303,
        headers: {
          location: `http://127.0.0.1:4175/#/workspace-preview-access?path=${encodeURIComponent(returnPath)}&return=${encodeURIComponent(studioReturn)}&workspace=${directory}`,
        },
      });
      return;
    }
    url.searchParams.delete('__made_solid_workspace');
    url.searchParams.delete('__made_solid_return');
    await route.fulfill({
      body: workspaceShellDocument(
        'https://studio.madesolid.com.au',
        url.href,
        directory,
        capability,
        'browser-test-nonce',
        'https://preview.madesolid.com.au',
      ),
      contentType: 'text/html',
      headers: {
        'content-security-policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src https://preview.madesolid.com.au https://studio.madesolid.com.au; frame-ancestors 'none'",
      },
    });
  });
  await context.route(/^https:\/\/preview\.madesolid\.com\.au(?:\/|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.includes(`/${directory}/${capability}/`)) {
      await route.fulfill({ status: 403, body: 'Frame capability missing.' });
      return;
    }
    const frameRoot =
      url.pathname.slice(0, url.pathname.indexOf(`/${directory}/${capability}/`)) +
      `/${directory}/${capability}/`;
    const upstreamPath = url.pathname.slice(frameRoot.length - 1);
    if (upstreamPath === '/_next/static/app.css') {
      loadedClientResources.add('css');
      await route.fulfill({
        body: '#client-runtime { color: rgb(12, 34, 56); }',
        contentType: 'text/css',
      });
      return;
    }
    if (upstreamPath === '/_next/static/app.js') {
      loadedClientResources.add('js');
      await route.fulfill({
        body: "document.querySelector('#client-runtime').dataset.javascript = 'loaded';",
        contentType: 'text/javascript',
      });
      return;
    }
    if (upstreamPath === '/_next/image') {
      loadedClientResources.add('image');
      await route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#dfff00"/></svg>',
        contentType: 'image/svg+xml',
      });
      return;
    }
    await route.fulfill({
      body: `<!doctype html><html lang="en"><head><base href="${frameRoot}">
        <meta name="referrer" content="no-referrer" />
        <link rel="stylesheet" href="_next/static/app.css" />
        <script defer src="_next/static/app.js"></script>
      </head><body><main><h1>LECE live website</h1><p id="isolation"></p><p id="client-runtime">Client runtime</p><img alt="Client runtime asset" src="_next/image?url=%2Fhero.jpg&w=640&q=75" /></main><script>
        let isolated = false;
        try { void window.parent.document.body; } catch { isolated = true; }
        document.querySelector('#isolation').textContent = isolated ? 'Client frame is isolated' : 'Client frame escaped';
      </script></body></html>`,
      contentType: 'text/html',
      headers: {
        'content-security-policy': `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self'; frame-ancestors ${workspaceOrigin}`,
      },
    });
  });
  await context.route(
    /^https:\/\/studio\.madesolid\.com\.au\/__made-solid\/workspace-codex(?:\?|$)/,
    async (route) => {
      await route.fulfill({
        body: `<!doctype html><html lang="en"><body>
          <style>
            :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
            body { margin: 0; padding: 12px; color: #f1f1f1; background: #1f1f1f; }
            button { min-width: 44px; min-height: 44px; float: right; border: 0; border-radius: 999px; color: #111; background: #dfff00; font-weight: 800; }
            section { clear: both; padding-top: 12px; }
            h1 { font-size: 1.2rem; } h2 { margin-bottom: 4px; font-size: 1rem; } p { color: #bdbdb7; }
          </style>
          <button type="button" id="open">Chat with Codex</button>
          <section hidden id="panel" aria-label="Chat workspace scope">
            <h1>LECE Client website editor</h1>
            <p>Editing only LECE Client</p>
            <h2>This client</h2><p>LECE website changes</p>
            <h2>Universal Studio</h2><p>General Studio planning</p>
          </section>
          <script>
            const openPanel = () => {
              document.querySelector('#panel').hidden = false;
              parent.postMessage({ source: 'made-solid-codex-panel', open: true }, 'https://workspace.madesolid.com.au');
            };
            document.querySelector('#open').addEventListener('click', openPanel);
            window.addEventListener('message', (event) => {
              if (event.source === parent && event.data?.source === 'made-solid-codex-host' && event.data.action === 'open') openPanel();
            });
          </script>
        </body></html>`,
        contentType: 'text/html',
        headers: {
          'content-security-policy':
            "script-src 'unsafe-inline'; frame-ancestors https://workspace.madesolid.com.au",
        },
      });
    },
  );

  await page.goto(
    `/#/workspace-preview-access?path=%2Fstudio%3Fpanel%3Dtesting&return=${encodeURIComponent(studioReturn)}&workspace=${directory}`,
  );
  await expect(page.getByText('Made Solid Workspace', { exact: true })).toBeVisible();
  await expect(page.getByText('Instant live development')).toBeVisible();
  await expect(page.getByText('Codex scoped to this website')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Exit to Studio' })).toBeVisible();
  await page.evaluate(({ cleanUrl }) => window.history.replaceState({}, '', cleanUrl), {
    cleanUrl: `${workspaceOrigin}/studio?panel=testing&__made_solid_workspace=${directory}&__made_solid_return=${encodeURIComponent(studioReturn)}`,
  });
  await expect(page).toHaveURL(new RegExp(`^${workspaceOrigin.replaceAll('.', '\\.')}/studio`));
  const preview = page.frameLocator('iframe[title="Client website live preview"]');
  await expect(preview.getByRole('heading', { name: 'LECE live website' })).toBeVisible();
  await expect(preview.getByText('Client frame is isolated')).toBeVisible();
  await expect(preview.locator('#client-runtime')).toHaveAttribute('data-javascript', 'loaded');
  await expect(preview.locator('#client-runtime')).toHaveCSS('color', 'rgb(12, 34, 56)');
  await expect(preview.getByRole('img', { name: 'Client runtime asset' })).toHaveJSProperty(
    'complete',
    true,
  );
  expect([...loadedClientResources].sort()).toEqual(['css', 'image', 'js']);
  const codex = page.frameLocator('iframe[title="Client website Codex editor"]');
  const codexSurface = page.getByRole('button', { name: 'Codex', exact: true });
  await codexSurface.focus();
  await page.keyboard.press('Enter');
  await expect(codex.getByRole('heading', { name: 'This client' })).toBeVisible();
  await expect(codex.getByRole('heading', { name: 'Universal Studio' })).toBeVisible();
  await expect(codex.getByText('Editing only LECE Client')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot('workspace-client-codex-open.png');
  expect(page.url()).not.toContain(capability);
  expect(requestedDirectories).toEqual([directory]);

  foreignPage = await context.newPage();
  await foreignPage.route('https://unrelated.example/**', async (route) => {
    await route.fulfill({
      body: '<!doctype html><html lang="en"><body><iframe title="Unrelated client frame" src="https://workspace.madesolid.com.au/"></iframe></body></html>',
      contentType: 'text/html',
    });
  });
  await foreignPage.goto('https://unrelated.example/');
  await expect.poll(() => foreignWorkspaceRequests).toBeGreaterThan(0);
  await expect(
    foreignPage
      .frameLocator('iframe[title="Unrelated client frame"]')
      .getByRole('heading', { name: 'LECE live website' }),
  ).toHaveCount(0);
  await foreignPage.close();
  foreignPage = undefined;

  authenticated = false;
  await context.clearCookies();
  const accessRequestsBeforeExpiry = accessRequests;
  await page.reload();
  await expect(preview.getByRole('heading', { name: 'LECE live website' })).toBeVisible();
  await page.evaluate(({ cleanUrl }) => window.history.replaceState({}, '', cleanUrl), {
    cleanUrl: `${workspaceOrigin}/studio?panel=testing&__made_solid_workspace=${directory}&__made_solid_return=${encodeURIComponent(studioReturn)}`,
  });
  expect(accessRequests).toBeGreaterThan(accessRequestsBeforeExpiry);
  expect(requestedDirectories.at(-1)).toBe(directory);
  expect(page.url()).not.toContain(capability);
  expect(await new AxeBuilder({ page }).analyze()).toMatchObject({ violations: [] });

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    await expect(codex.getByRole('heading', { name: 'This client' })).toBeVisible();
    await expect(page).toHaveScreenshot('workspace-client-codex-open-320.png');
  }

  await page.getByRole('link', { name: 'Exit to Studio' }).click();
  await expect(page).toHaveURL(new RegExp(`#${studioReturn}$`));

  await page.goto(workspaceOrigin);
  await expect(page).toHaveURL(/\/#\/prospects$/);
  await expect(page.getByText('LECE live website')).toHaveCount(0);
});
