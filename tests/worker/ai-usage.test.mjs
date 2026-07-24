import assert from 'node:assert/strict';
import test from 'node:test';
import { codexUsage, responseUsage } from '../../worker/ai-usage.mjs';

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
