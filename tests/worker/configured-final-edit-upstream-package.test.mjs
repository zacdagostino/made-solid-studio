import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826250000_configured_final_edit_upstream_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers configured final edit upstream as immutable test package v23.2', async () => {
  const [migration, repository, app, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.2,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.2/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.1'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["client-url-release-contract"\]/);
  assert.match(migration, /configured upstream repository and branch/);

  assert.match(repository, /agent-package-local-v23-2-configured-final-edit-upstream/);
  assert.match(repository, /version: 23\.2,/);
  assert.match(repository, /basePackageId: localSeamlessStudioResumePackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.2'/);
  assert.match(repository, /stagedBehaviourIds: \['client-url-release-contract'\]/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localConfiguredFinalEditUpstreamPackage,') <
        ledger.indexOf('localSeamlessStudioResumePackage,'),
    );
  }

  assert.match(app, /id: 'client-url-release-contract'/);
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.4`/);
  assert.match(
    app,
    /configured upstream repository and branch instead of requiring a remote named origin/,
  );
  assert.match(responsiveSpec, /agent-package-local-v23-2-configured-final-edit-upstream/);
  assert.match(responsiveSpec, /\['v23\.2', 'Configured final edit upstream'\]/);
  assert.match(responsiveSpec, /\['v23\.1', 'Seamless Studio resume'\]/);
  assert.match(responsiveSpec, /\['v23\.0', 'Contextual auto-read Quick questions'\]/);
});
