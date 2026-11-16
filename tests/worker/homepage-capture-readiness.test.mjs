import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { waitForHomepageCapture } from '../../scripts/homepage-capture-readiness.mjs';

test('capture waits beyond five seconds for media and opacity-only reveals', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://capture.test/hero.svg', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6200));
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="navy"/></svg>',
      });
    });
    await page.setContent(
      `<style>@keyframes reveal{from{opacity:0}to{opacity:1}} h1{animation:reveal 1s 6.5s both} img{width:400px;height:200px}</style><main><h1>A complete working website with its visible homepage content</h1><img src="https://capture.test/hero.svg" alt="Hero"></main>`,
      { waitUntil: 'domcontentloaded' },
    );
    const started = Date.now();
    await waitForHomepageCapture(page);
    assert.ok(Date.now() - started >= 8500);
    assert.equal(
      await page.locator('h1').evaluate((el) => globalThis.getComputedStyle(el).opacity),
      '1',
    );
    assert.equal(
      await page.locator('img').evaluate((el) => el.complete && el.naturalWidth > 0),
      true,
    );
    await page.screenshot({ path: '/tmp/settled-homepage-capture.png' });
    await page.setContent(
      '<main><h1>A complete working website with its visible homepage content</h1><div data-siteforge-brand-intro>Loading website</div></main>',
    );
    await assert.rejects(
      waitForHomepageCapture(page, { timeoutMs: 500 }),
      /did not finish loading/,
    );
    await page.route('https://capture.test/broken.svg', (route) =>
      route.fulfill({ status: 404, body: '' }),
    );
    await page.setContent(
      '<main><h1>A complete working website with its visible homepage content</h1><img style="width:400px;height:200px" src="https://capture.test/broken.svg"></main>',
    );
    await assert.rejects(waitForHomepageCapture(page), /media failed/);
  } finally {
    await browser.close();
  }
});
