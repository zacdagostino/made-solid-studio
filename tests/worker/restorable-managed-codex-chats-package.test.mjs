import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904120000_restorable_managed_codex_chats_test_package.sql',
  import.meta.url,
);

test('registers restorable managed Codex chats once as immutable test package v24.2', async () => {
  const [migration, repository, app, component, bridge, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/CodexFeedbackPanel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*24\.2,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.2/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.1'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-2-restorable-managed-codex-chats/);
  assert.match(repository, /version: 24\.2,/);
  assert.match(repository, /basePackageId: localReliableNewCodexChatPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.2'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localRestorableManagedCodexChatsPackage,') <
        ledger.indexOf('localReliableNewCodexChatPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(component, /action: 'delete-thread'/);
  assert.match(component, /ready: isSupported !== undefined/);
  assert.match(bridge, /async deleteThread\(input\)/);
  assert.match(responsiveSpec, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(responsiveSpec, /\['v24\.2', 'Restorable managed Codex chats'\]/);
});
