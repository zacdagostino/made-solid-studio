import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPrompt, selectedSourcePages } from '../../worker/builder-worker.mjs';

const manifest = {
  data: {
    selectedPages: [
      { url: 'https://example.com/', title: 'Home' },
      { url: 'https://example.com/services', title: 'Services' },
    ],
  },
};

test('scopes a revised homepage to its restored page and shared stylesheet', () => {
  const [homepage] = selectedSourcePages(manifest, 'homepage_test');
  assert.equal(homepage.outputPath, 'index.html');

  const prompt = buildPrompt(
    {
      scopedRevision: true,
      restoredCheckpoint: true,
      buildMode: 'homepage_test',
      stagedSourcePages: [homepage],
      allowedSourcePaths: ['index.html', 'styles.css'],
      agentPackage: { id: 'package-test', version: 8 },
    },
    'Add the approved behaviour to the header.',
  );

  assert.match(prompt, /revision-scope\.json/);
  assert.match(prompt, /Do not read \.\.\/input\/manifest\.json/);
  assert.match(prompt, /Do not search for unrelated pages/);
  assert.match(prompt, /src\/index\.html, src\/styles\.css/);
  assert.match(prompt, /Add the approved behaviour to the header/);
});

test('keeps a revised selected page tied to its own output path', () => {
  const [services] = selectedSourcePages(manifest, 'page_test', 'https://example.com/services');
  assert.equal(services.outputPath, 'services.html');
});
