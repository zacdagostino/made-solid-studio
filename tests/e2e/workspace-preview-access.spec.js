import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { workspaceShellDocument } from '../../scripts/workspace-preview-proxy.mjs';

const workspaceOrigin = 'https://workspace.madesolid.com.au';
const capability = 'workspace-capability-for-browser-test';
const directory = 'lece-client';
const studioReturn = '/prospects/client-id/editing';

test('keeps Workspace top-level, isolated, clean, and bound to the requested client', async ({
  context,
  page,
}, testInfo) => {
  let authenticated = false;
  let accessRequests = 0;
  const requestedDirectories = [];

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
      await route.fulfill({
        body: `<!doctype html><html lang="en"><body><main><h1>LECE live website</h1><p id="isolation"></p></main><script>
          let isolated = false;
          try { void window.parent.document.body; } catch { isolated = true; }
          document.querySelector('#isolation').textContent = isolated ? 'Client frame is isolated' : 'Client frame escaped';
        </script></body></html>`,
        contentType: 'text/html',
      });
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
        ),
        contentType: 'text/html',
        headers: {
          'content-security-policy':
            "default-src 'none'; script-src 'nonce-browser-test-nonce'; style-src 'unsafe-inline'; frame-src 'self' https://studio.madesolid.com.au; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          'set-cookie':
            '__Host-made-solid-workspace=test-cookie; Path=/; HttpOnly; Secure; SameSite=Strict',
        },
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
      ),
      contentType: 'text/html',
      headers: {
        'content-security-policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self' https://studio.madesolid.com.au; frame-ancestors 'none'",
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
            document.querySelector('#open').addEventListener('click', () => {
              document.querySelector('#panel').hidden = false;
              parent.postMessage({ source: 'made-solid-codex-panel', open: true }, 'https://workspace.madesolid.com.au');
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
  await expect(page.getByRole('link', { name: 'Back to Studio' })).toBeVisible();
  await page.evaluate(({ cleanUrl }) => window.history.replaceState({}, '', cleanUrl), {
    cleanUrl: `${workspaceOrigin}/studio?panel=testing&__made_solid_workspace=${directory}&__made_solid_return=${encodeURIComponent(studioReturn)}`,
  });
  await expect(page).toHaveURL(new RegExp(`^${workspaceOrigin.replaceAll('.', '\\.')}/studio`));
  const preview = page.frameLocator('iframe[title="Client website live preview"]');
  await expect(preview.getByRole('heading', { name: 'LECE live website' })).toBeVisible();
  await expect(preview.getByText('Client frame is isolated')).toBeVisible();
  const codex = page.frameLocator('iframe[title="Client website Codex editor"]');
  await codex.getByRole('button', { name: 'Chat with Codex' }).click();
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
    await codex.getByRole('button', { name: 'Chat with Codex' }).click();
    await expect(codex.getByRole('heading', { name: 'This client' })).toBeVisible();
    await expect(page).toHaveScreenshot('workspace-client-codex-open-320.png');
  }

  await page.getByRole('link', { name: 'Back to Studio' }).click();
  await expect(page).toHaveURL(new RegExp(`#${studioReturn}$`));
});
