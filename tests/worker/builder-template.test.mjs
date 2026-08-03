import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const templateDirectory = fileURLToPath(new URL('../../worker/builder-template/', import.meta.url));

function runNode(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Builder template command exited with ${code}.\n${output}`));
    });
  });
}

async function serve(directory) {
  const server = createServer(async (request, response) => {
    const relativePath = decodeURIComponent(request.url?.split('?')[0] || '/').replace(/^\/+/, '');
    let filePath = join(directory, relativePath || 'index.html');
    try {
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
      const contentType =
        {
          '.css': 'text/css',
          '.html': 'text/html',
          '.js': 'text/javascript',
        }[extname(filePath)] || 'application/octet-stream';
      response.writeHead(200, { 'content-type': contentType });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start.');
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

test('verifies and exports the isolated Next.js component foundation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siteforge-builder-template-test-'));
  try {
    await cp(templateDirectory, directory, {
      recursive: true,
      filter: (source) => !['node_modules', '.next', 'out'].includes(source.split('/').at(-1)),
    });
    await symlink(join(templateDirectory, 'node_modules'), join(directory, 'node_modules'), 'dir');
    await runNode(['node_modules/prettier/bin/prettier.cjs', '--check', '.'], directory);
    await runNode(['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'], directory);
    await runNode(['node_modules/typescript/bin/tsc', '--noEmit'], directory);
    await runNode(['node_modules/next/dist/bin/next', 'build', '--webpack'], directory);
    await runNode(['node_modules/prettier/bin/prettier.cjs', '--check', '.'], directory);

    const output = await stat(join(directory, 'out', 'index.html'));
    assert.equal(output.isFile(), true);
    const html = await readFile(join(directory, 'out', 'index.html'), 'utf8');
    assert.match(html, /data-siteforge-runtime="next-component-v2"/);
    assert.match(html, /data-siteforge-starter="true"/);

    const runtime = await readFile(
      join(directory, 'src', 'components', 'foundation', 'site-runtime.tsx'),
      'utf8',
    );
    assert.match(runtime, /IntersectionObserver/);
    assert.match(runtime, /prefers-reduced-motion/);
    assert.match(runtime, /data-counter/);
    assert.match(runtime, /prepareWordReveal/);
    assert.match(runtime, /prepareStaggerReveal/);
    assert.match(runtime, /data-siteforge-brand-logo/);
    assert.match(runtime, /usePathname/);
    assert.match(runtime, /sf-route-transitioning/);
    assert.match(runtime, /transformOrigin = 'top left'/);
    assert.match(runtime, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
    assert.match(runtime, /header:has\(\[data-siteforge-brand-logo\]\)/);

    const nextAssets = await stat(join(directory, 'out', '_next', 'static'));
    assert.equal(nextAssets.isDirectory(), true);
    await assert.rejects(stat(join(directory, 'out', 'assets', '.gitkeep')));

    const preview = await serve(join(directory, 'out'));
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        reducedMotion: 'no-preference',
        viewport: { width: 375, height: 812 },
      });
      const page = await context.newPage();
      await page.goto(preview.url);
      await page.locator('.sf-brand-intro').waitFor({ state: 'visible' });
      assert.equal(await page.locator('h1.is-visible').count(), 0);
      assert.equal(
        await page.locator('.sf-brand-intro__status').innerText(),
        'Preparing your site',
      );
      await page.evaluate(() => {
        const zoom = globalThis.document.createElement('section');
        const child = globalThis.document.createElement('div');
        zoom.dataset.scrollZoom = '';
        zoom.style.height = '12rem';
        zoom.style.marginTop = '80rem';
        child.textContent = 'Scroll depth';
        zoom.append(child);
        globalThis.document.body.append(zoom);
        globalThis.scrollTo(0, 640);
      });
      assert.ok((await page.evaluate(() => globalThis.scrollY)) > 0);
      await page.locator('.sf-brand-intro.is-handing-off').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => globalThis.scrollY), 0);
      const handoffGeometry = await page.evaluate(() => {
        const mark = globalThis.document.querySelector('.sf-brand-intro__mark');
        const markedLogo = globalThis.document.querySelector('[data-siteforge-brand-logo]');
        const logo = markedLogo?.matches('img') ? markedLogo : markedLogo?.querySelector('img');
        if (!(mark instanceof globalThis.HTMLElement) || !(logo instanceof globalThis.HTMLElement))
          return undefined;
        const animation = mark.getAnimations()[0];
        const finalFrame = animation?.effect?.getKeyframes().at(-1);
        if (!finalFrame?.transform) return undefined;
        const matrix = new globalThis.DOMMatrix(String(finalFrame.transform));
        const markRect = mark.getBoundingClientRect();
        const targetRect = logo.getBoundingClientRect();
        const baseLeft = Number.parseFloat(mark.style.left);
        const baseTop = Number.parseFloat(mark.style.top);
        const baseWidth = Number.parseFloat(mark.style.width);
        const baseHeight = Number.parseFloat(mark.style.height);
        return {
          transformOrigin: globalThis.getComputedStyle(mark).transformOrigin,
          endpoint: {
            left: baseLeft + matrix.e,
            top: baseTop + matrix.f,
            width: baseWidth * matrix.a,
            height: baseHeight * matrix.d,
          },
          target: {
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          },
          currentMarkWidth: markRect.width,
        };
      });
      assert.ok(handoffGeometry);
      assert.equal(handoffGeometry.transformOrigin, '0px 0px');
      assert.ok(handoffGeometry.currentMarkWidth > 0);
      for (const edge of ['left', 'top', 'width', 'height']) {
        assert.ok(
          Math.abs(handoffGeometry.endpoint[edge] - handoffGeometry.target[edge]) < 0.5,
          `${edge} endpoint did not match the navigation logo`,
        );
      }
      assert.equal(
        await page.locator('main').evaluate((main) => globalThis.getComputedStyle(main).opacity),
        '0',
      );
      await page.locator('.sf-brand-intro').waitFor({ state: 'detached', timeout: 4_000 });
      assert.equal(await page.locator('h1').getAttribute('data-sf-reveal'), 'true');
      assert.equal(await page.locator('h1').getAttribute('data-sf-reveal-variant'), 'words');
      assert.equal(await page.locator('h1 .sf-reveal-word').count(), 2);
      assert.equal(
        await page.locator('[data-reveal="stagger"] > [data-sf-reveal-item]').count(),
        2,
      );
      assert.equal(
        await page.locator('[data-reveal="sequence"] > [data-sf-reveal-item]').count(),
        2,
      );
      const scrollZoom = page.locator('[data-scroll-zoom]').last();
      assert.equal(await scrollZoom.getAttribute('data-sf-scroll-zoom'), 'true');
      await scrollZoom.scrollIntoViewIfNeeded();
      await scrollZoom.locator(':scope > [data-sf-scroll-zoom-item]').waitFor();
      await page.waitForFunction(() =>
        globalThis.document
          .querySelectorAll('[data-scroll-zoom]')
          .item(1)
          .classList.contains('is-sf-scroll-zoom-visible'),
      );
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.waitForFunction(
        () =>
          !globalThis.document
            .querySelectorAll('[data-scroll-zoom]')
            .item(1)
            .classList.contains('is-sf-scroll-zoom-visible'),
      );
      await page.waitForFunction(() => {
        const counter = globalThis.document.querySelector('[data-counter]');
        return (
          counter?.getAttribute('data-sf-counter-animated') === 'true' &&
          counter.textContent === '24'
        );
      });
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
        ),
        true,
      );
      await page.evaluate(() => {
        const trigger = globalThis.document.createElement('button');
        trigger.dataset.siteforgeMenuTrigger = '';
        trigger.setAttribute('aria-expanded', 'false');
        const dialog = globalThis.document.createElement('aside');
        dialog.dataset.siteforgeNavigationDialog = '';
        dialog.dataset.sfNavigationMotion = '';
        ['Logo', 'Services', 'Contact'].forEach((label) => {
          const item = globalThis.document.createElement('a');
          item.dataset.sfNavigationItem = '';
          item.textContent = label;
          dialog.append(item);
        });
        globalThis.document.body.append(trigger, dialog);
      });
      await page.waitForFunction(
        () =>
          globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-navigation-dialog]'),
          ).opacity === '0',
      );
      await page
        .locator('[data-siteforge-menu-trigger]')
        .evaluate((trigger) => trigger.setAttribute('aria-expanded', 'true'));
      await page.waitForFunction(
        () =>
          globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-navigation-dialog]'),
          ).opacity === '1',
      );
      assert.deepEqual(
        await page
          .locator('[data-sf-navigation-item]')
          .evaluateAll((items) =>
            items.map((item) => item.style.getPropertyValue('--sf-navigation-item-delay')),
          ),
        ['140ms', '225ms', '310ms'],
      );
      await page
        .locator('[data-siteforge-menu-trigger]')
        .evaluate((trigger) => trigger.setAttribute('aria-expanded', 'false'));
      await page.waitForFunction(
        () =>
          globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-navigation-dialog]'),
          ).opacity === '0',
      );
      assert.deepEqual(
        await page
          .locator('[data-sf-navigation-item]')
          .evaluateAll((items) =>
            items.map((item) => item.style.getPropertyValue('--sf-navigation-item-delay')),
          ),
        ['90ms', '45ms', '0ms'],
      );
      await page.evaluate(() => globalThis.history.pushState(null, '', '/next-route'));
      await page.locator('.sf-brand-intro').waitFor({ state: 'visible' });
      assert.equal(
        await page.locator('.sf-brand-intro__status').innerText(),
        'Preparing your site',
      );
      await page.locator('.sf-brand-intro').waitFor({ state: 'detached', timeout: 4_000 });
      await context.close();

      for (const viewport of [
        { width: 768, height: 1024 },
        { width: 1440, height: 900 },
      ]) {
        const responsiveContext = await browser.newContext({
          reducedMotion: 'no-preference',
          viewport,
        });
        const responsivePage = await responsiveContext.newPage();
        await responsivePage.goto(preview.url);
        await responsivePage
          .locator('.sf-brand-intro')
          .waitFor({ state: 'detached', timeout: 4_000 });
        await responsivePage.locator('h1.is-visible').waitFor();
        assert.equal(await responsivePage.locator('h1 .sf-reveal-word').count(), 2);
        assert.equal(
          await responsivePage.evaluate(
            () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
          ),
          true,
        );
        await responsiveContext.close();
      }

      const reducedContext = await browser.newContext({
        reducedMotion: 'reduce',
        viewport: { width: 320, height: 568 },
      });
      const reducedPage = await reducedContext.newPage();
      await reducedPage.goto(preview.url);
      assert.equal(await reducedPage.locator('.sf-brand-intro').count(), 0);
      assert.equal(await reducedPage.locator('h1').getAttribute('data-sf-reveal'), 'true');
      assert.equal(await reducedPage.locator('h1 .sf-reveal-word').count(), 2);
      assert.equal(await reducedPage.locator('[data-counter]').textContent(), '24');
      await reducedContext.close();
    } finally {
      await browser.close();
      await new Promise((resolve) => preview.server.close(resolve));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
