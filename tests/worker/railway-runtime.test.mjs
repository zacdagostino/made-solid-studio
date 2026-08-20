import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createWorkspacePreviewToken,
  verifyWorkspacePreviewToken,
  workspacePreviewUrl,
} from '../../scripts/workspace-preview-access.mjs';

const secret = 'a-private-preview-secret-that-is-longer-than-thirty-two-characters';

test('creates expiring private workspace preview capabilities', () => {
  const token = createWorkspacePreviewToken('prospect-site', secret, {
    now: 1_000,
    lifetimeMs: 60_000,
  });
  assert.deepEqual(verifyWorkspacePreviewToken(token, secret, { now: () => 2_000 }), {
    directory: 'prospect-site',
    expiresAt: 61_000,
  });
  assert.equal(
    verifyWorkspacePreviewToken(token, `${secret}-wrong`, { now: () => 2_000 }),
    undefined,
  );
  assert.equal(verifyWorkspacePreviewToken(token, secret, { now: () => 61_001 }), undefined);
  const url = new URL(
    workspacePreviewUrl('https://workspace.example.com', 'prospect-site', secret),
  );
  assert.equal(url.origin, 'https://workspace.example.com');
  assert.ok(url.searchParams.get('access'));
});

test('registers a single-volume Singapore Railway runtime with a health check', async () => {
  const [configurationSource, viteConfiguration] = await Promise.all([
    readFile('railway.json', 'utf8'),
    readFile('vite.config.ts', 'utf8'),
  ]);
  const configuration = JSON.parse(configurationSource);
  assert.equal(configuration.build.builder, 'DOCKERFILE');
  assert.equal(configuration.deploy.healthcheckPath, '/health');
  assert.equal(configuration.deploy.multiRegionConfig['asia-southeast1-eqsg3a'].numReplicas, 1);
  assert.equal(configuration.deploy.restartPolicyType, 'ALWAYS');
  assert.match(viteConfiguration, /healthcheck\.railway\.app/);
  assert.match(viteConfiguration, /SITEFORGE_PUBLIC_ORIGIN/);
  assert.match(
    viteConfiguration,
    /frame-ancestors 'self' https:\/\/madesolid\.com\.au https:\/\/www\.madesolid\.com\.au/,
  );
});

test('keeps the Railway workspace-write package newest in the local package ledger', async () => {
  const repository = await readFile('src/lib/repository.ts', 'utf8');
  assert.match(repository, /version: 16,/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v16\.0'/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localRailwayWorkspaceWritePackage,') <
      ledger.indexOf('localPermanentRailwayRuntimePackage,'),
  );
});

test('keeps OpenAI API credentials out of the subscription-backed Railway processes', async () => {
  const [dockerfile, launcher, appServerLauncher] = await Promise.all([
    readFile('Dockerfile', 'utf8'),
    readFile('scripts/start-railway-runtime', 'utf8'),
    readFile('scripts/start-codex-app-server', 'utf8'),
  ]);
  assert.match(dockerfile, /@openai\/codex@0\.148\.0/);
  assert.match(launcher, /SITEFORGE_CODEX_AUTH_MODE=chatgpt/);
  assert.match(launcher, /SITEFORGE_OPENAI_API_ENABLED=false/);
  assert.match(launcher, /unset OPENAI_API_KEY SITEFORGE_CODEX_API_KEY CODEX_API_KEY/);
  assert.match(launcher, /SITEFORGE_RUNTIME_AUTH_REQUIRED=1/);
  assert.match(launcher, /SITEFORGE_RUNTIME_OWNER_USER_ID/);
  assert.match(launcher, /SITEFORGE_RUNTIME_OWNER_ORGANIZATION_ID/);
  assert.match(appServerLauncher, /forced_login_method="chatgpt"/);
  assert.match(appServerLauncher, /sandbox_mode="workspace-write"/);
  assert.match(appServerLauncher, /approval_policy="never"/);
  assert.match(appServerLauncher, /sandbox_workspace_write\.writable_roots=/);
  assert.match(appServerLauncher, /sandbox_workspace_write\.network_access=true/);
  assert.match(appServerLauncher, /--strict-config app-server/);
  assert.match(appServerLauncher, /expected_studio_workspace=.*siteforge-os/);
  assert.match(appServerLauncher, /expected_website_workspace=.*made-solid-website/);
});
