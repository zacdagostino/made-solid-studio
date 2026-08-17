import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../src/App.tsx', import.meta.url);
const cacheUrl = new URL('../../src/lib/workspace-cache.ts', import.meta.url);

test('keeps repeated workspace loading cached, targeted, and non-blocking', async () => {
  const [app, cache] = await Promise.all([readFile(appUrl, 'utf8'), readFile(cacheUrl, 'utf8')]);

  assert.match(app, /readWorkspaceCache\(workspaceCacheKey\)/);
  assert.match(app, /setLoadingPresentation\(false\)/);
  assert.doesNotMatch(app, /loading \|\| !workspaces\.length/);
  assert.match(app, /repository\.getWorkspace\(targetBusinessId\)/);
  assert.match(app, /refreshData\(\{ full: true \}\)/);
  assert.match(app, /< 60_000/);
  assert.match(app, /}, 900\)/);
  assert.match(app, /readCachedOrganizationId\(userId\)/);
  assert.match(app, /clearWorkspaceCache\(workspaceCacheKey\)/);

  assert.match(cache, /made-solid-studio-workspace-cache/);
  assert.match(cache, /7 \* 24 \* 60 \* 60 \* 1_000/);
  assert.match(cache, /Cached rendering is an optimisation/);
  assert.match(cache, /repository remains the source of truth/);
});
