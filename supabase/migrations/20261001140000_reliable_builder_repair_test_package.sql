insert into public.agent_packages (
  organization_id, version, status, base_package_id, builder_contract_version,
  foundation_version, foundation_checksum, contract_addendum, instructions_addendum,
  summary, capability_assessment, capability_proposal, staged_behaviour_ids, created_by, approved_at
)
select base.organization_id, 28.3, 'test_ready', base.id,
  'made-solid-studio-builder-agent-v28.3', base.foundation_version, base.foundation_checksum,
  'Every Codex website build and quality repair uses workspace-write with automatic approval review in the protected container. A successful Codex process must change generated source; an execution-environment block or zero-change result is a worker failure and can never be compiled or presented as a website. Manual quality repair restores saved source when available and otherwise rebuilds the selected scope from its immutable manifest.',
  'Treat namespace or shell execution denial as an infrastructure failure even when the Codex process exits successfully. Require a real generated-source change before validation, retain locked-foundation and scoped-file checks, and give completed tests one repair action that runs Codex against their recorded findings. If no validated checkpoint exists, use the immutable manifest and approved assets rather than retesting the locked starter.',
  'Reliable builder repair test package: restores container-safe Codex editing, rejects zero-change builds, and makes manual quality repair rebuild unusable starter output.',
  'foundation_change_required',
  'Prevents a blocked Codex shell from masquerading as a finished website and gives failed Agent Studio or full-site tests a repair path that produces openable generated output.',
  '["visual-codex-feedback", "framework-quality-gates"]'::jsonb, base.created_by, now()
from public.agent_packages base
where base.builder_contract_version = 'made-solid-studio-builder-agent-v28.2'
and not exists (
  select 1 from public.agent_packages existing
  where existing.organization_id = base.organization_id
    and existing.builder_contract_version = 'made-solid-studio-builder-agent-v28.3'
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
  has_saved_source boolean;
  has_validated_checkpoint boolean;
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
    raise exception 'Only a completed private build can be repaired.';
  end if;
  if coalesce(source_run.quality_summary ->> 'status', '') = 'passed' then
    raise exception 'This private build has no recorded quality findings to repair.';
  end if;

  select exists (
    select 1
    from public.builder_artifacts
    where builder_run_id = source_run.id
      and (
        (kind = 'checkpoint'
          and label = 'Latest private source checkpoint'
          and metadata ->> 'state' = 'post_codex_validated')
        or (kind = 'draft_file' and metadata ->> 'state' = 'working_source')
      )
  ) into has_saved_source;

  select exists (
    select 1
    from public.builder_artifacts
    where builder_run_id = source_run.id
      and kind = 'checkpoint'
      and label = 'Latest private source checkpoint'
      and metadata ->> 'state' = 'post_codex_validated'
  ) into has_validated_checkpoint;

  select * into selected_package
  from public.agent_packages
  where id = case
      when source_run.build_mode = 'full_site' then source_run.agent_package_id
      else requested_agent_package_id
    end
    and organization_id = source_run.organization_id
    and status in ('published', 'test_ready');
  if selected_package.id is null then
    raise exception 'Choose a published package or a package approved for testing.';
  end if;
  if selected_package.foundation_version <> source_run.template_version then
    raise exception 'The selected repair package must use the same builder foundation.';
  end if;

  select * into existing_run
  from public.builder_runs
  where parent_builder_run_id = source_run.id
    and agent_package_id = selected_package.id
    and failure_context ->> 'executionMode' = 'manual_quality_repair'
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
    case
      when has_saved_source then 'Waiting for Codex to repair the saved source and rerun quality checks.'
      else 'Waiting for Codex to rebuild the immutable manifest scope and rerun quality checks.'
    end,
    jsonb_build_object(
      'executionMode', 'manual_quality_repair',
      'sourceRunId', source_run.id,
      'sourceQualityStatus', source_run.quality_summary ->> 'status',
      'savedSourceAvailable', has_saved_source,
      'validatedCheckpointAvailable', has_validated_checkpoint,
      'requestedAt', now()
    )
  ) returning id into requested_run_id;

  insert into public.activities (organization_id, business_id, type, message)
  values (
    source_run.organization_id,
    source_run.business_id,
    'note',
    case
      when has_saved_source then 'Studio queued a Codex quality repair from the saved private source.'
      else 'Studio queued a clean Codex quality rebuild from the immutable manifest because no validated source checkpoint was available.'
    end
  );

  return requested_run_id;
end;
$$;

revoke all on function public.request_builder_quality_recheck(uuid, uuid) from public, anon;
grant execute on function public.request_builder_quality_recheck(uuid, uuid)
  to authenticated, service_role;
