import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826190000_unambiguous_website_editing_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);

test('registers unambiguous website editing as immutable test package v22.7', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(migration, /22\.7/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.7/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.6/);
  assert.match(migration, /not exists/);
  assert.match(migration, /visual-codex-feedback/);

  assert.match(repository, /agent-package-local-v22-7-unambiguous-website-editing/);
  assert.match(repository, /version: 22\.7/);
  assert.match(repository, /basePackageId: localExactEditedSiteReleasePackage\.id/);
  assert.match(
    repository,
    /localUnambiguousWebsiteEditingPackage,[\s\S]*localExactEditedSiteReleasePackage/,
  );
  assert.match(repository, /missingPackages = \[[\s\S]*localUnambiguousWebsiteEditingPackage/);

  assert.match(app, /Open \{workspace\.business\.name\} editor/);
  assert.match(app, /This is not a second editor\./);
  assert.match(app, /Start local website preview/);
  assert.match(app, /one client-named website editor/);
});
