import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseSourceUrl, sourcePagePlan } from '../../worker/source-page-plan.mjs';

test('creates a stable private output map for every selected source page', () => {
  const pages = sourcePagePlan([
    { url: 'https://example.com/' },
    { url: 'https://example.com/about-us' },
    { url: 'https://example.com/post/Helpful%20Article?utm_source=test' },
    { url: 'https://example.com/about-us/' },
  ]);

  assert.deepEqual(
    pages.map(({ sourceUrl, publicPath, outputPath, sourcePath }) => ({
      sourceUrl,
      publicPath,
      outputPath,
      sourcePath,
    })),
    [
      {
        sourceUrl: 'https://example.com/',
        publicPath: '/',
        outputPath: 'index.html',
        sourcePath: 'app/page.tsx',
      },
      {
        sourceUrl: 'https://example.com/about-us',
        publicPath: '/about-us/',
        outputPath: 'about-us/index.html',
        sourcePath: 'app/about-us/page.tsx',
      },
      {
        sourceUrl: 'https://example.com/post/Helpful%20Article',
        publicPath: '/post/helpful-article/',
        outputPath: 'post/helpful-article/index.html',
        sourcePath: 'app/post/helpful-article/page.tsx',
      },
      {
        sourceUrl: 'https://example.com/about-us',
        publicPath: '/about-us-2/',
        outputPath: 'about-us-2/index.html',
        sourcePath: 'app/about-us-2/page.tsx',
      },
    ],
  );
});

test('normalises source URLs without discarding their path', () => {
  assert.equal(
    normaliseSourceUrl('https://example.com/services/?campaign=spring#quote'),
    'https://example.com/services',
  );
});

test('preserves reviewed page coverage outcomes for the builder', () => {
  const [page] = sourcePagePlan([
    {
      url: 'https://example.com/home-1',
      disposition: 'redirect',
      dispositionReason: 'Legacy homepage alias.',
      targetSourceUrl: 'https://example.com/',
      outputRequired: true,
    },
  ]);

  assert.equal(page.disposition, 'redirect');
  assert.equal(page.dispositionReason, 'Legacy homepage alias.');
  assert.equal(page.targetSourceUrl, 'https://example.com/');
  assert.equal(page.outputRequired, true);
});
