import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const projects = [
  {
    id: 'studio',
    name: 'Made Solid Studio',
    directory: 'siteforge-os',
    developmentUrl: 'https://dev.studio.madesolid.com.au',
    productionUrl: 'https://studio.madesolid.com.au',
    developmentConfigured: false,
    branch: 'development/urls-and-releases',
    head: '1234567890abcdef1234567890abcdef12345678',
    dirty: true,
    changes: [
      { status: 'M', path: 'src/components/DevelopmentPage.tsx' },
      {
        status: '??',
        path: 'supabase/migrations/20260825190000_development_release_urls_test_package.sql',
      },
    ],
    releases: [
      {
        commit: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
        shortCommit: 'abcdef12',
        title: 'Add versioned development and release surfaces',
        createdAt: '2026-08-25T12:00:00.000Z',
      },
      {
        commit: '1234512345123451234512345123451234512345',
        shortCommit: '12345123',
        title: 'Keep the owner workspace live during Studio updates',
        createdAt: '2026-08-24T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'website',
    name: 'Made Solid website',
    directory: 'made-solid-website',
    developmentUrl: 'https://dev.madesolid.com.au',
    productionUrl: 'https://madesolid.com.au',
    developmentConfigured: false,
    branch: 'main',
    head: 'fedcbafedcbafedcbafedcbafedcbafedcbafedc',
    dirty: false,
    changes: [],
    releases: [
      {
        commit: 'fedcbafedcbafedcbafedcbafedcbafedcbafedc',
        shortCommit: 'fedcba98',
        title: 'Protect the development website from production side effects',
        createdAt: '2026-08-25T11:00:00.000Z',
      },
    ],
  },
];

test.describe.configure({ mode: 'serial' });

async function mockDevelopmentProjects(page) {
  await page.route('**/__made-solid/development-projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ready', projects }),
    });
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  expect(testInfo.project.name in viewports).toBe(true);
  await mockDevelopmentProjects(page);
});

test('shows separate development and production destinations with exact versions', async ({
  page,
}, testInfo) => {
  await page.goto('/#/development');
  await expect(page.getByRole('heading', { name: 'Websites', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { name: 'Made Solid Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Made Solid website' })).toBeVisible();
  await expect(page.getByText('dev.studio.madesolid.com.au')).toBeVisible();
  await expect(page.getByText('studio.madesolid.com.au', { exact: true })).toBeVisible();
  await expect(page.getByText('dev.madesolid.com.au', { exact: true })).toBeVisible();
  await expect(page.getByText('madesolid.com.au', { exact: true })).toBeVisible();
  await expect(page.getByText('Add versioned development and release surfaces')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Promote exact version' }).first()).toBeDisabled();

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow).toEqual({ document: 0, body: 0 });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot(`development-websites-${testInfo.project.name}.png`, {
    fullPage: true,
  });

  if (testInfo.project.name === 'mobile') {
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    await expect(page.getByRole('dialog').getByText('Websites', { exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot('development-navigation-open-375.png');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('keeps the expanded navigation usable at compact mobile size', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Compact navigation is verified once in Chromium.');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#/development');
  await expect(page.getByRole('heading', { name: 'Websites', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).toHaveScreenshot('development-navigation-closed-320.png');
  const trigger = page.getByRole('button', { name: 'Open navigation menu' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Websites', { exact: true })).toBeVisible();
  await expect(dialog).toHaveCSS('overflow-y', 'auto');
  await expect(page).toHaveScreenshot('development-navigation-open-320.png');
});
