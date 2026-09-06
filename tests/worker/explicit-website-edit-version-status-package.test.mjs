import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904150000_explicit_website_edit_version_status_test_package.sql',
  import.meta.url,
);

test('registers explicit website edit version status once as immutable test package v24.5', async () => {
  const [migration, repository, app, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*24\.5,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.5/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.4'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["client-url-release-contract"\]/);

  assert.match(repository, /agent-package-local-v24-5-explicit-website-edit-version-status/);
  assert.match(repository, /version: 24\.5,/);
  assert.match(repository, /basePackageId: localConciseCurrentWorkChatTitlesPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.5'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localExplicitWebsiteEditVersionStatusPackage,') <
        ledger.indexOf('localConciseCurrentWorkChatTitlesPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'client-url-release-contract'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.8`/);
  assert.match(behaviour, /current working website exactly matches the latest committed version/);
  assert.match(app, /function websiteEditCheckpointView/);
  assert.match(app, /Working website vs committed version/);
  assert.match(responsiveSpec, /agent-package-local-v24-8-resilient-website-codex-resume/);
  assert.match(responsiveSpec, /\['v24\.5', 'Explicit website edit version status'\]/);
});
