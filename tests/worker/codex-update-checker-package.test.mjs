import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260902100000_codex_update_checker_test_package.sql',
  import.meta.url,
);

test('registers the Codex update checker once as immutable test package v23.7', async () => {
  const [migration, repository, app, runtimeClient, runtimeEndpoint, responsiveSpec] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../src/lib/codex-runtime-updates.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ]);

  assert.match(migration, /base\.organization_id,\s*23\.7,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.7/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.6'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-7-codex-update-checker/);
  assert.match(repository, /version: 23\.7,/);
  assert.match(repository, /basePackageId: localAutomaticCodexUpdatesPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.7'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localCodexUpdateCheckerPackage,') <
        ledger.indexOf('localAutomaticCodexUpdatesPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(app, /function CodexRuntimeUpdateSettings/);
  assert.match(app, /Installed version/);
  assert.match(app, /Latest stable/);
  assert.match(app, /Check for updates/);
  assert.match(runtimeClient, /export function checkCodexUpdatesNow/);
  assert.match(runtimeClient, /method: 'POST'/);
  assert.match(runtimeEndpoint, /updateAction !== 'check'/);
  assert.match(runtimeEndpoint, /checkForCodexUpdate\(\{ environment: process\.env \}\)/);
  assert.match(responsiveSpec, /v23\.7 · Approved test/);
  assert.match(responsiveSpec, /\['v23\.7', 'Codex update checker'\]/);
});
