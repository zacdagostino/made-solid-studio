create table public.visual_content_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  crawl_run_id uuid not null references public.crawl_runs on delete cascade,
  asset_id uuid not null references public.artifacts on delete cascade unique,
  source_page_url text not null,
  section_heading text not null default '',
  source_presentation text not null default 'image'
    check (source_presentation in ('image', 'carousel', 'gallery', 'unknown')),
  content_type text not null
    check (content_type in ('testimonial', 'service', 'contact', 'pricing', 'faq', 'process', 'general')),
  title text not null default '',
  body text not null default '',
  attribution text not null default '',
  source_context jsonb not null default '{}'::jsonb,
  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low')),
  review_state public.review_state not null default 'needs_review',
  human_title text not null default '',
  human_body text not null default '',
  human_attribution text not null default '',
  human_notes text not null default '',
  model text,
  model_output jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visual_content_candidates_run_idx
  on public.visual_content_candidates (crawl_run_id, source_page_url, created_at);

alter table public.visual_content_candidates enable row level security;

create policy "Members can manage recovered visual content"
  on public.visual_content_candidates for all to authenticated
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create trigger set_visual_content_candidates_updated_at
  before update on public.visual_content_candidates
  for each row execute procedure public.set_updated_at();

create or replace function public.request_visual_content_extraction(target_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  latest_capture_id uuid;
  saved_count integer;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication is required.';
  end if;

  select organization_id into target_organization_id
  from public.businesses where id = target_business_id;
  if target_organization_id is null
    or (
      auth.role() <> 'service_role'
      and not public.is_organization_member(target_organization_id)
    ) then
    raise exception 'Organization membership is required.';
  end if;

  select runs.id into latest_capture_id
  from public.crawl_runs runs
  join public.websites websites on websites.id = runs.website_id
  where websites.business_id = target_business_id
    and runs.status = 'ready'
  order by runs.completed_at desc nulls last, runs.requested_at desc
  limit 1;
  if latest_capture_id is null then
    raise exception 'A completed capture is required before visual content can be recovered.';
  end if;

  insert into public.visual_content_candidates (
    organization_id,
    business_id,
    crawl_run_id,
    asset_id,
    source_page_url,
    section_heading,
    source_presentation,
    content_type,
    title,
    body,
    attribution,
    source_context,
    confidence,
    model,
    model_output,
    analyzed_at
  )
  select
    annotations.organization_id,
    annotations.business_id,
    annotations.crawl_run_id,
    annotations.asset_id,
    coalesce(nullif(annotations.source_context->>'sourcePageUrl', ''), artifacts.metadata->>'pageUrl', ''),
    coalesce(
      nullif(annotations.source_context->>'sectionHeading', ''),
      nullif(artifacts.metadata->>'sectionHeading', ''),
      nullif(
        substring(
          concat_ws(
            ' ',
            annotations.source_context->>'surroundingContext',
            artifacts.metadata->>'context'
          )
          from '(?i)(customer feedback|client feedback|feedback|testimonials?|reviews?|our services|services|contact us|contact|pricing|frequently asked questions|faq|how it works|our process)'
        ),
        ''
      ),
      ''
    ),
    case
      when concat_ws(' ', annotations.observed_description, annotations.source_context->>'surroundingContext')
        ~* '\m(carousel|slider|slideshow)\M' then 'carousel'
      when concat_ws(' ', annotations.observed_description, annotations.source_context->>'surroundingContext')
        ~* '\mgallery\M' then 'gallery'
      else 'image'
    end,
    case
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(testimonial|review|feedback|quote|customer says|client says)\M' then 'testimonial'
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(price|pricing|per month|per hour|from \\$|cost)\M' then 'pricing'
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(faq|frequently asked|question|answer)\M' then 'faq'
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(phone|email|contact|address|opening hours)\M' then 'contact'
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(process|how it works|step [0-9])\M' then 'process'
      when concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
        ~* '\m(service|maintenance|installation|response|repair|support)\M' then 'service'
      else 'general'
    end,
    '',
    array_to_string(annotations.visible_text, E'\n'),
    '',
    jsonb_build_object(
      'assetId', annotations.asset_id,
      'sourceImageUrl', coalesce(annotations.source_context->>'originalImageUrl', artifacts.metadata->>'sourceUrl', ''),
      'surroundingContext', coalesce(annotations.source_context->>'surroundingContext', artifacts.metadata->>'context', ''),
      'observedDescription', annotations.observed_description,
      'sourcePresentationIsNotAnInstruction', true
    ),
    annotations.confidence,
    annotations.model,
    annotations.model_output,
    annotations.analyzed_at
  from public.asset_annotations annotations
  join public.artifacts artifacts on artifacts.id = annotations.asset_id
  where annotations.crawl_run_id = latest_capture_id
    and cardinality(annotations.visible_text) > 0
    and annotations.suggested_role not in ('primary_logo', 'secondary_mark', 'partner_logo', 'supplier_logo', 'exclude')
    and concat_ws(' ', annotations.observed_description, array_to_string(annotations.visible_text, ' '))
      ~* '\m(testimonial|review|feedback|quote|customer|client|service|maintenance|installation|response|repair|support|price|pricing|contact|phone|email|address|hours|faq|question|answer|process|step)\M'
  on conflict (asset_id) do update set
    source_page_url = excluded.source_page_url,
    section_heading = excluded.section_heading,
    source_presentation = excluded.source_presentation,
    content_type = excluded.content_type,
    title = excluded.title,
    body = excluded.body,
    attribution = excluded.attribution,
    source_context = excluded.source_context,
    confidence = excluded.confidence,
    model = excluded.model,
    model_output = excluded.model_output,
    analyzed_at = excluded.analyzed_at
  where visual_content_candidates.review_state = 'needs_review';

  get diagnostics saved_count = row_count;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    target_organization_id,
    target_business_id,
    'note',
    concat(
      saved_count,
      ' semantic content candidate',
      case when saved_count = 1 then '' else 's' end,
      ' recovered from saved image analysis without recapturing the website.'
    )
  );
  return saved_count;
end;
$$;

grant execute on function public.request_visual_content_extraction(uuid) to authenticated;
grant execute on function public.request_visual_content_extraction(uuid) to service_role;
