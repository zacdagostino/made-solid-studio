-- Backfill only records whose stored model is the documented standard Codex test-builder alias.
-- The calculation uses OpenAI's published standard gpt-5.6-sol rate as of 2026-07-24:
-- $5/M non-cached input, $0.50/M cached input, and $30/M output tokens.
update public.ai_usage_records
set
  cost_usd = round(
    (
      greatest(input_tokens - cached_input_tokens, 0) * 5.00 +
      cached_input_tokens * 0.50 +
      output_tokens * 30.00
    ) / 1000000.0,
    8
  ),
  cost_source = 'configured_rate',
  pricing_version = 'OpenAI API standard pricing 2026-07-24'
where source = 'codex_build'
  and cost_source = 'unavailable'
  and cost_usd is null
  and lower(model) in ('gpt-5.6', 'gpt-5.6-sol');
