import {
  apiCreditsBillingMode,
  runtimeAiBillingMode,
  runtimeAiApiKey,
} from '../scripts/runtime-ai-billing.mjs';

const enabledValue = 'true';

export function openAiApiEnabled(environment = process.env) {
  return (
    runtimeAiBillingMode(environment) === apiCreditsBillingMode ||
    environment.SITEFORGE_OPENAI_API_ENABLED?.trim().toLowerCase() === enabledValue
  );
}

export function openAiApiKey(environment = process.env, names = ['OPENAI_API_KEY']) {
  if (!openAiApiEnabled(environment)) return undefined;
  for (const name of names) {
    const value = environment[name]?.trim();
    if (value) return value;
  }
  return runtimeAiApiKey(environment);
}

export function requireOpenAiApiKey(
  feature,
  environment = process.env,
  names = ['OPENAI_API_KEY'],
) {
  if (!openAiApiEnabled(environment)) {
    throw new Error(
      `${feature} is disabled. Set SITEFORGE_OPENAI_API_ENABLED=true only after approving separately billed OpenAI API usage.`,
    );
  }
  const key = openAiApiKey(environment, names);
  if (!key) {
    throw new Error(`${names.join(' or ')} is required when ${feature} is enabled.`);
  }
  return key;
}
