create or replace function public.validate_visual_content_candidate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  annotation_role text;
begin
  select suggested_role into annotation_role
  from public.asset_annotations
  where asset_id = new.asset_id;

  if length(trim(new.body)) < 20
    or annotation_role in ('worksite_photo', 'team_photo', 'project_photo') then
    return null;
  end if;

  if concat_ws(' ', new.source_context->>'observedDescription', new.body)
    ~* '\m(testimonial|review|feedback|quote|praises?|compliments?)\M' then
    new.content_type := 'testimonial';
  end if;

  return new;
end;
$$;

create trigger validate_visual_content_candidate_before_write
  before insert or update of body, content_type, source_context
  on public.visual_content_candidates
  for each row execute procedure public.validate_visual_content_candidate();

delete from public.visual_content_candidates candidates
using public.asset_annotations annotations
where annotations.asset_id = candidates.asset_id
  and candidates.review_state = 'needs_review'
  and (
    length(trim(candidates.body)) < 20
    or annotations.suggested_role in ('worksite_photo', 'team_photo', 'project_photo')
  );

update public.visual_content_candidates
set content_type = 'testimonial'
where review_state = 'needs_review'
  and concat_ws(' ', source_context->>'observedDescription', body)
    ~* '\m(testimonial|review|feedback|quote|praises?|compliments?)\M';
