alter table public.brand_kits
  rename column white_logo_artifact_id to editable_logo_artifact_id;

comment on column public.brand_kits.editable_logo_artifact_id is
  'Human-approved, derived editable SVG logo. The captured source logo remains immutable evidence.';
