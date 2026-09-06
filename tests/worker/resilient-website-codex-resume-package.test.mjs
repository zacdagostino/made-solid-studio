import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260906110000_resilient_website_codex_resume_test_package.sql',
  import.meta.url,
);
const websiteRoot = new URL('../../../made-solid-website/', import.meta.url);

test('registers resilient website Codex resume once as immutable test package v24.8', async () => {
  const [migration, repository, app, panel, bridge, bridgeTest, responsiveSpec] = await Promise.all(
    [
      readFile(migrationUrl, 'utf8'),
      readFile(new URL('../../src/lib/repository.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/App.tsx', import.meta.url), 'utf8'),
      readFile(new URL('components/ui/WorkspaceCodexPanel.tsx', websiteRoot), 'utf8'),
      readFile(new URL('public/made-solid-codex-bridge.js', websiteRoot), 'utf8'),
      readFile(new URL('tests/codex-workspace-panel.test.mjs', websiteRoot), 'utf8'),
      readFile(new URL('../e2e/responsive.spec.js', import.meta.url), 'utf8'),
    ],
  );

  assert.match(migration, /base\.organization_id,\s*24\.8,/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v24\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v24\.7'/,
  );
  assert.match(migration, /not exists/i);
  assert.match(migration, /\["visual-codex-feedback"\]/);

  assert.match(repository, /agent-package-local-v24-8-resilient-website-codex-resume/);
  assert.match(repository, /version: 24\.8,/);
  assert.match(repository, /basePackageId: localRecentRequestChatContextPackage\.id/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v24\.8'/);
  for (const ledgerStart of ['value: JSON.stringify([', 'const missingPackages = [', '} catch {']) {
    const ledger = repository.slice(repository.indexOf(ledgerStart));
    assert.ok(
      ledger.indexOf('localResilientWebsiteCodexResumePackage,') <
        ledger.indexOf('localRecentRequestChatContextPackage,'),
    );
  }

  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  assert.match(behaviour, /revision: `v\$\{selectedAgentPackage\.version\}\.115`/);
  assert.match(behaviour, /owner-only website chat now hides a discarded Android Chrome iframe/);
  assert.match(panel, /data-made-solid-codex-placeholder/);
  assert.match(panel, /Codex chat reconnecting/);
  assert.match(bridge, /window\.addEventListener\("pagehide", concealFrame\)/);
  assert.match(bridge, /source\.searchParams\.set\("resume"/);
  assert.match(bridge, /event\.origin !== trustedOrigin/);
  assert.match(bridge, /event\.source !== frame\.contentWindow/);
  assert.match(bridgeTest, /remembered open and closed panels/);
  assert.match(bridgeTest, /firstRecovery\.delay, 4_000/);
  assert.match(responsiveSpec, /agent-package-local-v24-8-resilient-website-codex-resume/);
  assert.match(responsiveSpec, /\['v24\.8', 'Resilient website Codex resume'\]/);
});
