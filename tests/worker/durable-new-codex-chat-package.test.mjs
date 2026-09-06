import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904130000_durable_new_codex_chat_test_package.sql',
  import.meta.url,
);

test('registers durable New chat once as immutable test package v24.3', async () => {
  const [migration, repository, app, bridge, bridgeTest, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./codex-feedback-bridge.test.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*24\.3,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.3/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.2'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-3-durable-new-codex-chat/);
  assert.match(repository, /version: 24\.3,/);
  assert.match(repository, /basePackageId: localRestorableManagedCodexChatsPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.3'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localDurableNewCodexChatPackage,') <
        ledger.indexOf('localRestorableManagedCodexChatsPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(bridge, /'runtime',\s*'started-threads\.json'/);
  assert.match(bridge, /await this\.loadStartedThreads\(\)/);
  assert.match(bridge, /await this\.persistStartedThreads\(\)/);
  assert.match(bridge, /list_turns\.\*not supported/);
  assert.match(bridgeTest, /const reloadedBridge = new CodexFeedbackBridge/);
  assert.match(bridgeTest, /list_turns is not supported yet/);
  assert.match(responsiveSpec, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(responsiveSpec, /\['v24\.3', 'Durable new Codex chat'\]/);
});
