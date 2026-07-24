/**
 * Persists provider-reported AI usage as a ledger. Costs are deliberately only
 * stored when the worker has an explicit configured price; token counts alone
 * must never be presented as a billed amount.
 */
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

export function pricedUsage({ model, usage }) {
  const normalized = responseUsage(usage);
  const price = configuredPrice(model);
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
    pricingVersion: 'SITEFORGE_AI_PRICING_JSON',
  };
}

export async function recordAiUsage(client, payload) {
  const priced = pricedUsage(payload);
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
    metadata: payload.metadata ?? {},
  });
  if (error) throw new Error('The worker could not save AI usage for this operation.');
}
