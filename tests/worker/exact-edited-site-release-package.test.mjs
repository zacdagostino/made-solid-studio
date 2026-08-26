import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826180000_exact_edited_site_release_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);

test('registers exact edited-site release as immutable test package v22.6', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(migration, /22\.6/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.6/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.5/);
  assert.match(migration, /not exists/);
  assert.match(migration, /client-url-release-contract/);

  assert.match(repository, /agent-package-local-v22-6-exact-edited-site-release/);
  assert.match(repository, /version: 22\.6/);
  assert.match(repository, /basePackageId: localResponsiveDevelopmentRuntimePackage\.id/);
  assert.match(
    repository,
    /localExactEditedSiteReleasePackage,[\s\S]*localResponsiveDevelopmentRuntimePackage/,
  );
  assert.match(repository, /missingPackages = \[[\s\S]*localExactEditedSiteReleasePackage/);

  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.4`/);
  assert.match(
    app,
    /configured upstream repository and branch instead of requiring a remote named origin/i,
  );
});
