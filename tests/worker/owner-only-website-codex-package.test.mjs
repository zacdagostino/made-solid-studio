import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260903090000_owner_only_website_codex_test_package.sql',
  import.meta.url,
);

test('registers the owner-only website Codex behavior once as immutable test package v23.8', async () => {
  const [migration, repository, app, panel, codexSpec, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/CodexFeedbackPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/codex-feedback.spec.js', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.8,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.7'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-8-owner-only-website-codex/);
  assert.match(repository, /version: 23\.8,/);
  assert.match(repository, /basePackageId: localCodexUpdateCheckerPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.8'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localOwnerOnlyWebsiteCodexPackage,') <
        ledger.indexOf('localCodexUpdateCheckerPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(panel, /event\.data\.action === 'synchronize'/);
  assert.match(panel, /open: phase !== 'closed'/);
  assert.match(panel, /expanded: phase === 'selecting'/);
  assert.match(codexSpec, /resynchronizes a remembered open website chat/);
  assert.match(codexSpec, /viewportSize\(\)/);
  assert.match(responsiveSpec, /\['v23\.8', 'Owner-only website Codex panel'\]/);
});
