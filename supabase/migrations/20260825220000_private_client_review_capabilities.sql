alter table public.builder_preview_access
  drop constraint if exists builder_preview_access_preview_mode_check;

alter table public.builder_preview_access
  add constraint builder_preview_access_preview_mode_check
  check (preview_mode in ('ready', 'draft', 'review'));

comment on column public.builder_preview_access.preview_mode is
  'ready and draft capabilities are private Studio links; review capabilities are expiring, revocable Clientspace-only links for quality-approved full-site builds.';
