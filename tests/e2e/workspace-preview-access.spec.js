import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const workspaceOrigin = 'https://workspace.madesolid.com.au';
const capability = 'workspace-capability-for-browser-test';

test('recovers the stable workspace URL through authenticated Studio access', async ({
  context,
  page,
}) => {
  let authenticated = false;
  let accessRequests = 0;

  await page.route('**/__made-solid/workspace-preview-access', async (route) => {
    accessRequests += 1;
    await route.fulfill({
      body: JSON.stringify({
        previewUrl: `${workspaceOrigin}/?access=${capability}`,
        status: 'ready',
      }),
      contentType: 'application/json',
    });
  });
  await context.route(/^https:\/\/workspace\.madesolid\.com\.au(?:\/|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('access') === capability) {
      authenticated = true;
      url.searchParams.delete('access');
      await route.fulfill({
        body: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Made Solid workspace preview</title></head><body><main><h1>Made Solid workspace preview</h1><p>The current development server is ready.</p></main><script>history.replaceState({}, '', ${JSON.stringify(`${url.pathname}${url.search}`)})</script></body></html>`,
        contentType: 'text/html',
        headers: {
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
          location: `http://127.0.0.1:4175/#/workspace-preview-access?path=${encodeURIComponent(returnPath)}`,
        },
      });
      return;
    }
    await route.fulfill({
      body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Made Solid workspace preview</title></head><body><main><h1>Made Solid workspace preview</h1><p>The current development server is ready.</p></main></body></html>',
      contentType: 'text/html',
    });
  });

  await page.goto('/#/workspace-preview-access?path=%2Fstudio%3Fpanel%3Dtesting');
  await expect(page.getByRole('heading', { name: 'Made Solid workspace preview' })).toBeVisible();
  await expect(page).toHaveURL(`${workspaceOrigin}/studio?panel=testing`);
  expect(page.url()).not.toContain(capability);

  authenticated = false;
  await context.clearCookies();
  const accessRequestsBeforeExpiry = accessRequests;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Made Solid workspace preview' })).toBeVisible();
  await expect(page).toHaveURL(`${workspaceOrigin}/studio?panel=testing`);
  expect(accessRequests).toBeGreaterThan(accessRequestsBeforeExpiry);
  expect(page.url()).not.toContain(capability);
  expect(await new AxeBuilder({ page }).analyze()).toMatchObject({ violations: [] });
});
