import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826260000_generated_next_environment_hygiene_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers generated Next environment hygiene as immutable test package v23.3', async () => {
  const [migration, repository, app, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.3,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.3/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.2'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["client-url-release-contract"\]/);
  assert.match(migration, /byte-exact development route-types declaration/);
  assert.match(migration, /Every other next-env\.d\.ts difference/);

  assert.match(repository, /agent-package-local-v23-3-generated-next-environment-hygiene/);
  assert.match(repository, /version: 23\.3,/);
  assert.match(repository, /basePackageId: localConfiguredFinalEditUpstreamPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.3'/);
  assert.match(repository, /stagedBehaviourIds: \['client-url-release-contract'\]/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localGeneratedNextEnvironmentHygienePackage,') <
        ledger.indexOf('localConfiguredFinalEditUpstreamPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'client-url-release-contract'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.5`/);
  assert.match(behaviour, /byte-exact Next\.js development rewrite of next-env\.d\.ts/);
  assert.match(
    behaviour,
    /manual environment declarations and real source changes remain pending edits/,
  );

  assert.match(responsiveSpec, /agent-package-local-v23-3-generated-next-environment-hygiene/);
  assert.match(responsiveSpec, /\['v23\.3', 'Generated Next environment hygiene'\]/);
  assert.match(responsiveSpec, /\['v23\.2', 'Configured final edit upstream'\]/);
});
