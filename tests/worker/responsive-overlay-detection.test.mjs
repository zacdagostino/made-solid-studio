import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import {
  inspectPersistentInterfaceState,
  moveToScrollProgress,
} from '../../worker/audit-specialist-worker.mjs';
import {
  responsiveBrowserContextOptions,
  responsiveBrowserProfiles,
} from '../../worker/responsive-browser-profiles.mjs';

test('detects a fixed mobile action bar covering meaningful footer content at the page end', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...responsiveBrowserContextOptions(responsiveBrowserProfiles.mobile),
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    await page.setContent(`
      <!doctype html>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font: 18px sans-serif; }
        main { min-height: 1500px; padding: 24px; }
        footer { min-height: 260px; padding: 150px 24px 16px; background: #123; color: white; }
        .contact-actions {
          position: fixed;
          z-index: 20;
          inset: auto 0 0;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: white;
        }
      </style>
      <main><h1>Example page</h1><p>Page content starts here.</p></main>
      <footer><p>Business address and registration details</p></footer>
      <nav class="contact-actions" aria-label="Quick contact actions">
        <a href="tel:123">Phone</a><a href="mailto:test@example.com">Email</a>
      </nav>
    `);

    const top = await inspectPersistentInterfaceState(page);
    const bottom = await moveToScrollProgress(page, 1);

    assert.equal(top.scrollProgress, 0);
    assert.equal(top.persistentOverlayOcclusions.length, 0);
    assert.equal(bottom.scrollProgress, 1);
    assert.ok(
      bottom.persistentOverlayOcclusions.some(
        (overlay) =>
          overlay.position === 'fixed' &&
          /quick contact actions/i.test(overlay.label) &&
          overlay.occludedContent.some((content) => /business address/i.test(content.label)),
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
