import { createHash, randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_PUBLISH_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId = process.env.SITEFORGE_WORKER_ID || `client-preview-${hostname()}-${process.pid}`;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the client preview worker.`);
  return value;
}

const supabase = createClient(
  requiredEnvironment('SITEFORGE_SUPABASE_URL'),
  requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const clientspaceHandoffUrl = requiredEnvironment('CLIENTSPACE_HANDOFF_URL');
const clientspaceHandoffSecret = requiredEnvironment('CLIENTSPACE_HANDOFF_SECRET');
const previewPublicOrigin = new URL(requiredEnvironment('PREVIEW_PUBLIC_ORIGIN'));
const clientspacePublicOrigin = new URL(
  process.env.CLIENTSPACE_PUBLIC_ORIGIN?.trim() || clientspaceHandoffUrl,
).origin;
if (new URL(clientspacePublicOrigin).protocol !== 'https:') {
  throw new Error('CLIENTSPACE_PUBLIC_ORIGIN must use HTTPS.');
}
if (
  previewPublicOrigin.protocol !== 'https:' ||
  previewPublicOrigin.username ||
  previewPublicOrigin.password ||
  previewPublicOrigin.href !== `${previewPublicOrigin.origin}/`
) {
  throw new Error('PREVIEW_PUBLIC_ORIGIN must be an exact HTTPS origin.');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function updateJob(job, patch) {
  const { error } = await supabase
    .from('client_preview_publications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function currentJob(job) {
  const { data, error } = await supabase
    .from('client_preview_publications')
    .select('cancel_requested_at')
    .eq('id', job.id)
    .single();
  if (error) throw error;
  return data;
}

async function stopIfCancelled(job, reviewAccess) {
  const current = await currentJob(job);
  if (!current.cancel_requested_at) return false;
  if (reviewAccess?.id) {
    await supabase
      .from('builder_preview_access')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', reviewAccess.id);
  }
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: reviewAccess
      ? 'Publishing stopped before Clientspace handoff. The private review capability was revoked.'
      : 'Publishing stopped at a safe checkpoint before deployment.',
    deployment_url: reviewAccess?.url ?? null,
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

async function createPrivateReviewAccess(job) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await supabase
    .from('builder_preview_access')
    .insert({
      organization_id: job.organization_id,
      builder_run_id: job.builder_run_id,
      token_hash: createHash('sha256').update(token).digest('hex'),
      preview_mode: 'review',
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (error || !data?.id) throw error || new Error('The private review link could not be saved.');
  return {
    expiresAt,
    id: data.id,
    url: `${previewPublicOrigin.origin}/review/${job.builder_run_id}/${token}/`,
  };
}

async function loadReviewedDecisionReport(businessId) {
  const { data, error } = await supabase
    .from('decision_report_versions')
    .select('id, version, schema_version, review_state, summary, data, created_at')
    .eq('business_id', businessId)
    .eq('schema_version', 10)
    .eq('review_state', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (
    !data ||
    data.data?.reportKind !== 'verified_redesign_value' ||
    data.data?.generatorRevision !== 'gpt-5.6-sol-dynamic-design-showcase-v3' ||
    data.data?.redesign?.status !== 'passed' ||
    !Array.isArray(data.data?.valueThemes) ||
    data.data.valueThemes.some(
      (theme) => theme?.afterEvidence?.verification?.sameScrollState !== true,
    )
  ) {
    throw new Error(
      'Create a current verified value report before publishing this website to Clientspace.',
    );
  }
  return data;
}

async function loadReportMedia(reportData) {
  const findings = [
    ...(Array.isArray(reportData?.valueThemes) ? reportData.valueThemes : []),
    ...(Array.isArray(reportData?.majorFindings) ? reportData.majorFindings : []),
  ];
  const references = findings
    .flatMap((finding) => [finding?.evidence, finding?.afterEvidence])
    .filter(
      (evidence) =>
        evidence &&
        typeof evidence.artifactId === 'string' &&
        typeof evidence.storageBucket === 'string' &&
        typeof evidence.storagePath === 'string',
    )
    .filter(
      (evidence, index, all) =>
        all.findIndex((candidate) => candidate.artifactId === evidence.artifactId) === index,
    )
    .slice(0, 14);
  const media = [];
  for (const reference of references) {
    const { data, error } = await supabase.storage
      .from(reference.storageBucket)
      .download(reference.storagePath);
    if (error || !data || data.size > 6 * 1024 * 1024) continue;
    const contentType = data.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    media.push({
      artifactId: reference.artifactId,
      contentType,
      base64: Buffer.from(await data.arrayBuffer()).toString('base64'),
    });
  }
  return media;
}

async function sendClientspaceHandoff(job, deploymentUrl) {
  const report = await loadReviewedDecisionReport(job.business_id);
  const reportData =
    report?.data && typeof report.data === 'object' && !Array.isArray(report.data)
      ? report.data
      : {};
  const reportMedia = await loadReportMedia(reportData);
  const response = await fetch(clientspaceHandoffUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clientspaceHandoffSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceProjectId: job.business_id,
      sourceBuilderRunId: job.builder_run_id,
      clientName: job.client_name,
      contactName: job.contact_name,
      clientEmail: job.client_email,
      projectName: job.project_name,
      previewUrl: deploymentUrl,
      report: {
        ...reportData,
        summary: report.summary,
        version: report.version,
        schemaVersion: report.schema_version,
        reviewedAt: report.created_at,
      },
      reportMedia,
      finalBalanceCents: job.final_balance_cents,
      pricingSnapshot: job.pricing_snapshot,
      currency: job.currency,
      handoffNotes: job.handoff_notes,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.handoff?.id) {
    throw new Error(payload?.message || 'Clientspace did not accept the completed handoff.');
  }
  return payload.handoff.id;
}

async function processJob(job) {
  try {
    if (await stopIfCancelled(job)) return;
    await updateJob(job, {
      total_items: 2,
      completed_items: 0,
      progress_phase: 'creating_private_review',
      progress_detail: 'Creating an expiring private review capability for the approved build.',
    });
    const reviewAccess = await createPrivateReviewAccess(job);
    await updateJob(job, {
      deployment_url: reviewAccess.url,
      vercel_project_name: null,
      vercel_deployment_id: null,
      completed_items: 1,
      progress_phase: 'sending_to_clientspace',
      progress_detail: 'The private review link is ready. Sending it to Clientspace.',
    });
    if (await stopIfCancelled(job, reviewAccess)) return;

    const handoffId = await sendClientspaceHandoff(job, reviewAccess.url);
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'ready',
      progress_detail: `The expiring review link is waiting in Clientspace admin until ${reviewAccess.expiresAt}.`,
      completed_items: 2,
      clientspace_handoff_id: handoffId,
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client preview publishing failed.';
    await updateJob(job, {
      status: 'failed',
      progress_phase: 'failed',
      progress_detail: 'Publishing stopped. Review the safe error below and retry this build.',
      error_summary: message.slice(0, 1_000),
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc('claim_next_client_preview_publication', {
    worker_identity: workerId,
  });
  if (error) throw error;
  return data?.[0];
}

async function run() {
  let keepPolling = true;
  while (keepPolling) {
    const job = await claimJob();
    if (job) await processJob(job);
    if (!job) await wait(pollMs);
    keepPolling = !once;
  }
}

run().catch((error) => {
  console.error('[client-preview-worker] stopped:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
