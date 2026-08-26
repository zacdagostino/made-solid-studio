import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826230000_contextual_auto_read_quick_questions_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const componentUrl = new URL('../../src/components/CodexFeedbackPanel.tsx', import.meta.url);
const bridgeUrl = new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers contextual auto-read Quick questions as immutable test package v23.0', async () => {
  const [migration, repository, app, component, bridge, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(bridgeUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.0,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v22\.9'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-0-contextual-auto-read-quick-questions/);
  assert.match(repository, /version: 23,/);
  assert.match(repository, /basePackageId: localCodexConversationStatusIndicatorsPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.0'/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localContextualQuickQuestionsPackage,') <
        ledger.indexOf('localCodexConversationStatusIndicatorsPackage,'),
    );
  }

  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.101`/);
  assert.match(
    app,
    /temporary read-only quick question that inherits the whole selected conversation/,
  );
  assert.match(component, /threadId: temporaryQuestion\.threadId/);
  assert.match(component, /setAutoReadPending\(\{/);
  assert.match(bridge, /client\.request\('thread\/fork'/);
  assert.match(bridge, /complete inherited conversation as context/);
  assert.match(responsiveSpec, /v23\.0 · Approved test/);
  assert.match(responsiveSpec, /\['v23\.0', 'Contextual auto-read Quick questions'\]/);
});
