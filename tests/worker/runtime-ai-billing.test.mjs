import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  apiCreditsBillingMode,
  runtimeAiBillingMode,
  runtimeAiBillingStatus,
  subscriptionBillingMode,
  writeRuntimeAiBillingMode,
} from '../../scripts/runtime-ai-billing.mjs';
import { openAiApiEnabled, openAiApiKey } from '../../worker/openai-api-policy.mjs';

const repositoryRoot = new URL('../../', import.meta.url);

test('defaults to subscription and requires a server-side key before API credits', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'siteforge-ai-billing-'));
  const environment = { SITEFORGE_RUNTIME_DATA_DIR: dataDirectory };
  try {
    assert.equal(runtimeAiBillingMode(environment), subscriptionBillingMode);
    assert.deepEqual(runtimeAiBillingStatus(environment), {
      apiKeyConfigured: false,
      label: 'ChatGPT subscription',
      mode: subscriptionBillingMode,
    });
    await assert.rejects(
      writeRuntimeAiBillingMode(apiCreditsBillingMode, environment),
      /server-side OpenAI API key/,
    );
  } finally {
    await rm(dataDirectory, { recursive: true });
  }
});

test('persists the owner billing choice without exposing the configured key', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'siteforge-ai-billing-'));
  const environment = {
    SITEFORGE_RUNTIME_DATA_DIR: dataDirectory,
    SITEFORGE_CODEX_API_KEY: 'server-secret',
  };
  try {
    const enabled = await writeRuntimeAiBillingMode(apiCreditsBillingMode, environment);
    assert.deepEqual(enabled, {
      apiKeyConfigured: true,
      label: 'OpenAI API credits',
      mode: apiCreditsBillingMode,
    });
    assert.equal(JSON.stringify(enabled).includes('server-secret'), false);
    assert.equal(runtimeAiBillingMode(environment), apiCreditsBillingMode);
    assert.equal(openAiApiEnabled(environment), true);
    assert.equal(openAiApiKey(environment), 'server-secret');

    const stored = await readFile(join(dataDirectory, 'runtime', 'ai-billing-mode.json'), 'utf8');
    assert.equal(stored.includes('server-secret'), false);
    await writeRuntimeAiBillingMode(subscriptionBillingMode, environment);
    assert.equal(runtimeAiBillingMode(environment), subscriptionBillingMode);
  } finally {
    await rm(dataDirectory, { recursive: true });
  }
});

test('keeps the Railway switch owner-only and restarts only mode-sensitive processes', async () => {
  const [plugin, runtime, launcher, supervisor, builder] = await Promise.all([
    readFile(new URL('scripts/local-workspace-vite-plugin.mjs', repositoryRoot), 'utf8'),
    readFile(new URL('scripts/start-railway-runtime', repositoryRoot), 'utf8'),
    readFile(new URL('scripts/start-codex-app-server', repositoryRoot), 'utf8'),
    readFile(new URL('worker/supervisor.mjs', repositoryRoot), 'utf8'),
    readFile(new URL('worker/builder-worker.mjs', repositoryRoot), 'utf8'),
  ]);
  assert.ok(
    plugin.indexOf("requestUrl.pathname.startsWith('/__made-solid/')") <
      plugin.indexOf('requestUrl.pathname === aiBillingModeEndpoint'),
  );
  assert.match(plugin, /runtimeAiBillingStatus\(\)/);
  assert.match(plugin, /writeRuntimeAiBillingMode\(mode\)/);
  assert.match(runtime, /AI billing mode changed; restarting the Codex Workspace Agent/);
  assert.match(launcher, /CODEX_API_KEY="\$codex_api_key"/);
  assert.match(launcher, /forced_login_method="chatgpt"/);
  assert.match(supervisor, /reconcileApiWorkers/);
  assert.match(builder, /billingMode: 'api_usage'/);
  assert.match(builder, /billingMode: 'chatgpt_subscription'/);
});
