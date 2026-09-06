import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260904140000_concise_current_work_chat_titles_test_package.sql',
  import.meta.url,
);

test('registers concise current-work chat titles once as immutable test package v24.4', async () => {
  const [migration, repository, app, titleSource, titleTest, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/lib/codex-conversation-title.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/lib/codex-conversation-title.test.ts', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*24\.4,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.4/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.3'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-4-concise-current-work-chat-titles/);
  assert.match(repository, /version: 24\.4,/);
  assert.match(repository, /basePackageId: localDurableNewCodexChatPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.4'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localConciseCurrentWorkChatTitlesPackage,') <
        ledger.indexOf('localDurableNewCodexChatPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(titleSource, /function conciseWorkSummary/);
  assert.match(titleSource, /Captured from:/);
  assert.match(titleTest, /Summarise each chat's latest work/);
  assert.match(responsiveSpec, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(responsiveSpec, /\['v24\.4', 'Concise current-work chat titles'\]/);
});
