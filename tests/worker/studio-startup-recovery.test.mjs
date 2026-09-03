import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('keeps a visible bounded recovery shell when Studio modules cannot start', async () => {
  const [document, entrypoint] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/main.tsx', 'utf8'),
  ]);

  assert.match(document, /id="studio-startup-shell"/);
  assert.match(document, /aria-label="Loading Made Solid Studio workspace"/);
  assert.match(document, /class="studio-startup__brand"/);
  assert.match(document, /class="studio-startup__brand" role="img"/);
  assert.match(document, /class="studio-startup__mark"/);
  assert.match(document, /class="studio-startup__wordmark"/);
  assert.match(document, /siteforge-os\.theme/);
  assert.match(document, /role="status"/);
  assert.match(document, /Your source and saved work are safe/);
  assert.match(document, /Reload development Studio/);
  assert.match(document, /sessionStorage\.getItem\(recoveryKey\) === 'retrying'/);
  assert.match(document, /window\.setTimeout\(\(\) => window\.location\.reload\(\), 900\)/);
  assert.match(document, /window\.setTimeout\(markFailed, 10_000\)/);
  assert.match(document, /event\.target instanceof HTMLScriptElement/);
  assert.match(entrypoint, /made-solid:studio-mounted/);
  assert.match(entrypoint, /requestAnimationFrame/);
});
