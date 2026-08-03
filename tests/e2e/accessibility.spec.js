import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps the Agent Studio accessible before a test prospect is selected', async ({ page }) => {
  await page.goto('/#/agent-studio');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps the Builder agent architecture accessible', async ({ page }) => {
  await page.goto('/#/agent-studio/agent');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storedPackages = JSON.parse(packageRecord.value);
    const publishedPackage = Array.isArray(storedPackages)
      ? storedPackages.find((agentPackage) => agentPackage.status === 'published')
      : storedPackages;
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify([
        publishedPackage,
        {
          ...publishedPackage,
          id: 'agent-package-accessibility-v7',
          version: 7,
          status: 'production_ready',
          basePackageId: publishedPackage.id,
          stagedBehaviourIds: [
            'hero-handoff',
            'brand-introduction',
            'responsive-sidebar',
            'contextual-logo-selection',
            'visual-content-recovery',
          ],
          updatedAt: new Date().toISOString(),
          publishedAt: undefined,
        },
      ]),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Production draft v7' })).toHaveCount(0);
  await expect(
    page.getByRole('heading', {
      name: 'One click. A complete, controlled website build.',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next runtime' }).click();
  await expect(page.locator('.agent-architecture-runtime__detail')).toContainText('Authentication');

  const architectureResults = await new AxeBuilder({ page }).analyze();
  expect(architectureResults.violations).toEqual([]);

  await page.getByRole('button', { name: 'Package versions' }).click();
  await expect(page.getByRole('heading', { name: 'Build package versions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Production draft v7' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: 'Agent architecture' }).click();
  await page.getByRole('button', { name: 'Open architecture map' }).click();
  await expect(
    page.getByRole('dialog', { name: 'How a website build is assembled' }),
  ).toBeVisible();
  const dialogResults = await new AxeBuilder({ page }).analyze();
  expect(dialogResults.violations).toEqual([]);
});

test('keeps structured image-content recovery accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/prospects/business-demo-local-services/assets');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Recover image-based information' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
