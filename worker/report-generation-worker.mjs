import { readFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { recordAiUsage } from './ai-usage.mjs';
import { requireOpenAiApiKey } from './openai-api-policy.mjs';

const workerId = `${hostname()}-${process.pid}`;
const responseEndpoint = 'https://api.openai.com/v1/responses';
const generatorContractVersion = 'client-value-report-agent-v1';
const generatorRevision = 'gpt-5.6-sol-design-curation-v1';
const schemaVersion = 9;
const defaultModel = 'gpt-5.6-sol';
const reasoningEffort = 'max';
const maximumCandidates = 20;
const maximumImageBytes = 6 * 1024 * 1024;
const agentContract = await readFile(
  new URL('./contracts/client-value-report-agent.md', import.meta.url),
  'utf8',
);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the report generation worker.`);
  return value;
}

const supabase = createClient(
  requiredEnvironment('SITEFORGE_SUPABASE_URL'),
  requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function outputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output ?? [])
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
}

function selectionSchema(candidateIds) {
  const conciseString = { type: 'string', minLength: 1, maxLength: 1200 };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['selectionSummary', 'themes'],
    properties: {
      selectionSummary: conciseString,
      themes: {
        type: 'array',
        minItems: 0,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'candidateId',
            'area',
            'title',
            'before',
            'businessOpportunity',
            'whatToNotice',
            'designPriority',
            'whatChanged',
            'whyBetter',
            'selectionReason',
          ],
          properties: {
            candidateId: { type: 'string', enum: candidateIds },
            area: { type: 'string', minLength: 1, maxLength: 80 },
            title: { type: 'string', minLength: 8, maxLength: 180 },
            before: conciseString,
            businessOpportunity: conciseString,
            whatToNotice: { type: 'string', minLength: 8, maxLength: 500 },
            designPriority: conciseString,
            whatChanged: conciseString,
            whyBetter: conciseString,
            selectionReason: conciseString,
          },
        },
      },
    },
  };
}

function plainText(value, maximum = 1200) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maximum) : '';
}

function errorClassification(error) {
  const message =
    error instanceof Error ? error.message : 'Report generation stopped unexpectedly.';
  if (/configured|API key|disabled/i.test(message)) return ['model_configuration', message];
  if (/selection|duplicate|unsupported|client story/i.test(message))
    return ['selection_rejected', message];
  if (/candidate|evidence|screenshot|comparison|audit|attestation/i.test(message))
    return ['evidence_unavailable', message];
  if (/model|response|structured|OpenAI/i.test(message)) return ['model_request_failed', message];
  return ['report_persistence_failed', message];
}

async function updateJob(job, patch) {
  const { error } = await supabase
    .from('report_generation_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function cancellationRequested(job) {
  const { data, error } = await supabase
    .from('report_generation_jobs')
    .select('cancel_requested_at')
    .eq('id', job.id)
    .single();
  if (error) throw error;
  if (!data.cancel_requested_at) return false;
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: 'Report generation stopped at a safe checkpoint.',
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

function viewport(metadata) {
  return metadata?.viewport && typeof metadata.viewport === 'object' ? metadata.viewport : {};
}

async function loadCandidateImage(artifact) {
  const { data, error } = await supabase.storage
    .from(artifact.storage_bucket)
    .download(artifact.storage_path);
  if (error || !data) throw new Error('A verified report screenshot could not be loaded.');
  const bytes = Buffer.from(await data.arrayBuffer());
  if (!bytes.length || bytes.length > maximumImageBytes) {
    throw new Error('A verified report screenshot is outside the supported image size.');
  }
  return `data:${artifact.content_type === 'image/jpeg' ? 'image/jpeg' : 'image/png'};base64,${bytes.toString('base64')}`;
}

async function loadSource(job) {
  const [businessResult, auditResult, releaseResult, taskResult, observationResult] =
    await Promise.all([
      supabase
        .from('businesses')
        .select('id,name,organization_id')
        .eq('id', job.business_id)
        .single(),
      supabase
        .from('audits')
        .select('id,business_id,crawl_run_id,status')
        .eq('id', job.audit_id)
        .eq('business_id', job.business_id)
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('status', 'ready')
        .single(),
      supabase
        .from('source_release_attestations')
        .select('*')
        .eq('id', job.release_attestation_id)
        .eq('business_id', job.business_id)
        .single(),
      supabase
        .from('audit_specialist_tasks')
        .select('id,status,crawl_run_id')
        .eq('audit_id', job.audit_id),
      supabase
        .from('audit_observations')
        .select('*')
        .eq('audit_id', job.audit_id)
        .eq('crawl_run_id', job.crawl_run_id)
        .neq('area', 'Platform')
        .neq('confidence', 'low')
        .neq('review_state', 'blocked'),
    ]);
  for (const result of [
    businessResult,
    auditResult,
    releaseResult,
    taskResult,
    observationResult,
  ]) {
    if (result.error) throw result.error;
  }
  const tasks = taskResult.data ?? [];
  if (tasks.length !== 6 || tasks.some((task) => task.status !== 'ready')) {
    throw new Error('All six evidence specialists must finish before report generation.');
  }
  const release = releaseResult.data;
  if (
    !Array.isArray(release.checks) ||
    release.checks.length < 4 ||
    release.checks.some((check) => check?.status !== 'passed')
  ) {
    throw new Error('The report release attestation does not contain four passed checks.');
  }
  const observations = observationResult.data ?? [];
  const originalIds = [
    ...new Set(observations.flatMap((item) => item.evidence_artifact_ids ?? [])),
  ];
  if (!originalIds.length) throw new Error('The audit has no screenshot-backed report candidates.');
  const [{ data: originals, error: originalError }, { data: redesigned, error: redesignError }] =
    await Promise.all([
      supabase
        .from('artifacts')
        .select('*')
        .in('id', originalIds)
        .eq('business_id', job.business_id)
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('kind', 'screenshot'),
      supabase
        .from('artifacts')
        .select('*')
        .eq('business_id', job.business_id)
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('kind', 'screenshot')
        .contains('metadata', {
          evidenceKind: 'edited-site-comparison',
          releaseAttestationId: release.id,
          captureContract: 'verified-comparison-page-ready-v1',
          captureStatus: 'passed',
          pageReady: true,
          loaderVisible: false,
        }),
    ]);
  if (originalError) throw originalError;
  if (redesignError) throw redesignError;
  const originalById = new Map((originals ?? []).map((item) => [item.id, item]));
  const redesignedByOriginal = new Map(
    (redesigned ?? [])
      .filter((item) => Number(item.metadata?.horizontalOverflowPx ?? 0) <= 1)
      .map((item) => [item.metadata?.originalArtifactId, item]),
  );
  const candidates = observations
    .flatMap((observation) =>
      (observation.evidence_artifact_ids ?? []).flatMap((artifactId) => {
        const original = originalById.get(artifactId);
        const after = redesignedByOriginal.get(artifactId);
        const sourceUrl = original?.metadata?.sourceUrl;
        const originalViewport = viewport(original?.metadata);
        const afterViewport = viewport(after?.metadata);
        if (
          !original ||
          !after ||
          !sourceUrl ||
          !(observation.source_urls ?? []).includes(sourceUrl) ||
          originalViewport.width !== afterViewport.width ||
          originalViewport.height !== afterViewport.height ||
          after.metadata?.sourceUrl !== sourceUrl
        ) {
          return [];
        }
        return [
          {
            id: `${observation.id}:${original.id}`,
            observation,
            original,
            after,
            sourceUrl,
            viewport: originalViewport,
          },
        ];
      }),
    )
    .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
    .sort(
      (left, right) =>
        left.sourceUrl.localeCompare(right.sourceUrl) ||
        Number(left.viewport.width ?? 0) - Number(right.viewport.width ?? 0) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, maximumCandidates);
  if (!candidates.length) {
    throw new Error(
      'No exact source-page and screen-size comparison candidates passed the report evidence gate.',
    );
  }
  return {
    business: businessResult.data,
    audit: auditResult.data,
    release,
    observations,
    candidates,
  };
}

async function selectThemes(job, source) {
  const key = requireOpenAiApiKey('Client value report selection', process.env, [
    'SITEFORGE_REPORT_SELECTION_API_KEY',
    'OPENAI_API_KEY',
  ]);
  const model = job.model || defaultModel;
  if (model !== defaultModel || job.reasoning_effort !== reasoningEffort) {
    throw new Error(
      'The report generation job is not configured for GPT-5.6 Sol at maximum reasoning.',
    );
  }
  const content = [
    { type: 'input_text', text: agentContract },
    {
      type: 'input_text',
      text: `Prospect: ${source.business.name}\nCandidates: ${JSON.stringify(
        source.candidates.map((candidate) => ({
          candidateId: candidate.id,
          observationId: candidate.observation.id,
          area: candidate.observation.area,
          severity: candidate.observation.severity,
          confidence: candidate.observation.confidence,
          observation: candidate.observation.observation,
          customerImpact: candidate.observation.customer_impact,
          recommendation: candidate.observation.recommendation,
          sourceUrl: candidate.sourceUrl,
          screen: candidate.viewport,
          originalHorizontalOverflowPx: Number(
            candidate.original.metadata?.horizontalOverflowPx ?? 0,
          ),
        })),
      )}`,
    },
  ];
  for (const candidate of source.candidates) {
    content.push({ type: 'input_text', text: `Candidate ${candidate.id} · original website` });
    content.push({
      type: 'input_image',
      image_url: await loadCandidateImage(candidate.original),
      detail: 'original',
    });
    content.push({ type: 'input_text', text: `Candidate ${candidate.id} · verified redesign` });
    content.push({
      type: 'input_image',
      image_url: await loadCandidateImage(candidate.after),
      detail: 'original',
    });
  }
  const response = await fetch(responseEndpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: reasoningEffort },
      input: [{ role: 'user', content }],
      text: {
        format: {
          type: 'json_schema',
          name: 'client_value_report_selection',
          strict: true,
          schema: selectionSchema(source.candidates.map((candidate) => candidate.id)),
        },
      },
    }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(
      `The report selection model failed (${response.status}${requestId ? `, request ${requestId}` : ''}).`,
    );
  }
  const body = await response.json();
  const text = outputText(body);
  if (!text) throw new Error('The report selection model returned no structured result.');
  let selection;
  try {
    selection = JSON.parse(text);
  } catch {
    throw new Error('The report selection model returned unreadable structured output.');
  }
  await recordAiUsage(supabase, {
    organizationId: job.organization_id,
    businessId: job.business_id,
    source: 'client_value_report_selection',
    model: body.model || model,
    usage: body.usage,
    metadata: {
      reportGenerationJobId: job.id,
      generatorContractVersion,
      reasoningEffort,
      candidateCount: source.candidates.length,
    },
  });
  return { selection, model: body.model || model, responseId: body.id };
}

function validateSelection(source, result) {
  const themes = Array.isArray(result.selection?.themes) ? result.selection.themes : [];
  if (themes.length < 1 || themes.length > 4) {
    throw new Error('The report agent did not select a usable one-to-four comparison story.');
  }
  const candidateById = new Map(source.candidates.map((candidate) => [candidate.id, candidate]));
  const selectedIds = themes.map((theme) => theme.candidateId);
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('The report agent selected a comparison more than once.');
  }
  const unsupportedClaim =
    /\b(guarantee(?:d|s)?|will (?:increase|improve|deliver)|revenue|sales|rankings?|conversion rate|legal(?:ly)? compliant)\b/i;
  return themes.map((theme, index) => {
    const candidate = candidateById.get(theme.candidateId);
    if (!candidate)
      throw new Error('The report agent selected evidence outside its candidate set.');
    const clientFields = [
      theme.title,
      theme.before,
      theme.businessOpportunity,
      theme.whatToNotice,
      theme.designPriority,
      theme.whatChanged,
      theme.whyBetter,
    ];
    if (
      clientFields.some((value) => !plainText(value)) ||
      clientFields.some((value) => unsupportedClaim.test(value))
    ) {
      throw new Error('The report agent returned an unsupported or incomplete client claim.');
    }
    return {
      id: `theme-${index + 1}-${candidate.observation.id.slice(0, 8)}`,
      area: plainText(theme.area, 80),
      title: plainText(theme.title, 180),
      before: plainText(theme.before),
      businessOpportunity: plainText(theme.businessOpportunity),
      value: plainText(theme.businessOpportunity),
      whatToNotice: plainText(theme.whatToNotice, 500),
      designPriority: plainText(theme.designPriority),
      editedSiteProof: null,
      occurrenceCount: 1,
      sourceObservationIds: [candidate.observation.id],
      sourceUrls: [candidate.sourceUrl],
      evidenceArtifactIds: [candidate.original.id],
      evidence: {
        artifactId: candidate.original.id,
        storageBucket: candidate.original.storage_bucket,
        storagePath: candidate.original.storage_path,
        caption: plainText(theme.whatToNotice, 500),
        viewport: candidate.viewport,
        sourceUrl: candidate.sourceUrl,
      },
      afterEvidence: {
        artifactId: candidate.after.id,
        storageBucket: candidate.after.storage_bucket,
        storagePath: candidate.after.storage_path,
        caption: 'The verified redesigned website at the same page and screen size.',
        viewport: viewport(candidate.after.metadata),
        sourceUrl: candidate.after.metadata.sourceUrl,
        generatedRoute: candidate.after.metadata.generatedRoute,
        verification: {
          status: 'passed',
          captureContract: candidate.after.metadata.captureContract,
          pageReady: true,
          loaderVisible: false,
          sameViewport: true,
          originalHorizontalOverflowPx: Number(
            candidate.original.metadata?.horizontalOverflowPx ?? 0,
          ),
          redesignedHorizontalOverflowPx: Number(
            candidate.after.metadata?.horizontalOverflowPx ?? 0,
          ),
        },
      },
      comparison: {
        whatChanged: plainText(theme.whatChanged),
        whyBetter: plainText(theme.whyBetter),
        customerValue: plainText(theme.businessOpportunity),
        evidenceBasis: 'Matched source page, screen size and passed exact-commit verification.',
        verificationSummary: `Verified ${candidate.viewport.label || 'responsive'} comparison at ${candidate.viewport.width} × ${candidate.viewport.height} after the page finished loading.`,
      },
      internalEvidence: {
        observationIds: [candidate.observation.id],
        observations: [candidate.observation.observation],
        recommendations: [candidate.observation.recommendation],
        customerImpacts: [candidate.observation.customer_impact],
        selectionReason: plainText(theme.selectionReason),
      },
    };
  });
}

function deliveredWork(release) {
  const labels = {
    'source-verification': 'The complete website source passed verification',
    'responsive-layout': 'Every generated route was checked across required screen sizes',
    'responsive-navigation': 'Mobile and tablet navigation interactions were checked',
    accessibility: 'Automated accessibility checks passed across responsive views',
  };
  return release.checks.map((check) => ({
    id: check.id,
    label: labels[check.id] ?? check.label,
    detail: plainText(check.detail, 600),
    status: 'passed',
  }));
}

async function freezeReport(job, source, result, themes) {
  const now = new Date().toISOString();
  const data = {
    schemaVersion,
    generatorRevision,
    reportKind: 'verified_redesign_value',
    auditId: source.audit.id,
    crawlRunId: source.audit.crawl_run_id,
    generatedAt: now,
    title: `See the difference for ${source.business.name}`,
    summary: `Compare the original ${source.business.name} website with the verified redesign and see why the selected design improvements matter to customers.`,
    strengths: [
      {
        id: 'evidence-led-foundation',
        title: 'The useful parts of the existing website were treated as evidence',
        detail: 'Captured source content and supported business facts informed the new website.',
      },
      {
        id: 'working-redesign',
        title: 'There is already a complete website to review',
        detail:
          'The proposed solution is a working website—not a mock-up or a list of future recommendations.',
      },
    ],
    valueThemes: themes,
    deliveredWork: deliveredWork(source.release),
    redesign: {
      status: 'passed',
      attestationRowId: source.release.id,
      attestationId: source.release.attestation_id,
      sourceBuilderRunId: source.release.source_builder_run_id,
      sourceManifestId: source.release.source_manifest_id,
      sourceCommit: source.release.source_commit,
      sourceTree: source.release.source_tree,
      sourceBranch: source.release.source_branch,
      sourceEditVersion: source.release.source_edit_version,
      verificationProfile: source.release.verification_profile,
      verifiedAt: source.release.verified_at,
      checks: source.release.checks,
    },
    methodology: [
      'A dedicated design-curation agent reviewed every eligible verified before-and-after candidate together.',
      'The agent selected the strongest natural set without fixed theme categories or a high-severity-only rule.',
      'Code then revalidated every selected evidence ID, source page, screen size, finished-page capture and exact edited release.',
      'Blocked, low-confidence, unsupported and stale evidence remained ineligible.',
    ],
    limitations: [
      'The report does not claim guaranteed traffic, rankings, enquiries, sales or revenue.',
      'Automated checks and model analysis do not replace client review of business accuracy and fit.',
    ],
    nextStep: `Review the completed ${source.business.name} website together, confirm it represents the business accurately, and choose the right path to launch.`,
    analysisProvenance: {
      selectionModel: result.model,
      reasoningEffort,
      responseId: result.responseId,
      generatorContractVersion,
      candidateCount: source.candidates.length,
      selectionSummary: plainText(result.selection.selectionSummary),
      deterministicEvidenceGate: 'verified-report-evidence-v2',
    },
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: latestVersions, error: versionError } = await supabase
      .from('decision_report_versions')
      .select('version')
      .eq('business_id', job.business_id)
      .order('version', { ascending: false })
      .limit(1);
    if (versionError) throw versionError;
    const version = Number(latestVersions?.[0]?.version ?? 0) + 1;
    const { data: report, error } = await supabase
      .from('decision_report_versions')
      .insert({
        organization_id: job.organization_id,
        business_id: job.business_id,
        audit_id: job.audit_id,
        crawl_run_id: job.crawl_run_id,
        version,
        schema_version: schemaVersion,
        review_state: 'approved',
        summary: `${themes.length} design-led comparisons selected from ${source.candidates.length} verified candidates.`,
        data: { ...data, version },
        created_by: job.requested_by,
      })
      .select('id')
      .single();
    if (!error) return report.id;
    if (error.code !== '23505' || attempt === 2) throw error;
  }
  throw new Error('The immutable report version could not be reserved.');
}

async function processJob(job) {
  try {
    if (await cancellationRequested(job)) return;
    await updateJob(job, {
      total_items: 5,
      completed_items: 0,
      progress_phase: 'loading_evidence',
      progress_detail: 'Loading every verified before-and-after candidate.',
      lease_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
    });
    const source = await loadSource(job);
    if (await cancellationRequested(job)) return;
    await updateJob(job, {
      completed_items: 1,
      progress_phase: 'analysing_comparisons',
      progress_detail: `GPT-5.6 Sol is comparing ${source.candidates.length} verified design candidates at maximum reasoning.`,
      lease_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
    });
    const result = await selectThemes(job, source);
    if (await cancellationRequested(job)) return;
    await updateJob(job, {
      completed_items: 3,
      progress_phase: 'validating_selection',
      progress_detail: 'Checking every selected claim against its exact screenshots and release.',
      lease_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
    });
    const themes = validateSelection(source, result);
    await updateJob(job, {
      completed_items: 4,
      progress_phase: 'freezing_report',
      progress_detail: 'Freezing the selected comparisons as a new immutable client report.',
    });
    const reportId = await freezeReport(job, source, result, themes);
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'complete',
      progress_detail: `Report ready with ${themes.length} design-led comparison${themes.length === 1 ? '' : 's'}.`,
      completed_items: 5,
      result_report_version_id: reportId,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const [errorCode, errorSummary] = errorClassification(error);
    const recoveryAction =
      errorCode === 'evidence_unavailable'
        ? 'rerun_release_verification'
        : errorCode === 'model_configuration'
          ? 'reconnect_report_worker'
          : 'retry';
    await updateJob(job, {
      status: 'failed',
      progress_phase: 'failed',
      progress_detail: 'Report generation stopped before a new client report was saved.',
      error_code: errorCode,
      error_summary: errorSummary,
      error_context: {
        phase: 'report_generation',
        retryable: recoveryAction === 'retry',
        recoveryAction,
      },
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

async function claimNext() {
  const { data, error } = await supabase.rpc('claim_next_report_generation', {
    worker_identity: workerId,
  });
  if (error) throw error;
  return data?.[0];
}

async function heartbeat() {
  const { error } = await supabase.rpc('heartbeat_report_generation_worker', {
    worker_identity: workerId,
  });
  if (error) throw error;
}

async function release() {
  try {
    await supabase.rpc('release_report_generation_worker', { worker_identity: workerId });
  } catch {
    // Shutdown must not mask the worker's original failure.
  }
}

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

async function run() {
  await heartbeat();
  const heartbeatTimer = setInterval(() => void heartbeat().catch(() => undefined), 15_000);
  try {
    while (!stopping) {
      const job = await claimNext();
      if (job) await processJob(job);
      else await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  } finally {
    clearInterval(heartbeatTimer);
    await release();
  }
}

run().catch((error) => {
  console.error(
    '[report-generation-worker] stopped:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
