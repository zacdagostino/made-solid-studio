import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826220000_codex_conversation_status_indicators_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers Codex conversation status indicators as immutable test package v22.9', async () => {
  const [migration, repository, app, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*22\.9,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v22\.8'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v22-9-codex-conversation-status-indicators/);
  assert.match(repository, /version: 22\.9,/);
  assert.match(repository, /basePackageId: localEditorOnlyClientChatScopePackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v22\.9'/);

  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCodexConversationStatusIndicatorsPackage,') <
      packageLedger.indexOf('localEditorOnlyClientChatScopePackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localCodexConversationStatusIndicatorsPackage,') <
      existingLedgerUpgrade.indexOf('localEditorOnlyClientChatScopePackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localCodexConversationStatusIndicatorsPackage,') <
      fallbackLedger.indexOf('localEditorOnlyClientChatScopePackage,'),
  );

  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.107`/);
  assert.match(app, /hello@madesolid\.com\.au website gate/);
  assert.match(responsiveSpec, /\['v22\.9', 'Codex conversation status indicators'\]/);
});
