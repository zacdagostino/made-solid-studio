alter table public.ai_usage_records
  drop constraint ai_usage_records_source_check;

alter table public.ai_usage_records
  add constraint ai_usage_records_source_check
  check (
    source in (
      'asset_analysis',
      'capability_analysis',
      'visual_content_structure',
      'codex_build'
    )
  );
