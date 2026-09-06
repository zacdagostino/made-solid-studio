import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260902090000_automatic_codex_updates_test_package.sql',
  import.meta.url,
);

test('registers automatic Codex updates once as immutable test package v23.6', async () => {
  const [migration, repository, app, launcher, updater, dockerfile, responsiveSpec] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/codex-runtime-updates.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../Dockerfile', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ]);

  assert.match(migration, /base\.organization_id,\s*23\.6,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.6/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.5'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-6-automatic-codex-updates/);
  assert.match(repository, /version: 23\.6,/);
  assert.match(repository, /basePackageId: localReliableNextWebsitePreviewPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.6'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localAutomaticCodexUpdatesPackage,') <
        ledger.indexOf('localReliableNextWebsitePreviewPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(app, /function CodexRuntimeUpdateSettings/);
  assert.match(app, /What changed/);
  assert.match(launcher, /codex-runtime-updates\.mjs" daemon/);
  assert.match(launcher, /codex-runtime-updates\.mjs" health/);
  assert.match(launcher, /codex-runtime-updates\.mjs" rollback/);
  assert.match(launcher, /current\/node_modules\/\.bin/);
  assert.match(updater, /registry\.npmjs\.org\/@openai%2Fcodex\/latest/);
  assert.match(updater, /learn\.chatgpt\.com\/docs\/changelog/);
  assert.match(updater, /waiting_for_idle/);
  assert.match(dockerfile, /@openai\/codex@0\.153\.2/);
  assert.match(responsiveSpec, /\['v23\.6', 'Automatic Codex updates'\]/);
  assert.match(responsiveSpec, /settings-codex-runtime-update/);
});
