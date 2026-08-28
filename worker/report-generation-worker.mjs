import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { codexUsage, recordAiUsage } from './ai-usage.mjs';

const workerId = `${hostname()}-${process.pid}`;
const generatorContractVersion = 'client-value-report-agent-v2';
const generatorRevision = 'gpt-5.6-sol-design-showcase-v2';
const schemaVersion = 10;
const defaultModel = 'gpt-5.6-sol';
const reasoningEffort = 'max';
const maximumCandidates = 20;
const maximumImageBytes = 6 * 1024 * 1024;
const maximumModelRunMs = 20 * 60_000;
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

function selectionSchema(candidateIds) {
  const conciseString = { type: 'string', minLength: 1, maxLength: 1200 };
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'presentationTitle',
      'presentationSummary',
      'transformationStatement',
      'selectionSummary',
      'majorFindings',
      'themes',
      'designDecisions',
    ],
    properties: {
      presentationTitle: { type: 'string', minLength: 8, maxLength: 180 },
      presentationSummary: conciseString,
      transformationStatement: conciseString,
      selectionSummary: conciseString,
      majorFindings: {
        type: 'array',
        minItems: 1,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'candidateId',
            'area',
            'title',
            'originalProblem',
            'visitorImpact',
            'whyItMatters',
            'selectionReason',
          ],
          properties: {
            candidateId: { type: 'string', enum: candidateIds },
            area: { type: 'string', minLength: 1, maxLength: 80 },
            title: { type: 'string', minLength: 8, maxLength: 180 },
            originalProblem: conciseString,
            visitorImpact: conciseString,
            whyItMatters: conciseString,
            selectionReason: conciseString,
          },
        },
      },
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
      designDecisions: {
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'detail', 'candidateIds'],
          properties: {
            title: { type: 'string', minLength: 8, maxLength: 180 },
            detail: conciseString,
            candidateIds: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              uniqueItems: true,
              items: { type: 'string', enum: candidateIds },
            },
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
  if (/configured|signed in|authentication|Codex executable/i.test(message))
    return ['model_configuration', message];
  if (/model|response|structured|Codex|sandbox helper|timed out/i.test(message))
    return ['model_request_failed', message];
  if (/candidate|evidence|screenshot|comparison|audit|attestation/i.test(message))
    return ['evidence_unavailable', message];
  if (/selection|duplicate|unsupported|client story/i.test(message))
    return ['selection_rejected', message];
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
  return {
    bytes,
    extension: artifact.content_type === 'image/jpeg' ? 'jpg' : 'png',
  };
}

async function executableFile(path) {
  if (!path) return false;
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function codexBinary() {
  const configured = process.env.SITEFORGE_CODEX_BIN?.trim();
  if (configured) return configured;
  for (const directory of (process.env.PATH || '').split(':').filter(Boolean)) {
    const candidate = join(directory, 'codex');
    if (await executableFile(candidate)) return candidate;
  }
  throw new Error('The Codex executable is not configured for report generation.');
}

function codexEnvironment(environment = process.env, temporaryDirectory = '') {
  const values = {
    HOME: environment.HOME,
    PATH: environment.PATH,
    SHELL: environment.SHELL,
    LANG: environment.LANG,
    LC_ALL: environment.LC_ALL,
    TERM: environment.TERM,
    NO_COLOR: '1',
    CODEX_HOME: environment.SITEFORGE_CODEX_HOME?.trim() || environment.CODEX_HOME?.trim(),
    TMPDIR: temporaryDirectory || environment.TMPDIR,
    TMP: temporaryDirectory || environment.TMP,
    TEMP: temporaryDirectory || environment.TEMP,
  };
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => typeof value === 'string' && value.length > 0),
  );
}

function codexFailureDetail(events, stderr, exit) {
  for (const event of [...events].reverse()) {
    if (!/(?:error|fail)/i.test(String(event?.type ?? ''))) continue;
    const detail =
      event?.error?.message ?? event?.error ?? event?.message ?? event?.item?.message ?? null;
    if (typeof detail === 'string' && detail.trim()) return detail.trim().slice(-700);
  }
  return stderr.trim().slice(-700) || String(exit.signal || exit.code);
}

