import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const businessId = 'business-demo-local-services';
const directory = 'demo-local-services';
const editingHash = `#/prospects/${businessId}/editing`;
const clientPreviewUrl = `https://preview.madesolid.com.au/__made-solid/workspace-frame/${directory}/browser-capability/`;

async function mockDevelopmentWorkspace(page) {
  await page.addInitScript(() => {
    window.__MADE_SOLID_STUDIO_SURFACE__ = 'development';
  });
  await page.route('**/__made-solid/workspace-preview-access?*', async (route) => {
    const request = new URL(route.request().url());
    expect(request.searchParams.get('directory')).toBe(directory);
    await route.fulfill({
      body: JSON.stringify({
        clientPreviewUrl,
        directory,
        status: 'ready',
      }),
      contentType: 'application/json',
    });
  });
  await page.route(`${clientPreviewUrl}**`, async (route) => {
    await route.fulfill({
      body: `<!doctype html><html lang="en"><head><style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: sans-serif; color: #f7f7f4; background: #172240; }
        main { width: min(720px, calc(100% - 48px)); }
        p { color: #cbd5e1; line-height: 1.6; }
      </style></head><body><main><p>Demo Local Services</p><h1>Live client website</h1><p>The exact client preview remains isolated inside Made Solid Workspace.</p></main></body></html>`,
      contentType: 'text/html',
    });
  });
}

async function openDevelopmentEditor(page) {
  await mockDevelopmentWorkspace(page);
  await page.goto(`/${editingHash}`);
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.locator('.development-surface-badge:visible')).toBeVisible();
  await expect(page.getByTestId('client-development-editor')).toBeVisible();
  await expect(
    page
      .frameLocator(`iframe[title="Demo Local Services live website preview"]`)
      .getByRole('heading', {
        name: 'Live client website',
      }),
  ).toBeVisible();
}

test('bare Workspace opens Studio without restoring a selected client', async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    ({ storedHash }) => {
      window.__MADE_SOLID_STUDIO_SURFACE__ = 'development';
      window.localStorage.setItem('siteforge-os.last-route', storedHash);
    },
    { storedHash: editingHash },
  );

  await page.goto('/');

  await expect(page).toHaveURL(/\/#\/prospects$/);
  await expect(page.locator('.development-surface-badge:visible')).toBeVisible();
  await expect(page.getByTestId('client-development-editor')).toHaveCount(0);
  if (testInfo.project.name === 'desktop') {
    await expect(
      page.getByRole('navigation', { name: 'Primary navigation' }).first(),
    ).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  }
});

test('keeps the exact client preview and Codex scope inside routed Workspace Studio', async ({
  page,
}, testInfo) => {
  await openDevelopmentEditor(page);

  await expect(page).toHaveURL(new RegExp(`${editingHash.replaceAll('/', '\\/')}$`));
  await expect(
    page.getByRole('heading', { name: 'Demo Local Services live website editor' }),
  ).toBeVisible();
  await expect(page.getByText('Editing only Demo Local Services')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open client Codex' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All prospects' })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(
      page.getByRole('button', { name: 'Workspace section Website editing' }),
    ).toBeVisible();
  } else {
    await expect(page.getByRole('tab', { name: 'Website editing' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  expect(
    (await new AxeBuilder({ page }).exclude('.client-development-editor__surface iframe').analyze())
      .violations,
  ).toEqual([]);

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${editingHash.replaceAll('/', '\\/')}$`));
  await expect(page.getByTestId('client-development-editor')).toBeVisible();

  const editor = page.getByTestId('client-development-editor');
  await editor.scrollIntoViewIfNeeded();
  await expect(editor).toHaveScreenshot('workspace-development-client-editor.png');

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(editor).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(editor).toHaveScreenshot('workspace-development-client-editor-320.png');
  }
});

test('production links the exact client route into Development Workspace', async ({ page }) => {
  await page.goto(`/${editingHash}`);
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const developmentLink = page.getByRole('link', { name: 'Open in Development Workspace' }).first();
  await expect(developmentLink).toHaveAttribute(
    'href',
    `https://dev.studio.madesolid.com.au/?__made_solid_route=${encodeURIComponent(editingHash)}${editingHash}`,
  );
  await expect(page.getByText('Development · Live source')).toHaveCount(0);
  await expect(page.getByTestId('client-development-editor')).toHaveCount(0);
});

test('exchanges authenticated Studio access through the canonical development origin', async ({
  page,
}) => {
  const returnPath = `/?__made_solid_route=${encodeURIComponent(editingHash)}`;
  let workspaceRequestUrl = '';
  await page.route('**/__made-solid/workspace-development-access', async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        status: 'ready',
        workspaceUrl: 'https://dev.studio.madesolid.com.au/?access=short-lived-exchange',
      }),
      contentType: 'application/json',
    });
  });
  await page.route('https://dev.studio.madesolid.com.au/**', async (route) => {
    workspaceRequestUrl = route.request().url();
    await route.fulfill({
      body: `<!doctype html><html lang="en"><body><h1>Workspace gateway</h1><script>
        const url = new URL(window.location.href);
        const hash = url.searchParams.get('__made_solid_route');
        url.searchParams.delete('__made_solid_route');
        url.searchParams.delete('access');
        if (hash) url.hash = hash.slice(1);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      </script></body></html>`,
      contentType: 'text/html',
    });
  });

  await page.goto(`/#/workspace-development-access?path=${encodeURIComponent(returnPath)}`);

  await expect(page.getByRole('heading', { name: 'Workspace gateway' })).toBeVisible();
  expect(workspaceRequestUrl).toContain('access=short-lived-exchange');
  expect(workspaceRequestUrl).toContain(`__made_solid_route=${encodeURIComponent(editingHash)}`);
  await expect(page).toHaveURL(new RegExp(`${editingHash.replaceAll('/', '\\/')}$`));
  expect(page.url()).not.toContain('access_token');
  expect(page.url()).not.toContain('refresh_token');
});

