import { expect, test } from '@playwright/test';

const previewOrigin = 'https://preview.madesolid.com.au';
const runId = '12345678-1234-1234-1234-123456789abc';
const token = 'a'.repeat(64);

function studioShellUrl(capability) {
  return `/#/preview?source=${encodeURIComponent(capability)}`;
}

test('hands canonical private preview capabilities to the configured preview host', async ({
  page,
}) => {
  await page.route(`${previewOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      body: `<!doctype html><html><body><h1>Private ${pathname.split('/')[1]} preview</h1></body></html>`,
      contentType: 'text/html',
    });
  });

  for (const capabilityRoute of ['test', 'build', 'site']) {
    const capability = `${previewOrigin}/${capabilityRoute}/${runId}/${token}/`;
    await page.goto(studioShellUrl(capability));
    await expect(page).toHaveURL(capability);
    await expect(
      page.getByRole('heading', { name: `Private ${capabilityRoute} preview` }),
    ).toBeVisible();
  }
});

test('rejects malformed or off-origin private preview capabilities', async ({ page }) => {
  const invalidCapabilities = [
    `https://preview.madesolid.com.au.evil.example/test/${runId}/${token}/`,
    `${previewOrigin}/test/not-a-uuid/${token}/`,
    `${previewOrigin}/test/${runId}/${'a'.repeat(63)}/`,
  ];

  for (const capability of invalidCapabilities) {
    await page.goto(studioShellUrl(capability));
    await expect(page.getByRole('heading', { name: 'Preview unavailable' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/#/preview\\?source='));
  }
});
