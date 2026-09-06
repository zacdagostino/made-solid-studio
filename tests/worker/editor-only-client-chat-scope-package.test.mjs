import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826200000_editor_only_client_chat_scope_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);

test('registers editor-only client chat scope as immutable test package v22.8', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);

  assert.match(migration, /22\.8/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.8/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.7/);
  assert.match(migration, /not exists/);
  assert.match(migration, /visual-codex-feedback/);

  assert.match(repository, /agent-package-local-v22-8-editor-only-client-chat-scope/);
  assert.match(repository, /version: 22\.8/);
  assert.match(repository, /basePackageId: localUnambiguousWebsiteEditingPackage\.id/);
  assert.match(
    repository,
    /localEditorOnlyClientChatScopePackage,[\s\S]*localUnambiguousWebsiteEditingPackage/,
  );
  assert.match(repository, /missingPackages = \[[\s\S]*localEditorOnlyClientChatScopePackage/);

  assert.match(app, /<CodexFeedbackPanel key="universal" \/>/);
  assert.match(app, /workspaceDirectory=\{directory\}/);
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(
    app,
    /Each prospect has one client-named website editor that combines the current preview with client-scoped Codex/,
  );
});
