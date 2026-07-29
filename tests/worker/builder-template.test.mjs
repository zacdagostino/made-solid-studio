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
    assert.match(runtime, /data-siteforge-brand-logo/);
    assert.match(runtime, /sessionStorage/);

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
      assert.equal(
        await page.locator('.sf-brand-intro__status').innerText(),
        'Preparing your site',
      );
      await page.locator('.sf-brand-intro').waitFor({ state: 'detached', timeout: 3_000 });
      assert.equal(await page.locator('h1').getAttribute('data-sf-reveal'), 'true');
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
        ),
        true,
      );
      await context.close();

      const reducedContext = await browser.newContext({
        reducedMotion: 'reduce',
        viewport: { width: 320, height: 568 },
      });
      const reducedPage = await reducedContext.newPage();
      await reducedPage.goto(preview.url);
      assert.equal(await reducedPage.locator('.sf-brand-intro').count(), 0);
      assert.equal(await reducedPage.locator('h1').getAttribute('data-sf-reveal'), 'true');
      await reducedContext.close();
    } finally {
      await browser.close();
      await new Promise((resolve) => preview.server.close(resolve));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
