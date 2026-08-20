import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('made-solid.email-desk.')) window.localStorage.removeItem(key);
    }
  });
  await page.goto('/#/prospects/business-demo-local-services/email');
  await expect(page.getByRole('heading', { name: 'Client email desk' })).toBeVisible();
});

test('reviews, directly edits and prompts a contextual test reply', async ({ page }, testInfo) => {
  await expect(page.getByText('3 need review')).toBeVisible();
  const firstThread = page.locator('.email-desk__thread').first();
  await firstThread.click();

  await expect(page.getByText('Client context used')).toBeVisible();
  await expect(page.getByText(/Demo Local Services ·/)).toBeVisible();
  await expect(page.getByText('Send unavailable in test mode')).toBeDisabled();

  const reply = page.getByLabel('Reply body');
  await reply.fill(
    'Hi Jordan,\n\nThis is my direct review edit.\n\nKind regards,\nMade Solid Studio',
  );
  await expect(page.getByText('Direct edit saved locally')).toBeVisible();

  await page.getByLabel('Ask AI to edit this draft').fill('Make it softer with no pressure');
  await page.getByRole('button', { name: 'Revise draft' }).click();
  await expect(reply).toHaveValue(/There is no pressure to decide now/);
  await page.getByRole('button', { name: 'Mark reviewed' }).click();
  await expect(page.getByText('Reply marked reviewed')).toBeVisible();
  await expect(page.getByText('2 need review')).toHaveText('2 need review');

  const results = await new AxeBuilder({ page }).include('.email-desk').analyze();
  expect(results.violations).toEqual([]);
  await expect(page).toHaveScreenshot(`client-email-desk-${testInfo.project.name}.png`, {
    animations: 'disabled',
  });
});

test('delivers a dummy inbound email and generates a review alert', async ({ page }) => {
  await page.getByRole('button', { name: 'Add test email' }).click();
  const dialog = page.getByRole('dialog', { name: 'Deliver a test email' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('From name').fill('Alex Example');
  await dialog.getByLabel('From email').fill('alex@dummy-account.example');
  await dialog.getByLabel('Subject').fill('Can we discuss the next step?');
  await dialog
    .getByLabel('Message')
    .fill('I like the preview but need to understand timing before deciding.');
  await dialog.getByRole('button', { name: 'Deliver to test inbox' }).click();

  await expect(page.getByText(/Test email from Alex Example received/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Can we discuss the next step?' })).toBeVisible();
  await expect(page.getByText('Draft v1 · review required')).toBeVisible();
});

test('keeps the long-label email workflow contained at 320px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Client email desk' })).toBeVisible();
  await page.locator('.email-desk__thread').nth(1).click();
  await expect(page.getByText('Send unavailable in test mode')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot('client-email-desk-320-mobile.png', {
    animations: 'disabled',
  });
});
