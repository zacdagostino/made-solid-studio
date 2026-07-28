alter table public.brand_kits
  add column if not exists white_logo_artifact_id uuid references public.artifacts on delete restrict;

comment on column public.brand_kits.white_logo_artifact_id is
  'Human-approved, derived white SVG logo variant for use on dark surfaces. The captured source logo remains immutable evidence.';
