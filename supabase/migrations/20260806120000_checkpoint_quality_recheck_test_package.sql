-- Reapply protected runtime and deterministic Brand Kit guarantees to an
-- immutable saved source checkpoint without paying for another Codex pass.
insert into public.agent_packages (
  organization_id,
  version,
  status,
  base_package_id,
  builder_contract_version,
  foundation_version,
  foundation_checksum,
  contract_addendum,
  instructions_addendum,
  summary,
  capability_assessment,
  capability_proposal,
  staged_behaviour_ids,
  created_by,
  approved_at
)
select
  base.organization_id,
  (
    select coalesce(max(existing.version), 0) + 0.1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
  ),
  'test_ready',
  base.id,
  'made-solid-studio-builder-agent-v7.8',
  base.foundation_version,
  base.foundation_checksum,
  'A saved post-Codex checkpoint can be recompiled and browser-checked against the current protected foundation without generating the page again. The worker deterministically applies the reviewed primary and accent values to the shared brand tokens. Approved asset descriptors retain their reviewed role and reuse guidance, and page-matched approved worksite or project photography is a quality requirement.',
  'Use the Siteforge navigation hooks and reviewed assets as before. For a content build, use at least one approved page-matched worksite or project photograph when one is staged and permitted. A quality recheck restores immutable source, reapplies locked runtime and reviewed palette tokens, compiles, captures all responsive evidence, and runs quality gates without invoking Codex.',
  'Checkpoint repair and brand enforcement test package: rechecks saved generated source without Codex, guarantees compact navigation focus, readiness, and centring, applies reviewed palette tokens, and carries approved photo guidance.',
  'foundation_change_required',
  'Repairs and verifies an existing private page from its saved checkpoint in minutes, while preventing the generator from silently replacing reviewed colours or discarding approved worksite imagery.',
  '["responsive-sidebar", "contextual-logo-selection", "framework-quality-gates"]'::jsonb,
  base.created_by,
  now()
from public.agent_packages as base
where base.id = (
  select candidate.id
  from public.agent_packages as candidate
  where candidate.organization_id = base.organization_id
    and candidate.status = 'test_ready'
  order by candidate.version desc
  limit 1
)
  and not exists (
    select 1
    from public.agent_packages as existing
    where existing.organization_id = base.organization_id
      and existing.summary like 'Checkpoint repair and brand enforcement test package:%'
  );

create or replace function public.request_builder_quality_recheck(
  target_builder_run_id uuid,
  requested_agent_package_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_run public.builder_runs;
  selected_package public.agent_packages;
  existing_run public.builder_runs;
  requested_run_id uuid;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authentication is required.';
  end if;

  select * into source_run
  from public.builder_runs
  where id = target_builder_run_id
  for update;

  if source_run.id is null then
    raise exception 'The source private build could not be found.';
  end if;
  if auth.role() <> 'service_role'
    and not public.is_organization_member(source_run.organization_id) then
    raise exception 'Organization membership is required.';
  end if;
  if source_run.status not in ('ready', 'review_required') then
    raise exception 'Only a completed private build can be rechecked.';
  end if;
  if not exists (
    select 1
    from public.builder_artifacts
    where builder_run_id = source_run.id
      and kind = 'checkpoint'
      and label = 'Latest private source checkpoint'
      and metadata ->> 'state' = 'post_codex_validated'
  ) then
    raise exception 'No validated saved source checkpoint is available for this build.';
  end if;

  select * into selected_package
  from public.agent_packages
  where id = requested_agent_package_id
    and organization_id = source_run.organization_id
    and status in ('published', 'test_ready');
  if selected_package.id is null then
    raise exception 'Choose a published package or a package approved for testing.';
  end if;

  select * into existing_run
  from public.builder_runs
  where parent_builder_run_id = source_run.id
    and agent_package_id = selected_package.id
    and failure_context ->> 'executionMode' = 'quality_recheck'
    and status in ('queued', 'running', 'paused')
  order by created_at desc
  limit 1;
  if existing_run.id is not null then
    return existing_run.id;
  end if;

  insert into public.builder_runs (
    organization_id,
    business_id,
    build_manifest_id,
    parent_builder_run_id,
    build_mode,
    target_source_url,
    target_source_urls,
    build_instruction,
    agent_package_id,
    status,
    template_version,
    progress_phase,
    progress_detail,
    failure_context
  ) values (
    source_run.organization_id,
    source_run.business_id,
    source_run.build_manifest_id,
    source_run.id,
    source_run.build_mode,
    source_run.target_source_url,
    source_run.target_source_urls,
    null,
    selected_package.id,
    'queued',
    selected_package.foundation_version,
    'queued',
    'Waiting to recheck saved source with the current protected runtime.',
    jsonb_build_object(
      'executionMode', 'quality_recheck',
      'sourceRunId', source_run.id,
      'requestedAt', now()
    )
  ) returning id into requested_run_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    source_run.organization_id,
    source_run.business_id,
    'note',
    'Agent Studio queued a saved-source quality recheck without another Codex generation pass.'
  );

  return requested_run_id;
end;
$$;

revoke all on function public.request_builder_quality_recheck(uuid, uuid) from public, anon;
grant execute on function public.request_builder_quality_recheck(uuid, uuid)
  to authenticated, service_role;
