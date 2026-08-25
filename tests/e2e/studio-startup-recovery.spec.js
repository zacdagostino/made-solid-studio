import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('shows a usable recovery screen instead of a white page when modules fail', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('made-solid-studio-startup-recovery', 'retrying');
  });
  await page.route(/\/assets\/index-[^/]+\.js$/, (route) => route.abort('failed'));

  await page.goto('/');

  const status = page.getByRole('status');
  const reload = page.getByRole('link', { name: 'Reload development Studio' });
  await expect(status).toContainText('Your source and saved work are safe');
  await expect(reload).toBeVisible();
  await expect(reload).toHaveAttribute('href', '');
  expect((await reload.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page }).include('#studio-startup-shell').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot(`studio-startup-recovery-${testInfo.project.name}.png`, {
    animations: 'disabled',
  });
});
