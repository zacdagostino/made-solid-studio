const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredEnvironment(name, environment) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required by the private quality-repair runtime.`);
  return value;
}

function serviceConfiguration(environment) {
  return {
    serviceRoleKey: requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY', environment),
    supabaseUrl: requiredEnvironment('SITEFORGE_SUPABASE_URL', environment).replace(/\/+$/, ''),
  };
}

async function supabaseRequest(
  configuration,
  path,
  { body, fetchImplementation = fetch, method = 'GET', prefer } = {},
) {
  const response = await fetchImplementation(`${configuration.supabaseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      apikey: configuration.serviceRoleKey,
      authorization: `Bearer ${configuration.serviceRoleKey}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(prefer ? { prefer } : {}),
    },
    method,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `The protected quality-repair store rejected ${method} ${path} (${response.status}).`,
    );
  }
  return text ? JSON.parse(text) : undefined;
}

function tablePath(table, parameters = {}) {
  const query = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => query.set(key, String(value)));
  return `/rest/v1/${table}${query.size ? `?${query}` : ''}`;
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] : undefined;
}

function hasRepairableQuality(run) {
  return run?.quality_summary?.status && run.quality_summary.status !== 'passed';
}

export async function queueBuilderQualityRepair(
  input,
  authorization,
  { environment = process.env, fetchImplementation = fetch } = {},
) {
  const builderRunId = typeof input?.builderRunId === 'string' ? input.builderRunId : '';
  const requestedAgentPackageId =
    typeof input?.agentPackageId === 'string' ? input.agentPackageId : '';
  if (!uuidPattern.test(builderRunId) || !uuidPattern.test(requestedAgentPackageId)) {
    throw new Error('Choose a valid private build and repair package.');
  }
  if (!uuidPattern.test(authorization?.organizationId || '')) {
    throw new Error('The authenticated Studio organization could not be verified.');
  }

  const configuration = serviceConfiguration(environment);
  const sourceRun = firstRow(
    await supabaseRequest(
      configuration,
      tablePath('builder_runs', {
        id: `eq.${builderRunId}`,
        organization_id: `eq.${authorization.organizationId}`,
        select:
          'id,organization_id,business_id,build_manifest_id,build_mode,target_source_url,target_source_urls,agent_package_id,status,template_version,quality_summary',
        limit: 1,
      }),
      { fetchImplementation },
    ),
  );
  if (!sourceRun) throw new Error('The completed private build could not be found.');
  if (!['ready', 'review_required'].includes(sourceRun.status)) {
    throw new Error('Only a completed private build can be repaired.');
  }
  if (!hasRepairableQuality(sourceRun)) {
    throw new Error('This private build has no recorded quality findings to repair.');
  }

  const packageId =
    sourceRun.build_mode === 'full_site' ? sourceRun.agent_package_id : requestedAgentPackageId;
  const selectedPackage = firstRow(
    await supabaseRequest(
      configuration,
      tablePath('agent_packages', {
        id: `eq.${packageId}`,
        organization_id: `eq.${sourceRun.organization_id}`,
        status: 'in.(published,test_ready)',
        select: 'id,foundation_version',
        limit: 1,
      }),
      { fetchImplementation },
    ),
  );
  if (!selectedPackage) {
    throw new Error('Choose a published package or a package approved for testing.');
  }
  if (selectedPackage.foundation_version !== sourceRun.template_version) {
    throw new Error('The selected repair package must use the same builder foundation.');
  }

  const existingRun = firstRow(
    await supabaseRequest(
      configuration,
      tablePath('builder_runs', {
        parent_builder_run_id: `eq.${sourceRun.id}`,
        agent_package_id: `eq.${selectedPackage.id}`,
        'failure_context->>executionMode': 'eq.manual_quality_repair',
        status: 'in.(queued,running,paused)',
        select: 'id',
        order: 'created_at.desc',
        limit: 1,
      }),
      { fetchImplementation },
    ),
  );
  if (existingRun?.id) return { runId: existingRun.id, reused: true };

  const sourceArtifacts = await supabaseRequest(
    configuration,
    tablePath('builder_artifacts', {
      builder_run_id: `eq.${sourceRun.id}`,
      kind: 'in.(checkpoint,draft_file)',
      select: 'kind,label,metadata',
    }),
    { fetchImplementation },
  );
  const savedArtifacts = Array.isArray(sourceArtifacts) ? sourceArtifacts : [];
  const hasValidatedCheckpoint = savedArtifacts.some(
    (artifact) =>
      artifact.kind === 'checkpoint' &&
      artifact.label === 'Latest private source checkpoint' &&
      artifact.metadata?.state === 'post_codex_validated',
  );
  const hasWorkingDraft = savedArtifacts.some(
    (artifact) => artifact.kind === 'draft_file' && artifact.metadata?.state === 'working_source',
  );
  const hasSavedSource = hasValidatedCheckpoint || hasWorkingDraft;
  const now = new Date().toISOString();
  const createdRun = firstRow(
    await supabaseRequest(configuration, tablePath('builder_runs'), {
      body: {
        organization_id: sourceRun.organization_id,
        business_id: sourceRun.business_id,
        build_manifest_id: sourceRun.build_manifest_id,
        parent_builder_run_id: sourceRun.id,
        build_mode: sourceRun.build_mode,
        target_source_url: sourceRun.target_source_url,
        target_source_urls: sourceRun.target_source_urls,
        build_instruction: null,
        agent_package_id: selectedPackage.id,
        status: 'queued',
        template_version: selectedPackage.foundation_version,
        progress_phase: 'queued',
        progress_detail: hasSavedSource
          ? 'Waiting for Codex to repair the saved source and rerun quality checks.'
          : 'Waiting for Codex to rebuild the immutable manifest scope and rerun quality checks.',
        failure_context: {
          executionMode: 'manual_quality_repair',
          sourceRunId: sourceRun.id,
          sourceQualityStatus: sourceRun.quality_summary.status,
          savedSourceAvailable: hasSavedSource,
          validatedCheckpointAvailable: hasValidatedCheckpoint,
          requestedAt: now,
        },
      },
      fetchImplementation,
      method: 'POST',
      prefer: 'return=representation',
    }),
  );
  if (!createdRun?.id) throw new Error('The protected builder did not create the quality repair.');

  await supabaseRequest(configuration, tablePath('activities'), {
    body: {
      organization_id: sourceRun.organization_id,
      business_id: sourceRun.business_id,
      type: 'note',
      message: hasSavedSource
        ? 'Studio queued a Codex quality repair from the saved private source.'
        : 'Studio queued a clean Codex quality rebuild from the immutable manifest because no validated source checkpoint was available.',
    },
    fetchImplementation,
    method: 'POST',
  }).catch(() => undefined);

  return {
    runId: createdRun.id,
    reused: false,
    savedSourceAvailable: hasSavedSource,
    validatedCheckpointAvailable: hasValidatedCheckpoint,
  };
}
