import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('registers queue recovery as a new test package without promoting production', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20261113120000_bounded_codex_queue_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const repository = await readFile(
    new URL('../../src/lib/repository.ts', import.meta.url),
    'utf8',
  );
  assert.match(migration, /25\.3, 'test_ready'/);
  assert.match(migration, /candidate\.organization_id = base\.organization_id/);
  assert.match(migration, /not exists/);
  assert.match(repository, /basePackageId: localUnifiedProposalPackage\.id/);
  assert.equal(repository.match(/localBoundedCodexQueuePackage,/g)?.length, 3);
  assert.equal(repository.match(/id: 'agent-package-local-v25-3-bounded-codex-queue'/g)?.length, 1);
});
