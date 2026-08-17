do $migration$
declare
  handoff_function text;
begin
  select pg_get_functiondef(
    'public.request_made_solid_handoff(uuid,text,text,text,integer,text,text,text,text,text)'::regprocedure
  )
  into handoff_function;

  if position('target_publication.repository_url' in handoff_function) > 0 then
    execute replace(
      handoff_function,
      'target_publication.repository_url',
      'target_publication.github_repository_url'
    );
  end if;
end;
$migration$;
