import assert from 'node:assert/strict';
import test from 'node:test';
import {
  codexUsage,
  creditedUsage,
  pricedUsage,
  recordAiUsage,
  responseUsage,
} from '../../worker/ai-usage.mjs';

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

test('records exact token-credit estimates for named Codex execution profiles', () => {
  const usage = {
    input_tokens: 1_000_000,
    input_tokens_details: { cached_tokens: 200_000 },
    output_tokens: 100_000,
  };
  assert.deepEqual(creditedUsage({ model: 'gpt-5.6-sol', usage }), {
    credits: 177.5,
    creditPricingVersion: 'ChatGPT Codex token credits 2026-08-04',
  });
  assert.deepEqual(creditedUsage({ model: 'gpt-5.6-terra', usage }), {
    credits: 71,
    creditPricingVersion: 'ChatGPT Codex token credits 2026-08-04',
  });
  assert.deepEqual(creditedUsage({ model: 'Codex CLI', usage }), {
    credits: null,
    creditPricingVersion: null,
  });
});

test('records ChatGPT subscription builds without estimating API spend', async () => {
  const inserted = [];
  const client = {
    from(table) {
      assert.equal(table, 'ai_usage_records');
      return {
        async insert(value) {
          inserted.push(value);
          return { error: null };
        },
      };
    },
  };
  await recordAiUsage(client, {
    organizationId: 'organisation-1',
    businessId: 'business-1',
    builderRunId: 'build-1',
    source: 'codex_build',
    model: 'gpt-5.6-sol',
    billingMode: 'chatgpt_subscription',
    usage: { input_tokens: 1_000_000, output_tokens: 100_000 },
  });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].cost_usd, null);
  assert.equal(inserted[0].cost_source, 'unavailable');
  assert.equal(inserted[0].pricing_version, null);
  assert.equal(inserted[0].metadata.billingMode, 'chatgpt_subscription');
  assert.equal(inserted[0].metadata.credits, 200);
});
