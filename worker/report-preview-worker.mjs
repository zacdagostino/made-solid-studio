import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_REPORT_PREVIEW_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId = process.env.SITEFORGE_WORKER_ID || `report-preview-${hostname()}-${process.pid}`;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the report preview worker.`);
  return value;
}

function reportPreviewEndpoint() {
  const explicit = process.env.MADE_SOLID_REPORT_PREVIEW_URL?.trim();
  const handoff = process.env.MADE_SOLID_HANDOFF_URL?.trim();
  const value = explicit || handoff?.replace(/\/handoffs\/?$/, '/report-previews');
  if (!value) {
    throw new Error(
      'MADE_SOLID_REPORT_PREVIEW_URL is required when MADE_SOLID_HANDOFF_URL cannot be used.',
    );
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== '/api/integrations/studio/report-previews') {
    throw new Error(
      'MADE_SOLID_REPORT_PREVIEW_URL must use HTTPS and end with /api/integrations/studio/report-previews.',
    );
  }
  return url.href;
}

const supabase = createClient(
  requiredEnvironment('SITEFORGE_SUPABASE_URL'),
  requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const previewEndpoint = reportPreviewEndpoint();
const previewSecret =
  process.env.MADE_SOLID_HANDOFF_SECRET?.trim() || requiredEnvironment('STUDIO_HANDOFF_SECRET');

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function rendererAvailable() {
  try {
    const response = await fetch(previewEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${previewSecret}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(15_000),
    });
    // The protected endpoint validates the empty probe before touching preview storage.
    return response.status === 400;
  } catch {
    return false;
  }
}

async function updateJob(job, patch) {
  const { error } = await supabase
    .from('report_preview_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function cancelled(job) {
  const { data, error } = await supabase
    .from('report_preview_jobs')
    .select('cancel_requested_at')
    .eq('id', job.id)
    .single();
  if (error) throw error;
  if (!data.cancel_requested_at) return false;
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: 'Preview creation stopped at a safe checkpoint.',
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

async function loadFrozenReport(job) {
  const [{ data: report, error: reportError }, { data: business, error: businessError }] =
    await Promise.all([
      supabase
        .from('decision_report_versions')
        .select(
          'id, business_id, audit_id, crawl_run_id, version, schema_version, review_state, summary, data, created_at',
        )
        .eq('id', job.report_version_id)
        .eq('business_id', job.business_id)
        .single(),
      supabase.from('businesses').select('id, name').eq('id', job.business_id).single(),
    ]);
  if (reportError) throw reportError;
  if (businessError) throw businessError;
  if (report.review_state !== 'approved') {
    throw new Error('The selected report version is not an approved frozen report.');
  }
  if (
    report.schema_version !== 10 ||
    report.data?.reportKind !== 'verified_redesign_value' ||
    report.data?.generatorRevision !== 'gpt-5.6-sol-design-showcase-v2' ||
    report.data?.redesign?.status !== 'passed'
  ) {
    throw new Error(
      'This earlier report format must be regenerated before it can reach Clientspace.',
    );
  }
  if (!report.audit_id || !report.crawl_run_id || report.business_id !== job.business_id) {
    throw new Error('The frozen report does not have complete audit and capture lineage.');
  }
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, business_id, crawl_run_id, status')
    .eq('id', report.audit_id)
    .eq('business_id', job.business_id)
    .eq('crawl_run_id', report.crawl_run_id)
    .eq('status', 'ready')
    .maybeSingle();
  if (auditError) throw auditError;
  if (!audit) throw new Error('The frozen report no longer has matching completed audit lineage.');
  const redesign = report.data.redesign;
  const { data: attestation, error: attestationError } = await supabase
    .from('source_release_attestations')
    .select(
      'id, attestation_id, business_id, source_builder_run_id, source_manifest_id, source_commit, source_edit_version, checks',
    )
    .eq('id', redesign.attestationRowId)
    .eq('business_id', job.business_id)
    .eq('attestation_id', redesign.attestationId)
    .eq('source_builder_run_id', redesign.sourceBuilderRunId)
    .eq('source_manifest_id', redesign.sourceManifestId)
    .eq('source_commit', redesign.sourceCommit)
    .eq('source_edit_version', redesign.sourceEditVersion)
    .maybeSingle();
  if (attestationError) throw attestationError;
  if (
    !attestation ||
    !Array.isArray(attestation.checks) ||
    attestation.checks.length < 4 ||
    attestation.checks.some((check) => check?.status !== 'passed')
  ) {
    throw new Error(
      'The report does not match a passed release attestation for its exact edited website.',
    );
  }
  return { report, business };
}

async function loadReportMedia(reportData, job, report) {
  const findings = [
    ...(Array.isArray(reportData?.valueThemes) ? reportData.valueThemes : []),
    ...(Array.isArray(reportData?.majorFindings) ? reportData.majorFindings : []),
  ];
  const artifactIds = findings
    .flatMap((finding) => [finding?.evidence, finding?.afterEvidence])
    .map((evidence) => (typeof evidence?.artifactId === 'string' ? evidence.artifactId : ''))
    .filter((artifactId, index, all) => artifactId && all.indexOf(artifactId) === index)
    .slice(0, 14);
  if (!artifactIds.length) return [];
  const { data: references, error: referencesError } = await supabase
    .from('artifacts')
    .select('id, storage_bucket, storage_path, content_type')
    .in('id', artifactIds)
    .eq('business_id', job.business_id)
    .eq('crawl_run_id', report.crawl_run_id)
    .eq('kind', 'screenshot');
  if (referencesError) throw referencesError;
  const media = [];
  for (const reference of references) {
    const { data, error } = await supabase.storage
      .from(reference.storage_bucket)
      .download(reference.storage_path);
    if (error || !data || data.size > 6 * 1024 * 1024) continue;
    const contentType = reference.content_type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    media.push({
      artifactId: reference.id,
      contentType,
      base64: Buffer.from(await data.arrayBuffer()).toString('base64'),
    });
  }
  return media;
}

async function createRemotePreview(job, source) {
  const reportData =
    source.report.data &&
    typeof source.report.data === 'object' &&
    !Array.isArray(source.report.data)
      ? source.report.data
      : {};
  const reportMedia = await loadReportMedia(reportData, job, source.report);
  await updateJob(job, {
    progress_phase: 'sending_report',
    progress_detail: `Sending the frozen report${reportMedia.length ? ` and ${reportMedia.length} reviewed screenshots` : ''} to the private renderer.`,
    completed_items: 1,
    lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  if (await cancelled(job)) return null;

  const response = await fetch(previewEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${previewSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceProjectId: job.business_id,
      sourceReportId: source.report.id,
      clientName: source.business.name,
      projectName: `${source.business.name} website report`,
      report: {
        ...reportData,
        summary: source.report.summary,
        version: source.report.version,
        schemaVersion: source.report.schema_version,
        reviewedAt: source.report.created_at,
      },
      reportMedia,
      expiresInHours: 48,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || typeof payload?.previewUrl !== 'string' || !payload?.previewId) {
    throw new Error(payload?.message || 'Clientspace did not create the private report preview.');
  }
  const previewUrl = new URL(payload.previewUrl);
  if (previewUrl.protocol !== 'https:' || previewUrl.origin !== new URL(previewEndpoint).origin) {
    throw new Error('Clientspace returned an unsafe report preview URL.');
  }
  const expiresAt = new Date(payload.expiresAt);
  if (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date()) {
    throw new Error('Clientspace returned an invalid report preview expiry.');
  }
  return {
    previewId: String(payload.previewId),
    previewUrl: previewUrl.href,
    expiresAt: expiresAt.toISOString(),
  };
}

async function processJob(job) {
  try {
    if (await cancelled(job)) return;
    await updateJob(job, {
      total_items: 3,
      completed_items: 0,
      progress_phase: 'loading_report',
      progress_detail: 'Loading the exact frozen report and its reviewed screenshots.',
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    const source = await loadFrozenReport(job);
    const preview = await createRemotePreview(job, source);
    if (!preview) return;
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'ready',
      progress_detail: 'The exact client-facing report is ready for private Studio review.',
      completed_items: 3,
      remote_preview_id: preview.previewId,
      preview_url: preview.previewUrl,
      preview_expires_at: preview.expiresAt,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report preview creation failed.';
    await updateJob(job, {
      status: 'failed',
      progress_phase: 'failed',
      progress_detail:
        'The private report preview could not be created. Review the error and retry.',
      error_summary: message.slice(0, 1_000),
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc('claim_next_report_preview', {
    worker_identity: workerId,
  });
  if (error) throw error;
  return data?.[0];
}

async function heartbeat() {
  const { error } = await supabase.rpc('heartbeat_report_preview_worker', {
    worker_identity: workerId,
  });
  if (error) throw error;
}

async function release() {
  try {
    const { error } = await supabase.rpc('release_report_preview_worker', {
      worker_identity: workerId,
    });
    if (error) throw error;
  } catch {
    // Releasing a best-effort worker lease must not stop the polling process.
  }
}

async function run() {
  while (!(await rendererAvailable())) {
    await release();
    if (once) return;
    await wait(Math.max(pollMs, 30_000));
  }
  await heartbeat();
  const heartbeatTimer = setInterval(() => void heartbeat().catch(() => undefined), 15_000);
  try {
    let keepPolling = true;
    while (keepPolling) {
      const job = await claimJob();
      if (job) await processJob(job);
      if (!job && !once) await wait(pollMs);
      keepPolling = !once;
    }
  } finally {
    clearInterval(heartbeatTimer);
    await release();
  }
}

run().catch((error) => {
  console.error('[report-preview-worker] stopped:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
