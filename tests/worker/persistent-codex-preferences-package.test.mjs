import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826270000_persistent_codex_preferences_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers persistent Codex preferences as immutable test package v23.4', async () => {
  const [migration, repository, app, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.4,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.4/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.3'/,
  );
  assert.match(migration, /\["visual-codex-feedback"\]/);
  assert.match(repository, /agent-package-local-v23-4-persistent-codex-preferences/);
  assert.match(repository, /version: 23\.4,/);
  assert.match(repository, /basePackageId: localGeneratedNextEnvironmentHygienePackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.4'/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localPersistentCodexPreferencesPackage,') <
        ledger.indexOf('localGeneratedNextEnvironmentHygienePackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /hello@madesolid\.com\.au website gate/);
  assert.match(responsiveSpec, /\['v23\.5', 'Reliable Next website preview'\]/);
  assert.match(responsiveSpec, /\['v23\.4', 'Persistent Codex preferences'\]/);
  assert.match(responsiveSpec, /\['v23\.3', 'Generated Next environment hygiene'\]/);
});
