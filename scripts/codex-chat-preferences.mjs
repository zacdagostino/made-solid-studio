import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const defaultPreferences = Object.freeze({
  modelId: '',
  effortByModel: {},
  workMode: 'team',
  fastMode: false,
  autoReadCodex: false,
  speechLanguage: 'en-AU',
  speechRate: 1,
  speechStyle: 'natural',
  speechVoice: 'Aoede',
});

function boundedString(value, fallback, maximumLength = 100) {
  return typeof value === 'string' && value.trim() && value.length <= maximumLength
    ? value
    : fallback;
}

export function normalizeCodexChatPreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Codex chat preferences are invalid.');
  }
  const effortByModel = Object.fromEntries(
    Object.entries(
      value.effortByModel && typeof value.effortByModel === 'object' ? value.effortByModel : {},
    )
      .filter(
        ([model, effort]) =>
          model.length > 0 &&
          model.length <= 100 &&
          typeof effort === 'string' &&
          effort.length > 0 &&
          effort.length <= 40,
      )
      .slice(0, 50),
  );
  const speechRate = Number(value.speechRate);
  return {
    modelId: boundedString(value.modelId, defaultPreferences.modelId),
    effortByModel,
    workMode: value.workMode === 'direct' ? 'direct' : 'team',
    fastMode: value.fastMode === true,
    autoReadCodex: value.autoReadCodex === true,
    speechLanguage: boundedString(value.speechLanguage, defaultPreferences.speechLanguage, 35),
    speechRate: [0.85, 1, 1.15].includes(speechRate) ? speechRate : defaultPreferences.speechRate,
    speechStyle: value.speechStyle === 'literal' ? 'literal' : 'natural',
    speechVoice: boundedString(value.speechVoice, defaultPreferences.speechVoice),
  };
}

export class CodexChatPreferencesStore {
  constructor({ storagePath }) {
    this.storagePath = storagePath;
    this.pendingWrite = Promise.resolve();
  }

  async state() {
    try {
      const value = JSON.parse(await readFile(this.storagePath, 'utf8'));
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { version: 1, preferencesByUser: {} };
    } catch {
      return { version: 1, preferencesByUser: {} };
    }
  }

  async read(userId = 'local-owner') {
    const state = await this.pendingWrite.then(() => this.state());
    const preferences = state.preferencesByUser?.[userId];
    return preferences ? normalizeCodexChatPreferences(preferences) : null;
  }

  write(userId = 'local-owner', preferences) {
    const normalized = normalizeCodexChatPreferences(preferences);
    const update = this.pendingWrite.then(async () => {
      const current = await this.state();
      const next = {
        version: 1,
        preferencesByUser: {
          ...(current.preferencesByUser || {}),
          [userId]: normalized,
        },
      };
      await mkdir(dirname(this.storagePath), { recursive: true, mode: 0o700 });
      const temporaryPath = `${this.storagePath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
      await rename(temporaryPath, this.storagePath);
      return normalized;
    });
    this.pendingWrite = update.catch(() => undefined);
    return update;
  }
}
