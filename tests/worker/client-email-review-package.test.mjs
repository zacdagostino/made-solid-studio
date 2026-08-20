import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('registers immutable inbound email review package v15.2 after v15.1 locally', async () => {
  const repository = await source('src/lib/repository.ts');
  assert.match(repository, /agent-package-local-v15-2-inbound-client-email-review/);
  assert.match(repository, /version: 15\.2/);
  assert.match(repository, /basePackageId: localColdProspectOffersPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v15\.2'/);
  assert.match(repository, /stagedBehaviourIds: \['inbound-client-email-review'\]/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localInboundClientEmailReviewPackage,') <
      packageLedger.indexOf('localColdProspectOffersPackage,'),
  );
});

test('registers immutable Clientspace Admin email review package v15.3 after v15.2', async () => {
  const repository = await source('src/lib/repository.ts');
  assert.match(repository, /agent-package-local-v15-3-clientspace-admin-email-review/);
  assert.match(repository, /version: 15\.3/);
  assert.match(repository, /basePackageId: localInboundClientEmailReviewPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v15\.3'/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localClientspaceAdminEmailReviewPackage,') <
      packageLedger.indexOf('localInboundClientEmailReviewPackage,'),
  );
});

test('registers an idempotent test-ready Supabase package and Testing behaviour', async () => {
  const [migration, clientspaceMigration, app] = await Promise.all([
    source('supabase/migrations/20260818110000_inbound_client_email_review_test_package.sql'),
    source('supabase/migrations/20260818120000_clientspace_admin_email_review_test_package.sql'),
    source('src/App.tsx'),
  ]);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v15\.2/);
  assert.match(migration, /\["inbound-client-email-review"\]/);
  assert.match(migration, /and not exists/);
  assert.match(clientspaceMigration, /'test_ready'/);
  assert.match(clientspaceMigration, /made-solid-studio-builder-agent-v15\.3/);
  assert.match(clientspaceMigration, /\["inbound-client-email-review"\]/);
  assert.match(clientspaceMigration, /and not exists/);
  assert.match(app, /title: 'Context-aware inbound client email review'/);
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.2`/);
  assert.match(
    app,
    /Latest edit: the same review inbox now appears in each Clientspace Admin Emails section/,
  );
});

test('keeps the dummy inbox review-only with prompt and direct editing controls', async () => {
  const component = await source('src/components/ClientEmailDesk.tsx');
  assert.match(component, /Ask AI to edit this draft/);
  assert.match(component, /onChange=\{\(event\) => updateDraft\(\{ body:/);
  assert.match(component, /Mark reviewed/);
  assert.match(component, /Send unavailable in test mode/);
  assert.match(component, /disabled\s+title="A delivery provider is not connected in test mode"/);
  assert.match(component, /Add test email/);
});
