import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps the Agent Studio accessible before a test prospect is selected', async ({ page }) => {
  await page.goto('/#/agent-studio');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps the Builder agent architecture accessible', async ({ page }) => {
  await page.goto('/#/agent-studio/agent');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
