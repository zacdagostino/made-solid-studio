import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904100000_astra_ready_codex_runtime_test_package.sql',
  import.meta.url,
);

test('registers the Astra-ready Codex runtime once as immutable test package v24.0', async () => {
  const [migration, repository, app, bridge, updater, dockerfile, responsiveSpec] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/codex-runtime-updates.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../Dockerfile', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ]);

  assert.match(migration, /base\.organization_id,\s*24\.0,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.9'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-0-astra-ready-codex-runtime/);
  assert.match(repository, /version: 24,/);
  assert.match(repository, /basePackageId: localAuthenticatedWebsiteCodexEmbedPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.0'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localAstraReadyCodexRuntimePackage,') <
        ledger.indexOf('localAuthenticatedWebsiteCodexEmbedPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(app, /GPT-6 Astra/);
  assert.match(app, /How future updates reach Studio/);
  assert.match(bridge, /includeHidden: true/);
  assert.match(bridge, /=== 'gpt-6-astra'/);
  assert.match(updater, /api\.github\.com\/repos\/openai\/codex\/releases/);
  assert.match(dockerfile, /@openai\/codex@0\.153\.2/);
  assert.match(responsiveSpec, /v24\.0 · Approved test/);
  assert.match(responsiveSpec, /\['v24\.0', 'Astra-ready Codex runtime'\]/);
});
