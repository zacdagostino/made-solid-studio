import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904160000_recover_stale_empty_codex_chat_test_package.sql',
  import.meta.url,
);

test('registers stale empty Codex chat recovery once as immutable test package v24.6', async () => {
  const [migration, repository, app, bridge, service, bridgeTest, responsiveSpec] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url), 'utf8'),
      readFile(new URL('./codex-feedback-bridge.test.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ]);

  assert.match(migration, /base\.organization_id,\s*24\.6,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.6/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.5'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(repository, /version: 24\.6,/);
  assert.match(repository, /basePackageId: localExplicitWebsiteEditVersionStatusPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.6'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localRecoverStaleEmptyCodexChatPackage,') <
        ledger.indexOf('localExplicitWebsiteEditVersionStatusPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(bridge, /if \(!isUnmaterializedThreadReadError\(error\)\)/);
  assert.match(service, /await activeWork\.catch\(\(\) => undefined\)/);
  assert.match(service, /return codexFeedbackBridge\(\)/);
  assert.match(bridgeTest, /const orphanRecoveryBridge = new CodexFeedbackBridge/);
  assert.match(bridgeTest, /recoveredStatus\.threadIssue, undefined/);
  assert.match(responsiveSpec, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(responsiveSpec, /\['v24\.6', 'Stale empty Codex chat recovery'\]/);
});
