import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  openAiApiEnabled,
  openAiApiKey,
  requireOpenAiApiKey,
} from '../../worker/openai-api-policy.mjs';

test('keeps separately billed OpenAI API workers disabled unless explicitly enabled', () => {
  assert.equal(openAiApiEnabled({ OPENAI_API_KEY: 'present-but-disabled' }), false);
  assert.equal(openAiApiKey({ OPENAI_API_KEY: 'present-but-disabled' }), undefined);
  assert.throws(
    () => requireOpenAiApiKey('Test analysis', { OPENAI_API_KEY: 'present-but-disabled' }),
    /disabled/,
  );
});

test('requires both the explicit API flag and a supported key', () => {
  const environment = {
    SITEFORGE_OPENAI_API_ENABLED: 'true',
    OPENAI_API_KEY: 'approved-api-key',
    SITEFORGE_CODEX_API_KEY: 'must-not-be-used',
  };
  assert.equal(openAiApiEnabled(environment), true);
  assert.equal(openAiApiKey(environment), 'approved-api-key');
  assert.equal(requireOpenAiApiKey('Test analysis', environment), 'approved-api-key');
});

test('keeps API-only workers dynamically tied to the owner billing switch', async () => {
  const [supervisor, capture, asset, uxVision] = await Promise.all([
    readFile(new URL('../../worker/supervisor.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../worker/capture-worker.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../worker/asset-analysis-worker.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../worker/ux-vision.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(supervisor, /function reconcileApiWorkers/);
  assert.match(supervisor, /if \(openAiApiEnabled\(\)\)/);
  assert.match(supervisor, /visual-content-worker\.mjs/);
  assert.match(supervisor, /capability-analysis-worker\.mjs/);
  assert.match(supervisor, /agent-package-worker\.mjs/);
  assert.doesNotMatch(capture, /AI capability analysis queued from the completed private capture/);
  assert.match(asset, /openAiApiKey\(process\.env, \['OPENAI_API_KEY'\]\)/);
  assert.match(uxVision, /openAiApiKey\(process\.env/);
});