async function runProcess(executable, arguments_, options = {}) {
  const child = spawn(executable, arguments_, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const exit = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  if (exit.code !== 0) {
    throw new Error(
      `Codex authentication check failed: ${stderr.trim().slice(-500) || exit.signal || exit.code}`,
    );
  }
  return { stdout, stderr };
}

async function assertCodexAuthentication(executable, environment) {
  const result = await runProcess(
    executable,
    ['--config', 'forced_login_method="chatgpt"', 'login', 'status'],
    { env: environment },
  );
  if (!/logged in using chatgpt/i.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(
      'The report generator is not signed in with ChatGPT. Reconnect the protected Codex runtime and retry.',
    );
  }
}

class ReportCancelledError extends Error {}

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
  const technologyIds = new Set(
    candidates.flatMap((candidate) =>
      Array.isArray(candidate.after.metadata?.technologyFoundation?.technologies)
        ? candidate.after.metadata.technologyFoundation.technologies.map(
            (technology) => technology?.id,
          )
        : [],
    ),
  );
  if (!technologyIds.has('nextjs') || !technologyIds.has('typescript')) {
    throw new Error(
      'The comparison evidence does not include verified Next.js and TypeScript foundation evidence. Run release verification again.',
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
  const model = job.model || defaultModel;
  if (model !== defaultModel || job.reasoning_effort !== reasoningEffort) {
    throw new Error(
      'The report generation job is not configured for GPT-5.6 Sol at maximum reasoning.',
    );
  }
  const executable = await codexBinary();
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-report-'));
  const environment = codexEnvironment(process.env, directory);
  const schemaPath = join(directory, 'selection.schema.json');
  const outputPath = join(directory, 'selection.json');
  const imagePaths = [];
  const candidateRecords = source.candidates.map((candidate, index) => ({
    candidateId: candidate.id,
    imagePair: {
      original: `candidate-${String(index + 1).padStart(2, '0')}-original`,
      redesign: `candidate-${String(index + 1).padStart(2, '0')}-redesign`,
    },
    observationId: candidate.observation.id,
    area: candidate.observation.area,
    severity: candidate.observation.severity,
    confidence: candidate.observation.confidence,
    observation: candidate.observation.observation,
    customerImpact: candidate.observation.customer_impact,
    recommendation: candidate.observation.recommendation,
    measuredSignals: candidate.observation.measurement,
    sourceUrl: candidate.sourceUrl,
    screen: candidate.viewport,
    originalHorizontalOverflowPx: Number(candidate.original.metadata?.horizontalOverflowPx ?? 0),
  }));
  try {
    await assertCodexAuthentication(executable, environment);
    await writeFile(
      schemaPath,
      `${JSON.stringify(selectionSchema(source.candidates.map((candidate) => candidate.id)), null, 2)}\n`,
    );
    for (const [index, candidate] of source.candidates.entries()) {
      const [original, redesign] = await Promise.all([
        loadCandidateImage(candidate.original),
        loadCandidateImage(candidate.after),
      ]);
      const number = String(index + 1).padStart(2, '0');
      const originalPath = join(directory, `candidate-${number}-original.${original.extension}`);
      const redesignPath = join(directory, `candidate-${number}-redesign.${redesign.extension}`);
      await Promise.all([
        writeFile(originalPath, original.bytes),
        writeFile(redesignPath, redesign.bytes),
      ]);
      imagePaths.push(originalPath, redesignPath);
    }

    const prompt = `${agentContract}\n\nProspect: ${source.business.name}\nCandidate records: ${JSON.stringify(candidateRecords)}\n\nThe attached images are ordered as each candidate's original website followed immediately by its verified redesign; each imagePair name matches the attached filename. Inspect both images at their recorded viewport. Return only the structured report selection required by the supplied schema. Do not call tools, edit files, or use the network.`;
    const arguments_ = [
      '--config',
      'forced_login_method="chatgpt"',
      'exec',
      '--cd',
      directory,
      '--json',
      '--ephemeral',
      '--ignore-user-config',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--output-schema',
      schemaPath,
      '--output-last-message',
      outputPath,
      '--model',
      model,
      '--config',
      `model_reasoning_effort="${reasoningEffort}"`,
    ];
    for (const path of imagePaths) arguments_.push('--image', path);
    arguments_.push('-');
    const child = spawn(executable, arguments_, {
      cwd: directory,
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(prompt);
    const events = [];
    let stdoutBuffer = '';
    let stderr = '';
    let cancelled = false;
    let timedOut = false;
    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        try {
          if (events.length < 300) events.push(JSON.parse(line));
        } catch {
          // A malformed diagnostic line cannot become report evidence.
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    const cancellationInterval = setInterval(() => {
      void supabase
        .from('report_generation_jobs')
        .select('cancel_requested_at')
        .eq('id', job.id)
        .single()
        .then(({ data }) => {
          if (data?.cancel_requested_at && !cancelled) {
            cancelled = true;
            child.kill('SIGTERM');
            return;
          }
          return updateJob(job, {
            lease_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
          });
        })
        .catch(() => child.kill('SIGTERM'));
    }, 10_000);
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, maximumModelRunMs);
    const exit = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    }).finally(() => {
      clearInterval(cancellationInterval);
      clearTimeout(timeout);
    });
    if (cancelled) throw new ReportCancelledError('Report generation was cancelled.');
    if (timedOut) {
      throw new Error('Codex report selection timed out after twenty minutes.');
    }
    if (exit.code !== 0) {
      throw new Error(`Codex report selection failed: ${codexFailureDetail(events, stderr, exit)}`);
    }
    const text = (await readFile(outputPath, 'utf8')).trim();
    if (!text) throw new Error('The report selection model returned no structured result.');
    let selection;
    try {
      selection = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      throw new Error('The report selection model returned unreadable structured output.');
    }
    await recordAiUsage(supabase, {
      organizationId: job.organization_id,
      businessId: job.business_id,
      source: 'client_value_report_selection',
      model,
      usage: codexUsage(events),
      billingMode: 'chatgpt_subscription',
      metadata: {
        reportGenerationJobId: job.id,
        generatorContractVersion,
        reasoningEffort,
        candidateCount: source.candidates.length,
        authenticationMode: 'chatgpt',
      },
    });
    const startedEvent = events.find((event) => event?.type === 'thread.started');
    return {
      selection,
      model,
      responseId: startedEvent?.thread_id ?? startedEvent?.threadId ?? null,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function assertClientCopy(values) {
  const unsupportedClaim =
    /\b(guarantee(?:d|s)?|will (?:increase|improve|deliver)|revenue|sales|rankings?|conversion rate|legal(?:ly)? compliant|best (?:technology|framework|platform))\b/i;
  if (
    values.some((value) => !plainText(value)) ||
    values.some((value) => unsupportedClaim.test(value))
  ) {
    throw new Error('The report agent returned an unsupported or incomplete client claim.');
  }
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
  assertClientCopy([
    result.selection.presentationTitle,
    result.selection.presentationSummary,
    result.selection.transformationStatement,
  ]);
  const frozenThemes = themes.map((theme, index) => {
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
    assertClientCopy(clientFields);
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
  const majorFindings = Array.isArray(result.selection?.majorFindings)
    ? result.selection.majorFindings
    : [];
  if (majorFindings.length < 1 || majorFindings.length > 6) {
    throw new Error('The report agent did not return a usable set of original design findings.');
  }
  if (new Set(majorFindings.map((finding) => finding.candidateId)).size !== majorFindings.length) {
    throw new Error('The report agent repeated an original design finding.');
  }
  const frozenFindings = majorFindings.map((finding, index) => {
    const candidate = candidateById.get(finding.candidateId);
    if (!candidate) throw new Error('A design finding used evidence outside its candidate set.');
    assertClientCopy([
      finding.title,
      finding.originalProblem,
      finding.visitorImpact,
      finding.whyItMatters,
    ]);
    return {
      id: `finding-${index + 1}-${candidate.observation.id.slice(0, 8)}`,
      area: plainText(finding.area, 80),
      title: plainText(finding.title, 180),
      originalProblem: plainText(finding.originalProblem),
      visitorImpact: plainText(finding.visitorImpact),
      whyItMatters: plainText(finding.whyItMatters),
      evidence: {
        artifactId: candidate.original.id,
        storageBucket: candidate.original.storage_bucket,
        storagePath: candidate.original.storage_path,
        sourceUrl: candidate.sourceUrl,
        viewport: candidate.viewport,
      },
      internalEvidence: {
        observationId: candidate.observation.id,
        measurement: candidate.observation.measurement,
        selectionReason: plainText(finding.selectionReason),
      },
    };
  });
  const designDecisions = Array.isArray(result.selection?.designDecisions)
    ? result.selection.designDecisions
    : [];
  if (designDecisions.length < 1 || designDecisions.length > 5) {
    throw new Error('The report agent did not return a usable set of design decisions.');
  }
  const frozenDecisions = designDecisions.map((decision, index) => {
    assertClientCopy([decision.title, decision.detail]);
    const candidateIds = Array.isArray(decision.candidateIds) ? decision.candidateIds : [];
    if (
      !candidateIds.length ||
      candidateIds.some((candidateId) => !candidateById.has(candidateId))
    ) {
      throw new Error('A design decision used evidence outside its candidate set.');
    }
    return {
      id: `decision-${index + 1}`,
      title: plainText(decision.title, 180),
      detail: plainText(decision.detail),
      sourceObservationIds: candidateIds.map(
        (candidateId) => candidateById.get(candidateId).observation.id,
      ),
    };
  });
  return {
    themes: frozenThemes,
    majorFindings: frozenFindings,
    designDecisions: frozenDecisions,
    presentation: {
      title: plainText(result.selection.presentationTitle, 180),
      summary: plainText(result.selection.presentationSummary),
      transformationStatement: plainText(result.selection.transformationStatement),
    },
  };
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

function technologyFoundation(source) {
  const evidence = source.candidates
    .map((candidate) => candidate.after.metadata?.technologyFoundation)
    .find((value) => value && typeof value === 'object');
  const technologies = Array.isArray(evidence?.technologies) ? evidence.technologies : [];
  const items = technologies.flatMap((technology) => {
    if (technology?.id === 'nextjs') {
      return [
        {
          id: 'nextjs',
          title: 'Modern Next.js foundation',
          detail:
            'The new website is built on Next.js for a maintainable, production-ready web foundation that can grow with the business.',
        },
      ];
    }
    if (technology?.id === 'typescript') {
      return [
        {
          id: 'typescript',
          title: 'Reliable TypeScript source',
          detail:
            'Typed source code makes future changes safer and easier to maintain as the website evolves.',
        },
      ];
    }
    return [];
  });
  return {
    evidenceStatus: items.length ? 'verified' : 'unavailable',
    items,
    responsiveVerification: {
      title: 'Responsive by design',
      detail:
        'The complete website was checked across phone, tablet and desktop layouts before this report was prepared.',
    },
  };
}

async function freezeReport(job, source, result, validated) {
  const now = new Date().toISOString();
  const data = {
    schemaVersion,
    generatorRevision,
    reportKind: 'verified_redesign_value',
    auditId: source.audit.id,
    crawlRunId: source.audit.crawl_run_id,
    generatedAt: now,
    title: validated.presentation.title,
    summary: validated.presentation.summary,
    transformationStatement: validated.presentation.transformationStatement,
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
    majorFindings: validated.majorFindings,
    valueThemes: validated.themes,
    designDecisions: validated.designDecisions,
    technologyFoundation: technologyFoundation(source),
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
        summary: `${validated.themes.length} design-led comparisons and ${validated.majorFindings.length} original experience findings selected from ${source.candidates.length} verified candidates.`,
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
      progress_detail: `GPT-5.6 Sol is analysing ${source.candidates.length} verified design candidates and building the client presentation at maximum reasoning.`,
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
    const validated = validateSelection(source, result);
    await updateJob(job, {
      completed_items: 4,
      progress_phase: 'freezing_report',
      progress_detail:
        'Freezing the design findings, comparisons and decisions as a new immutable client report.',
    });
    const reportId = await freezeReport(job, source, result, validated);
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'complete',
      progress_detail: `Report ready with ${validated.themes.length} design-led comparison${validated.themes.length === 1 ? '' : 's'} and ${validated.majorFindings.length} original design finding${validated.majorFindings.length === 1 ? '' : 's'}.`,
      completed_items: 5,
      result_report_version_id: reportId,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ReportCancelledError) {
      await cancellationRequested(job).catch(() => undefined);
      return;
    }
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
