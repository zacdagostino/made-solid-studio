import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826310000_registered_artifact_storage_read_policy.sql',
  import.meta.url,
);

test('authorizes registered private artifacts by exact storage identity and membership', async () => {
  const migration = await readFile(migrationUrl, 'utf8');

  assert.match(migration, /on storage\.objects for select to authenticated/);
  assert.match(migration, /bucket_id = 'siteforge-artifacts'/);
  assert.match(migration, /from public\.artifacts artifacts/);
  assert.match(migration, /join public\.organization_members members/);
  assert.match(migration, /members\.organization_id = artifacts\.organization_id/);
  assert.match(migration, /members\.user_id = auth\.uid\(\)/);
  assert.match(migration, /artifacts\.storage_bucket = storage\.objects\.bucket_id/);
  assert.match(migration, /artifacts\.storage_path = storage\.objects\.name/);
  assert.doesNotMatch(migration, /split_part\s*\(/);
});
