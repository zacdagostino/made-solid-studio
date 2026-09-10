import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('registers the unified proposal without replacing the preceding package', async () => {
  const repository = await readFile(
    new URL('../../src/lib/repository.ts', import.meta.url),
    'utf8',
  );
  const sql = await readFile(
    new URL(
      '../../supabase/migrations/20260910091000_unified_client_proposal_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(sql, /25\.2, 'test_ready'/);
  assert.match(sql, /not exists/);
  assert.match(sql, /candidate.version < 25\.2/);
  assert.match(repository, /version: 25\.2/);
  assert.match(repository, /basePackageId: localImmediateWebsiteCodexOpenPackage.id/);
  assert.equal(repository.match(/^\s+localUnifiedProposalPackage,/gm)?.length, 3);
});
