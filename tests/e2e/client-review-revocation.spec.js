import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('keeps ready client-review revocation clear and accessible', async ({ page }) => {
  await page.goto('/#/__e2e/client-review-revocation');

  const panel = page.getByTestId('client-preview-publication');
  await expect(panel.getByRole('heading', { name: 'Private client review' })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Open private review' })).toBeVisible();
  const revoke = panel.getByRole('button', { name: 'Revoke review link' });
  await expect(revoke).toBeVisible();
  const revokeBox = await revoke.boundingBox();
  expect(revokeBox?.height).toBeGreaterThanOrEqual(44);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="client-preview-publication"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(panel).toHaveScreenshot('private-client-review-ready.png');

  await revoke.click();
  const dialog = page.getByRole('dialog', { name: 'Revoke this client review?' });
  await expect(dialog).toContainText('Anyone using the current link will lose access');
  await expect(dialog.getByRole('button', { name: 'Revoke review link' })).toBeVisible();
  await expect(dialog).toHaveScreenshot('private-client-review-revoke-dialog.png');

  await dialog.getByRole('button', { name: 'Revoke review link' }).click();
  await expect.poll(() => page.evaluate(() => window.__reviewRevoked)).toBe(true);
});
