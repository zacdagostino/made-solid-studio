import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260903100000_authenticated_website_codex_embed_test_package.sql',
  import.meta.url,
);

test('registers the authenticated website Codex embed once as immutable test package v23.9', async () => {
  const [migration, repository, app, gateway, responsiveSpec] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/workspace-studio-gateway.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
  ]);

  assert.match(migration, /base\.organization_id,\s*23\.9,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v23\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v23\.8'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v23-9-authenticated-website-codex-embed/);
  assert.match(repository, /version: 23\.9,/);
  assert.match(repository, /basePackageId: localOwnerOnlyWebsiteCodexPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v23\.9'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localAuthenticatedWebsiteCodexEmbedPackage,') <
        ledger.indexOf('localOwnerOnlyWebsiteCodexPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(gateway, /requestUrl\.searchParams\.get\('embed'\) !== websiteCodexEmbed/);
  assert.match(gateway, /frame-ancestors \$\{frameOrigin \|\| "'none'"\}/);
  assert.match(responsiveSpec, /\['v23\.9', 'Authenticated website Codex embed'\]/);
});
