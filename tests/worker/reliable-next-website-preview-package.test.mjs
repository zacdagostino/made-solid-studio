import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826280000_reliable_next_website_preview_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const previewHostUrl = new URL('../../preview-host/server.mjs', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers reliable Next website previews as immutable test package v23.5', async () => {
  const [migration, repository, app, previewHost, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(previewHostUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.5,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.5/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.4'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-5-reliable-next-website-preview/);
  assert.match(repository, /version: 23\.5,/);
  assert.match(repository, /basePackageId: localPersistentCodexPreferencesPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.5'/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localReliableNextWebsitePreviewPackage,') <
        ledger.indexOf('localPersistentCodexPreferencesPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.107`/);
  assert.match(behaviour, /hello@madesolid\.com\.au website gate/);
  assert.match(app, /client-development-editor__loading-bar/);
  assert.match(app, /requestFullscreen/);
  assert.match(previewHost, /rewriteWorkspaceFrameRootReferences/);
  assert.match(previewHost, /made-solid-workspace-preview/);
  assert.match(previewHost, /nextjs-portal\{display:none!important\}/);
  assert.match(responsiveSpec, /\['v23\.5', 'Reliable Next website preview'\]/);
  assert.match(responsiveSpec, /\['v23\.4', 'Persistent Codex preferences'\]/);
});
