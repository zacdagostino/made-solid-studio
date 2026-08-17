/**
 * Persists provider-reported AI usage as a ledger. A deployment-specific rate
 * card takes priority, with published OpenAI rates used for the standard Codex
 * test-builder model so its recorded token usage is not needlessly unpriced.
 */
const PUBLISHED_OPENAI_PRICING_VERSION = 'OpenAI API standard pricing 2026-07-24';
const PUBLISHED_OPENAI_PRICING = Object.freeze({
  // `gpt-5.6` is the builder's documented alias for the standard gpt-5.6-sol rate.
  'gpt-5.6': { inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30 },
  'gpt-5.6-sol': { inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30 },
  // Older runs recorded the CLI label when no explicit model was supplied.
  'codex cli': { inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30 },
});
const PUBLISHED_CODEX_CREDITS_VERSION = 'ChatGPT Codex token credits 2026-08-04';
const PUBLISHED_CODEX_CREDITS = Object.freeze({
  'gpt-5.6-sol': { inputPerMillion: 125, cachedInputPerMillion: 12.5, outputPerMillion: 750 },
  'gpt-5.6-terra': { inputPerMillion: 50, cachedInputPerMillion: 5, outputPerMillion: 300 },
  'gpt-5.6-luna': { inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30 },
});
function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

export function responseUsage(value) {
  const usage = record(value);
  const inputDetails = record(usage.input_tokens_details);
  const outputDetails = record(usage.output_tokens_details);
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  return {
    inputTokens,
    cachedInputTokens: number(inputDetails.cached_tokens) || number(usage.cached_input_tokens),
    outputTokens,
    reasoningTokens: number(outputDetails.reasoning_tokens) || number(usage.reasoning_tokens),
    totalTokens: number(usage.total_tokens) || inputTokens + outputTokens,
  };
}

export function codexUsage(events) {
  const entries = Array.isArray(events) ? events : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const event = record(entries[index]);
    const item = record(event.item);
    const usage = record(event.usage);
    const itemUsage = record(item.usage);
    if (Object.keys(usage).length) return usage;
    if (Object.keys(itemUsage).length) return itemUsage;
  }
  return undefined;
}

function configuredPrice(model) {
  const raw = process.env.SITEFORGE_AI_PRICING_JSON?.trim();
  if (!raw) return undefined;
  try {
    const prices = record(JSON.parse(raw));
    const value = record(prices[model] ?? prices.default);
    const inputPerMillion = number(value.inputPerMillion);
    const cachedInputPerMillion = number(value.cachedInputPerMillion || inputPerMillion);
    const outputPerMillion = number(value.outputPerMillion);
    if (!inputPerMillion && !outputPerMillion) return undefined;
    return { inputPerMillion, cachedInputPerMillion, outputPerMillion };
  } catch {
    console.warn('[ai-usage] SITEFORGE_AI_PRICING_JSON is not valid JSON; costs will be unpriced.');
    return undefined;
  }
}

function publishedOpenAiPrice(model) {
  const price = PUBLISHED_OPENAI_PRICING[model.trim().toLowerCase()];
  return price ? { ...price, pricingVersion: PUBLISHED_OPENAI_PRICING_VERSION } : undefined;
}

export function pricedUsage({ model, usage }) {
  const normalized = responseUsage(usage);
  const configured = configuredPrice(model);
  const published = configured ? undefined : publishedOpenAiPrice(model);
  const price = configured ?? published;
  if (!price)
    return { ...normalized, costUsd: null, costSource: 'unavailable', pricingVersion: null };
  const nonCachedInput = Math.max(0, normalized.inputTokens - normalized.cachedInputTokens);
  const costUsd =
    (nonCachedInput * price.inputPerMillion +
      normalized.cachedInputTokens * price.cachedInputPerMillion +
      normalized.outputTokens * price.outputPerMillion) /
    1_000_000;
  return {
    ...normalized,
    costUsd: Number(costUsd.toFixed(8)),
    costSource: 'configured_rate',
    pricingVersion: configured ? 'SITEFORGE_AI_PRICING_JSON' : published.pricingVersion,
  };
}

export function creditedUsage({ model, usage }) {
  const normalized = responseUsage(usage);
  const rate = PUBLISHED_CODEX_CREDITS[model.trim().toLowerCase()];
  if (!rate) return { credits: null, creditPricingVersion: null };
  const nonCachedInput = Math.max(0, normalized.inputTokens - normalized.cachedInputTokens);
  const credits =
    (nonCachedInput * rate.inputPerMillion +
      normalized.cachedInputTokens * rate.cachedInputPerMillion +
      normalized.outputTokens * rate.outputPerMillion) /
    1_000_000;
  return {
    credits: Number(credits.toFixed(4)),
    creditPricingVersion: PUBLISHED_CODEX_CREDITS_VERSION,
  };
}

export async function recordAiUsage(client, payload) {
  const normalized = responseUsage(payload.usage);
  const subscriptionBacked = payload.billingMode === 'chatgpt_subscription';
  const priced = subscriptionBacked
    ? {
        ...normalized,
        costUsd: null,
        costSource: 'unavailable',
        pricingVersion: null,
      }
    : pricedUsage(payload);
  const credited = creditedUsage(payload);
  const { error } = await client.from('ai_usage_records').insert({
    organization_id: payload.organizationId,
    business_id: payload.businessId,
    builder_run_id: payload.builderRunId ?? null,
    source: payload.source,
    provider: payload.provider ?? 'OpenAI',
    model: payload.model,
    input_tokens: priced.inputTokens,
    cached_input_tokens: priced.cachedInputTokens,
    output_tokens: priced.outputTokens,
    reasoning_tokens: priced.reasoningTokens,
    total_tokens: priced.totalTokens,
    cost_usd: priced.costUsd,
    cost_source: priced.costSource,
    pricing_version: priced.pricingVersion,
    metadata: {
      ...(payload.metadata ?? {}),
      billingMode: payload.billingMode ?? 'api_usage',
      ...credited,
    },
  });
  if (error) throw new Error('The worker could not save AI usage for this operation.');
}
