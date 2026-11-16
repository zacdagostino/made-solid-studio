import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('registers immutable v35.9 once in every local seed path and cloud migration', async () => {
  const repository = await readFile(
    new URL('../../src/lib/repository.ts', import.meta.url),
    'utf8',
  );
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20261116083000_rendered_email_capture_test_package.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const app = await readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8');
  assert.equal(repository.match(/version: 35\.9,/g)?.length, 1);
  assert.equal(repository.match(/^\s+localRenderedEmailCapturePackage,/gm)?.length, 3);
  assert.match(repository, /basePackageId: localReliableCodexQueueHandoffPackage.id/);
  assert.match(migration, /35\.9, 'test_ready'/);
  assert.match(
    migration,
    /where base.builder_contract_version = 'made-solid-studio-builder-agent-v35\.8'/,
  );
  assert.match(migration, /and not exists/);
  assert.doesNotMatch(migration, /update public.agent_packages/i);
  assert.match(app, /revision: `v\$\{selectedAgentPackage.version\}\.19`/);
  assert.match(app, /unfinished or broken pages fail capture/);
});
