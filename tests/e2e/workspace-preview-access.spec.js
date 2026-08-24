import { expect, test } from '@playwright/test';

const businessId = 'client-id';
const studioReturn = `/prospects/${businessId}/editing`;

test('moves a legacy client-shell bookmark into the authenticated Development Workspace route', async ({
  page,
}) => {
  let legacyClientAccessRequests = 0;
  let developmentAccessRequests = 0;
  await page.route('**/__made-solid/workspace-preview-access?*', async (route) => {
    legacyClientAccessRequests += 1;
    await route.fulfill({ status: 500, body: 'The legacy endpoint must not be called.' });
  });
  await page.route('**/__made-solid/workspace-development-access', async (route) => {
    developmentAccessRequests += 1;
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
    `/#/workspace-preview-access?path=%2Fclient-shell&return=${encodeURIComponent(studioReturn)}&workspace=lece-client`,
  );

  await expect(
    page.getByRole('heading', { name: 'Development Workspace unavailable' }),
  ).toBeVisible();
  expect(legacyClientAccessRequests).toBe(0);
  expect(developmentAccessRequests).toBe(1);
  expect(page.url()).toContain('#/workspace-development-access?path=');
  const path = new URLSearchParams(page.url().split('?')[1]).get('path');
  expect(path).toBe(`/?__made_solid_route=${encodeURIComponent(`#${studioReturn}`)}`);
  expect(page.url()).not.toContain('workspace=lece-client');
  expect(page.url()).not.toContain('/client-shell');
});

test('falls back to the Workspace prospects list for an invalid legacy return route', async ({
  page,
}) => {
  await page.route('**/__made-solid/workspace-development-access', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ detail: 'Development Workspace is temporarily unavailable.' }),
      contentType: 'application/json',
      status: 503,
    });
  });

  await page.goto(
    '/#/workspace-preview-access?return=https%3A%2F%2Funrelated.example%2Fclient&workspace=lece-client',
  );

  await expect(
    page.getByRole('heading', { name: 'Development Workspace unavailable' }),
  ).toBeVisible();
  const path = new URLSearchParams(page.url().split('?')[1]).get('path');
  expect(path).toBe(`/?__made_solid_route=${encodeURIComponent('#/prospects')}`);
});
