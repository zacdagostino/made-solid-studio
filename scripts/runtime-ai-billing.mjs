import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const subscriptionBillingMode = 'chatgpt_subscription';
export const apiCreditsBillingMode = 'api_credits';

export function runtimeAiBillingPath(environment = process.env) {
  const dataDirectory = environment.SITEFORGE_RUNTIME_DATA_DIR?.trim();
  if (!dataDirectory) return undefined;
  return resolve(dataDirectory, 'runtime', 'ai-billing-mode.json');
}

export function runtimeAiApiKey(environment = process.env) {
  return (
    environment.SITEFORGE_CODEX_API_KEY?.trim() || environment.OPENAI_API_KEY?.trim() || undefined
  );
}

export function runtimeAiBillingMode(environment = process.env) {
  const path = runtimeAiBillingPath(environment);
  if (path) {
    try {
      const document = JSON.parse(readFileSync(path, 'utf8'));
      if (document?.mode === apiCreditsBillingMode) return apiCreditsBillingMode;
    } catch {
      // A missing or incomplete preference always fails closed to subscription access.
    }
  }
  return subscriptionBillingMode;
}

export function runtimeAiBillingStatus(environment = process.env) {
  const mode = runtimeAiBillingMode(environment);
  const apiKeyConfigured = Boolean(runtimeAiApiKey(environment));
  return {
    apiKeyConfigured,
    mode,
    label: mode === apiCreditsBillingMode ? 'OpenAI API credits' : 'ChatGPT subscription',
  };
}

export async function writeRuntimeAiBillingMode(mode, environment = process.env) {
  if (mode !== subscriptionBillingMode && mode !== apiCreditsBillingMode) {
    throw new Error('Choose ChatGPT subscription or OpenAI API credits.');
  }
  if (mode === apiCreditsBillingMode && !runtimeAiApiKey(environment)) {
    throw new Error('Add a server-side OpenAI API key before enabling API credits.');
  }
  const path = runtimeAiBillingPath(environment);
  if (!path) throw new Error('The persistent Railway runtime data directory is unavailable.');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ mode, updatedAt: new Date().toISOString() })}\n`, {
    mode: 0o600,
  });
  return runtimeAiBillingStatus(environment);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.stdout.write(`${runtimeAiBillingMode()}\n`);
}
