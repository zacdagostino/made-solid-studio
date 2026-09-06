import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260906100000_recent_request_chat_context_test_package.sql',
  import.meta.url,
);

test('registers recent request chat context once as immutable test package v24.7', async () => {
  const [migration, repository, app, bridge, component, styles, bridgeTest, e2e, responsiveSpec] =
    await Promise.all([
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../../src/components/CodexFeedbackPanel.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../src/styles.css', import.meta.url), 'utf8'),
      readFile(new URL('./codex-feedback-bridge.test.mjs', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/codex-feedback.spec.js', import.meta.url), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ]);

  assert.match(migration, /base\.organization_id,\s*24\.7,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.7/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.6'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(repository, /version: 24\.7,/);
  assert.match(repository, /basePackageId: localRecoverStaleEmptyCodexChatPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.7'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localRecentRequestChatContextPackage,') <
        ledger.indexOf('localRecoverStaleEmptyCodexChatPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(bridge, /function latestPromptByThread\(records\)/);
  assert.match(bridge, /latestPrompt: latestPrompts\.get\(String\(candidate\.id\)\)/);
  assert.match(component, /aria-label="Your latest request"/);
  assert.match(component, /left\.createdAt\.localeCompare\(right\.createdAt\)/);
  assert.match(styles, /\.codex-chat-latest-request/);
  assert.match(styles, /-webkit-line-clamp: 2/);
  assert.match(bridgeTest, /uses each thread latest saved request as its public preview/);
  assert.match(e2e, /codex-compact-latest-request\.png/);
  assert.match(responsiveSpec, /agent-package-local-v24-7-recent-request-chat-context/);
  assert.match(responsiveSpec, /\['v24\.7', 'Recent request chat context'\]/);
});
