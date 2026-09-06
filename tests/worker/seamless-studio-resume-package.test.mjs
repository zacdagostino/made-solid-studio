import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260826240000_seamless_studio_resume_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const gatewayUrl = new URL('../../scripts/workspace-studio-gateway.mjs', import.meta.url);
const heartbeatUrl = new URL('../../scripts/workspace-hmr-heartbeat.mjs', import.meta.url);
const launcherUrl = new URL('../../scripts/start-railway-runtime', import.meta.url);
const viteConfigurationUrl = new URL('../../vite.config.ts', import.meta.url);
const responsiveSpecUrl = new URL('../e2e/responsive.spec.js', import.meta.url);

test('registers seamless Studio resume as immutable test package v23.1', async () => {
  const [
    migration,
    repository,
    app,
    gateway,
    heartbeat,
    launcher,
    viteConfiguration,
    responsiveSpec,
  ] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(gatewayUrl, 'utf8'),
    readFile(heartbeatUrl, 'utf8'),
    readFile(launcherUrl, 'utf8'),
    readFile(viteConfigurationUrl, 'utf8'),
    readFile(responsiveSpecUrl, 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.1,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.1/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.0'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-1-seamless-studio-resume/);
  assert.match(repository, /version: 23\.1,/);
  assert.match(repository, /basePackageId: localContextualQuickQuestionsPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.1'/);

  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localSeamlessStudioResumePackage,') <
        ledger.indexOf('localContextualQuickQuestionsPackage,'),
    );
  }

  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(app, /hello@madesolid\.com\.au website gate/);
  assert.match(heartbeat, /defaultHeartbeatIntervalMs = 20_000/);
  assert.match(heartbeat, /made-solid:workspace-heartbeat/);
  assert.match(viteConfiguration, /workspaceHmrHeartbeatPlugin\(\)/);
  assert.match(gateway, /private, max-age=31536000, immutable/);
  assert.match(gateway, /private, no-cache/);
  assert.match(gateway, /private, no-store/);
  assert.doesNotMatch(launcher, /--force/);
  assert.match(launcher, /failures >= 4/);
  assert.match(viteConfiguration, /warmup:[\s\S]*\.\/src\/App\.tsx/);
  assert.match(responsiveSpec, /v23\.1 · Approved test/);
  assert.match(responsiveSpec, /\['v23\.1', 'Seamless Studio resume'\]/);
});