test('accepts a legacy Workspace exchange during the mixed-version rollout', async ({ page }) => {
  const returnPath = `/?__made_solid_route=${encodeURIComponent(editingHash)}`;
  let workspaceRequestUrl = '';
  await page.route('**/__made-solid/workspace-development-access', async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        status: 'ready',
        workspaceUrl: 'https://workspace.madesolid.com.au/?access=legacy-exchange',
      }),
      contentType: 'application/json',
    });
  });
  await page.route('https://workspace.madesolid.com.au/**', async (route) => {
    workspaceRequestUrl = route.request().url();
    await route.fulfill({
      body: '<!doctype html><html lang="en"><body><h1>Legacy Workspace gateway</h1></body></html>',
      contentType: 'text/html',
    });
  });

  await page.goto(`/#/workspace-development-access?path=${encodeURIComponent(returnPath)}`);

  await expect(page.getByRole('heading', { name: 'Legacy Workspace gateway' })).toBeVisible();
  expect(workspaceRequestUrl).toContain('access=legacy-exchange');
  expect(workspaceRequestUrl).toContain(`__made_solid_route=${encodeURIComponent(editingHash)}`);
  expect(page.url()).not.toContain('access_token');
  expect(page.url()).not.toContain('refresh_token');
});

test('does not persist the one-use Workspace access route over the last Studio location', async ({
  page,
}) => {
  const meaningfulRoute = `#/prospects/${businessId}/editing`;
  await page.goto('/');
  await page.evaluate(
    ({ route }) => window.localStorage.setItem('siteforge-os.last-route', route),
    { route: meaningfulRoute },
  );
  await page.route('**/__made-solid/workspace-development-access', async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        detail: 'Development Workspace is temporarily unavailable.',
        status: 'unavailable',
      }),
      contentType: 'application/json',
      status: 503,
    });
  });

  await page.goto(
    `/#/workspace-development-access?path=${encodeURIComponent(`/?__made_solid_route=${encodeURIComponent(editingHash)}`)}`,
  );

  await expect(
    page.getByRole('heading', { name: 'Development Workspace unavailable' }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('siteforge-os.last-route'))).toBe(
    meaningfulRoute,
  );

  await page.evaluate(() =>
    window.localStorage.setItem(
      'siteforge-os.last-route',
      '#/workspace-development-access?path=%2F',
    ),
  );
  await page.goto('/');
  await expect(page).toHaveURL(/\/#\/today$/);
  await expect(
    page.getByRole('heading', { name: 'Development Workspace unavailable' }),
  ).toHaveCount(0);
});
