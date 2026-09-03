import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  CodexChatPreferencesStore,
  normalizeCodexChatPreferences,
} from '../../scripts/codex-chat-preferences.mjs';

test('persists owner-scoped Codex chat preferences outside browser storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-preferences-'));
  const storagePath = join(directory, 'preferences.json');
  const store = new CodexChatPreferencesStore({ storagePath });
  const preferences = {
    modelId: 'gpt-5.6-terra',
    effortByModel: { 'gpt-5.6-terra': 'high' },
    workMode: 'direct',
    fastMode: true,
    autoReadCodex: true,
    speechLanguage: 'en-AU',
    speechRate: 1.15,
    speechStyle: 'literal',
    speechVoice: 'en-AU-Chirp3-HD-Aoede',
  };

  await store.write('owner-a', preferences);
  assert.deepEqual(
    await new CodexChatPreferencesStore({ storagePath }).read('owner-a'),
    preferences,
  );
  assert.equal(await store.read('owner-b'), null);
  assert.match(await readFile(storagePath, 'utf8'), /"owner-a"/);
});

test('normalizes untrusted Codex preference values to bounded supported choices', () => {
  assert.deepEqual(
    normalizeCodexChatPreferences({
      effortByModel: { valid: 'medium', invalid: 4 },
      fastMode: 'yes',
      speechRate: 99,
      speechStyle: 'unknown',
      workMode: 'unknown',
    }),
    {
      modelId: '',
      effortByModel: { valid: 'medium' },
      workMode: 'team',
      fastMode: false,
      autoReadCodex: false,
      speechLanguage: 'en-AU',
      speechRate: 1,
      speechStyle: 'natural',
      speechVoice: 'Aoede',
    },
  );
});
