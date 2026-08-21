import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import {
  createWorkspacePreviewToken,
  verifyWorkspacePreviewToken,
  workspacePreviewUrl,
} from '../../scripts/workspace-preview-access.mjs';
import {
  startWorkspacePreviewProxy,
  workspacePreviewReentryUrl,
} from '../../scripts/workspace-preview-proxy.mjs';

const secret = 'a-private-preview-secret-that-is-longer-than-thirty-two-characters';
const execFile = promisify(execFileCallback);

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
  assert.equal(
    verifyWorkspacePreviewToken(createWorkspacePreviewToken('prospect-site', secret), secret)
      ?.directory,
    'prospect-site',
  );
  const url = new URL(
    workspacePreviewUrl('https://workspace.example.com', 'prospect-site', secret),
  );
  assert.equal(url.origin, 'https://workspace.example.com');
  assert.ok(url.searchParams.get('access'));
});

test('returns expired workspace documents through the stable authenticated Studio route', async () => {
  assert.equal(
    workspacePreviewReentryUrl('https://studio.madesolid.com.au', '/services?viewport=mobile'),
    'https://studio.madesolid.com.au/#/workspace-preview-access?path=%2Fservices%3Fviewport%3Dmobile',
  );

  const server = startWorkspacePreviewProxy({
    activePreviewPath: '/tmp/not-read-without-valid-access.json',
    port: 0,
    secret,
    studioOrigin: 'https://studio.madesolid.com.au',
  });
  if (!server.listening) await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const origin = `http://127.0.0.1:${address.port}`;
    const documentResponse = await fetch(`${origin}/services?viewport=mobile`, {
      headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' },
      redirect: 'manual',
    });
    assert.equal(documentResponse.status, 303);
    assert.equal(
      documentResponse.headers.get('location'),
      'https://studio.madesolid.com.au/#/workspace-preview-access?path=%2Fservices%3Fviewport%3Dmobile',
    );

    const assetResponse = await fetch(`${origin}/assets/site.css`, {
      headers: { Accept: 'text/css' },
      redirect: 'manual',
    });
    assert.equal(assetResponse.status, 404);
    assert.equal(await assetResponse.text(), 'Private workspace preview unavailable.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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

test('preserves verified persistent repositories when GitHub is temporarily unavailable', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-railway-workspaces-'));
  const workspaceRoot = join(fixtureRoot, 'workspaces');
  const fakeBin = join(fixtureRoot, 'bin');
  await mkdir(fakeBin, { recursive: true });
  const fakeGh = join(fakeBin, 'gh');
  await writeFile(fakeGh, '#!/usr/bin/env bash\nexit 1\n');
  await chmod(fakeGh, 0o755);

  try {
    for (const [directory, repository] of [
      ['siteforge-os', 'zacdagostino/made-solid-studio'],
      ['made-solid-website', 'zacdagostino/made-solid-website'],
    ]) {
      const destination = join(workspaceRoot, directory);
      await mkdir(destination, { recursive: true });
      await execFile('git', ['init', '-q', destination]);
      await execFile('git', [
        '-C',
        destination,
        'remote',
        'add',
        'origin',
        `https://github.com/${repository}.git`,
      ]);
    }

    const { stdout } = await execFile('bash', ['scripts/bootstrap-railway-workspaces'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH}`,
        SITEFORGE_GITHUB_TOKEN: 'unavailable-test-token',
        SITEFORGE_RUNTIME_WORKSPACES_DIR: workspaceRoot,
      },
    });
    assert.match(stdout, /preserving both verified persistent repository checkouts/);
    assert.match(stdout, /editable repositories are ready/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('retains Railway container access below the newer chat and preview packages', async () => {
  const repository = await readFile('src/lib/repository.ts', 'utf8');
  assert.match(repository, /version: 16\.2,/);
  assert.match(repository, /builderContractVersion: 'made-solid-studio-builder-agent-v16\.2'/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localRailwayContainerAccessPackage,') <
      ledger.indexOf('localRailwayPersistentCheckoutPackage,'),
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
  assert.match(appServerLauncher, /sandbox_mode="danger-full-access"/);
  assert.match(appServerLauncher, /approval_policy="never"/);
  assert.doesNotMatch(appServerLauncher, /sandbox_workspace_write/);
  assert.match(appServerLauncher, /--strict-config app-server/);
  assert.match(appServerLauncher, /expected_studio_workspace=.*siteforge-os/);
  assert.match(appServerLauncher, /expected_website_workspace=.*made-solid-website/);
});
