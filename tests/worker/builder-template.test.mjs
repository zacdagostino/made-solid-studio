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
    assert.match(html, /data-siteforge-brand-intro/);
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
    assert.match(runtime, /dataset\.siteforgeIntroCopy/);
    assert.match(runtime, /dataset\.siteforgeIntroInk/);
    assert.match(runtime, /function enforceIntroTextContrast/);
    assert.match(runtime, /function prioritiseBrandLogos/);
    assert.match(runtime, /function startNavigationInteractions/);
    assert.match(runtime, /@media \(max-width: 768px\)/);
    assert.match(runtime, /@media \(min-width: 769px\)/);
    assert.match(runtime, /data-siteforge-desktop-navigation/);
    assert.match(runtime, /min-height: 100dvh/);
    assert.doesNotMatch(runtime, /Preparing your site/);
    assert.match(runtime, /usePathname/);
    assert.match(runtime, /sf-route-transitioning/);
    assert.match(runtime, /transformOrigin = 'top left'/);
    assert.match(runtime, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
    assert.match(runtime, /header:has\(\[data-siteforge-brand-logo\]\)/);
    assert.match(runtime, /siteforgeIntroSurface/);
    assert.match(runtime, /duration: 1_250/);
    assert.match(runtime, /}, 1_500\)/);
    assert.match(runtime, /const revealElements = prepareReveals\(\)/);

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
      await page.locator('.sf-brand-intro.is-entered .sf-brand-intro__mark').waitFor();
      assert.equal(await page.locator('h1.is-visible').count(), 0);
      assert.equal(
        await page
          .locator('.sf-brand-intro')
          .evaluate((intro) => globalThis.getComputedStyle(intro).backgroundColor),
        'rgb(255, 255, 255)',
      );
      assert.equal(await page.locator('.sf-brand-intro__status').innerText(), 'Made Solid Studio');
      assert.equal(
        await page
          .locator('.sf-brand-intro')
          .evaluate((intro) => globalThis.getComputedStyle(intro).color),
        'rgb(23, 32, 29)',
      );
      assert.equal(
        await page
          .locator('[data-siteforge-brand-logo]')
          .evaluate((logo) => logo instanceof globalThis.HTMLImageElement && logo.complete),
        true,
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
      assert.equal(await page.locator('h1.is-visible').count(), 0);
      assert.equal(await page.evaluate(() => globalThis.scrollY), 0);
      const handoffGeometry = await page.evaluate(() => {
        const mark = globalThis.document.querySelector('.sf-brand-intro__mark');
        const markedLogo = globalThis.document.querySelector('[data-siteforge-brand-logo]');
        const logo = markedLogo?.matches('img') ? markedLogo : markedLogo?.querySelector('img');
        if (!(mark instanceof globalThis.HTMLElement) || !(logo instanceof globalThis.HTMLElement))
          return undefined;
        const animations = mark.getAnimations();
        const animation =
          animations.find((candidate) => candidate.effect?.getTiming().duration === 1_250) ??
          animations.at(-1);
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
          `${edge} endpoint did not match the navigation logo: ${JSON.stringify(handoffGeometry)}`,
        );
      }
      assert.equal(
        await page.locator('main').evaluate((main) => globalThis.getComputedStyle(main).opacity),
        '0',
      );
      await page.locator('.sf-brand-intro').waitFor({ state: 'detached', timeout: 4_000 });
      await page.locator('h1.is-visible').waitFor();
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
      await page.route('**/delayed-navigation-logo.svg', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1_600));
        await route.fulfill({
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="40"><rect width="124" height="40" fill="#173f35"/></svg>`,
          contentType: 'image/svg+xml',
        });
      });
      await page.evaluate(() => {
        const trigger = globalThis.document.createElement('button');
        trigger.dataset.siteforgeMenuTrigger = '';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => {
          trigger.setAttribute(
            'aria-expanded',
            trigger.getAttribute('aria-expanded') === 'true' ? 'false' : 'true',
          );
        });
        const dialog = globalThis.document.createElement('aside');
        dialog.dataset.siteforgeNavigationDialog = '';
        dialog.dataset.sfNavigationMotion = '';
        const backdrop = globalThis.document.createElement('div');
        backdrop.dataset.siteforgeNavigationBackdrop = '';
        const desktopNavigation = globalThis.document.createElement('nav');
        desktopNavigation.dataset.siteforgeDesktopNavigation = '';
        desktopNavigation.textContent = 'Desktop navigation';
        const logo = globalThis.document.createElement('img');
        logo.dataset.siteforgeNavigationLogo = '';
        logo.alt = '';
        logo.src = '/delayed-navigation-logo.svg';
        dialog.append(logo);
        ['Logo', 'Services', 'Contact'].forEach((label) => {
          const item = globalThis.document.createElement('a');
          item.dataset.sfNavigationItem = '';
          item.textContent = label;
          dialog.append(item);
        });
        backdrop.append(dialog);
        globalThis.document.body.append(trigger, desktopNavigation, backdrop);
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
      assert.equal(
        await page
          .locator('[data-siteforge-navigation-dialog]')
          .evaluate((dialog) => dialog.classList.contains('is-sf-navigation-ready')),
        false,
      );
      assert.equal(
        await page
          .locator('[data-siteforge-navigation-logo]')
          .evaluate((logo) => globalThis.getComputedStyle(logo).opacity),
        '0',
      );
      await page.waitForFunction(() =>
        globalThis.document
          .querySelector('[data-siteforge-navigation-dialog]')
          .classList.contains('is-sf-navigation-ready'),
      );
      assert.deepEqual(
        await page
          .locator('[data-sf-navigation-item]')
          .evaluateAll((items) =>
            items.map((item) => item.style.getPropertyValue('--sf-navigation-item-delay')),
          ),
        ['140ms', '225ms', '310ms', '395ms'],
      );
      assert.equal(
        await page
          .locator('[data-siteforge-navigation-logo]')
          .evaluate((logo) => logo.complete && logo.naturalWidth > 0),
        true,
      );
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () =>
          globalThis.document
            .querySelector('[data-siteforge-menu-trigger]')
            .getAttribute('aria-expanded') === 'false',
      );
      await page.waitForFunction(
        () =>
          globalThis.document.activeElement ===
          globalThis.document.querySelector('[data-siteforge-menu-trigger]'),
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
        ['135ms', '90ms', '45ms', '0ms'],
      );
      assert.deepEqual(
        await page.evaluate(() => {
          const backdrop = globalThis.document.querySelector(
            '[data-siteforge-navigation-backdrop]',
          );
          const dialog = globalThis.document.querySelector('[data-siteforge-navigation-dialog]');
          return {
            backdropHeight: Math.round(backdrop.getBoundingClientRect().height),
            dialogHeight: Math.round(dialog.getBoundingClientRect().height),
            viewportHeight: globalThis.innerHeight,
          };
        }),
        { backdropHeight: 812, dialogHeight: 812, viewportHeight: 812 },
      );
      await page.setViewportSize({ width: 320, height: 568 });
      assert.deepEqual(
        await page.evaluate(() => {
          const backdrop = globalThis.document.querySelector(
            '[data-siteforge-navigation-backdrop]',
          );
          const dialog = globalThis.document.querySelector('[data-siteforge-navigation-dialog]');
          return {
            backdropHeight: Math.round(backdrop.getBoundingClientRect().height),
            desktopNavigation: globalThis.getComputedStyle(
              globalThis.document.querySelector('[data-siteforge-desktop-navigation]'),
            ).display,
            dialogHeight: Math.round(dialog.getBoundingClientRect().height),
            trigger: globalThis.getComputedStyle(
              globalThis.document.querySelector('[data-siteforge-menu-trigger]'),
            ).display,
          };
        }),
        {
          backdropHeight: 568,
          desktopNavigation: 'none',
          dialogHeight: 568,
          trigger: 'inline-flex',
        },
      );
      await page.setViewportSize({ width: 768, height: 1024 });
      assert.deepEqual(
        await page.evaluate(() => ({
          desktopNavigation: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-desktop-navigation]'),
          ).display,
          trigger: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-menu-trigger]'),
          ).display,
        })),
        { desktopNavigation: 'none', trigger: 'inline-flex' },
      );
      await page.setViewportSize({ width: 769, height: 1024 });
      assert.deepEqual(
        await page.evaluate(() => ({
          desktopNavigation: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-desktop-navigation]'),
          ).display,
          trigger: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-menu-trigger]'),
          ).display,
        })),
        { desktopNavigation: 'block', trigger: 'none' },
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      assert.deepEqual(
        await page.evaluate(() => ({
          desktopNavigation: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-desktop-navigation]'),
          ).display,
          trigger: globalThis.getComputedStyle(
            globalThis.document.querySelector('[data-siteforge-menu-trigger]'),
          ).display,
        })),
        { desktopNavigation: 'block', trigger: 'none' },
      );
      await page.setViewportSize({ width: 375, height: 812 });
      await page.evaluate(() => globalThis.history.pushState(null, '', '/next-route'));
      await page.locator('.sf-brand-intro').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.sf-brand-intro__status').innerText(), 'Made Solid Studio');
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
