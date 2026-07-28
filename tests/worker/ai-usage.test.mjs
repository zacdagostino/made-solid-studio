import assert from 'node:assert/strict';
import test from 'node:test';
import { codexUsage, pricedUsage, responseUsage } from '../../worker/ai-usage.mjs';

test('normalises Responses API and Codex CLI token usage without inventing totals', () => {
  assert.deepEqual(
    responseUsage({
      input_tokens: 120,
      output_tokens: 45,
      total_tokens: 165,
      input_tokens_details: { cached_tokens: 20 },
      output_tokens_details: { reasoning_tokens: 30 },
    }),
    {
      inputTokens: 120,
      cachedInputTokens: 20,
      outputTokens: 45,
      reasoningTokens: 30,
      totalTokens: 165,
    },
  );
  assert.deepEqual(
    responseUsage({ input_tokens: 80, cached_input_tokens: 10, output_tokens: 25 }),
    {
      inputTokens: 80,
      cachedInputTokens: 10,
      outputTokens: 25,
      reasoningTokens: 0,
      totalTokens: 105,
    },
  );
  assert.deepEqual(
    codexUsage([{ type: 'turn.completed', usage: { input_tokens: 80, output_tokens: 25 } }]),
    { input_tokens: 80, output_tokens: 25 },
  );
});

test('prices the documented gpt-5.6 Codex builder alias at the published standard rate', () => {
  const originalRateCard = process.env.SITEFORGE_AI_PRICING_JSON;
  delete process.env.SITEFORGE_AI_PRICING_JSON;

  try {
    assert.deepEqual(
      pricedUsage({
        model: 'gpt-5.6',
        usage: {
          input_tokens: 1_000_000,
          input_tokens_details: { cached_tokens: 200_000 },
          output_tokens: 100_000,
        },
      }),
      {
        inputTokens: 1_000_000,
        cachedInputTokens: 200_000,
        outputTokens: 100_000,
        reasoningTokens: 0,
        totalTokens: 1_100_000,
        costUsd: 7.1,
        costSource: 'configured_rate',
        pricingVersion: 'OpenAI API standard pricing 2026-07-24',
      },
    );
  } finally {
    if (originalRateCard === undefined) delete process.env.SITEFORGE_AI_PRICING_JSON;
    else process.env.SITEFORGE_AI_PRICING_JSON = originalRateCard;
  }
});

test('prices legacy Codex CLI build records at the same standard builder rate', () => {
  const originalRateCard = process.env.SITEFORGE_AI_PRICING_JSON;
  delete process.env.SITEFORGE_AI_PRICING_JSON;

  try {
    assert.equal(
      pricedUsage({
        model: 'Codex CLI',
        usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      }).costUsd,
      35,
    );
  } finally {
    if (originalRateCard === undefined) delete process.env.SITEFORGE_AI_PRICING_JSON;
    else process.env.SITEFORGE_AI_PRICING_JSON = originalRateCard;
  }
});
