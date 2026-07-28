-- Earlier builder runs saved the generic `Codex CLI` label instead of the
-- configured gpt-5.6 alias. Price those records at the same published standard
-- gpt-5.6-sol rate used by the SiteForge builder on 2026-07-24.
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
  and lower(model) = 'codex cli';
