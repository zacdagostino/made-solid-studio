export const openAiApiFeaturesEnabled =
  import.meta.env.VITE_SITEFORGE_OPENAI_API_ENABLED?.trim().toLowerCase() === 'true';

export function confirmOpenAiApiUsage(feature: string) {
  if (!openAiApiFeaturesEnabled) return true;
  return window.confirm(
    `${feature} uses the separately billed OpenAI API. It is not included in your ChatGPT subscription. Continue with this API-billed operation?`,
  );
}
