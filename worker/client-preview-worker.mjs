import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const artifactBucket = 'siteforge-artifacts';
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
const vercelToken = requiredEnvironment('VERCEL_ACCESS_TOKEN');
const clientspaceHandoffUrl = requiredEnvironment('CLIENTSPACE_HANDOFF_URL');
const clientspaceHandoffSecret = requiredEnvironment('CLIENTSPACE_HANDOFF_SECRET');
const vercelTeamId = process.env.VERCEL_TEAM_ID?.trim();
const previewDomain = process.env.VERCEL_PREVIEW_DOMAIN?.trim()?.toLowerCase();
const clientspacePublicOrigin = new URL(
  process.env.CLIENTSPACE_PUBLIC_ORIGIN?.trim() || clientspaceHandoffUrl,
).origin;
if (new URL(clientspacePublicOrigin).protocol !== 'https:') {
  throw new Error('CLIENTSPACE_PUBLIC_ORIGIN must use HTTPS.');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeSlug(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'client-site'
  );
}

function deploymentProjectName(job) {
  return `made-solid-${safeSlug(job.client_name)}-${job.business_id.slice(0, 8)}`.slice(0, 100);
}

function reviewBridgeMarkup() {
  return `<script src="${clientspacePublicOrigin}/review-bridge.js?v=20260807-homepage-ready" data-made-solid-parent-origin="${clientspacePublicOrigin}" data-made-solid-review-bridge></script>`;
}

function prepareDeploymentBody(path, body) {
  if (!path.toLowerCase().endsWith('.html')) return body;
  const html = body.toString('utf8');
  if (html.includes('data-made-solid-review-bridge')) return body;
  const bridge = reviewBridgeMarkup();
  return Buffer.from(
    html.includes('</body>') ? html.replace('</body>', `${bridge}</body>`) : `${html}${bridge}`,
  );
}

async function vercelRequest(path, options = {}) {
  const url = new URL(path, 'https://api.vercel.com');
  if (vercelTeamId) url.searchParams.set('teamId', vercelTeamId);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      ...(options.body && !(options.body instanceof Uint8Array)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error?.message === 'string'
        ? `Vercel rejected the deployment: ${payload.error.message}`
        : `Vercel rejected the deployment (${response.status}).`,
    );
  }
  return response.status === 204 ? null : response.json().catch(() => ({}));
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

async function stopIfCancelled(job, deploymentUrl) {
  const current = await currentJob(job);
  if (!current.cancel_requested_at) return false;
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: deploymentUrl
      ? 'Publishing stopped before Clientspace handoff. The completed Vercel deployment remains private to the studio account.'
      : 'Publishing stopped at a safe checkpoint before deployment.',
    deployment_url: deploymentUrl ?? null,
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

async function loadSiteFiles(job) {
  const { data: artifacts, error } = await supabase
    .from('builder_artifacts')
    .select('label, storage_bucket, storage_path, content_type, byte_size')
    .eq('builder_run_id', job.builder_run_id)
    .eq('kind', 'site_file')
    .order('label');
  if (error) throw error;
  if (!artifacts?.some((artifact) => artifact.label === 'index.html')) {
    throw new Error('The completed website entry file is unavailable.');
  }
  if (artifacts.length > 5_000) throw new Error('This website contains too many deployment files.');

  const declaredBytes = artifacts.reduce(
    (total, artifact) => total + (typeof artifact.byte_size === 'number' ? artifact.byte_size : 0),
    0,
  );
  if (declaredBytes > 100 * 1024 * 1024) {
    throw new Error('This website is larger than the client-preview publishing limit.');
  }

  const files = [];
  for (const artifact of artifacts) {
    const path = String(artifact.label || '').replace(/^\/+/, '');
    if (!path || path.includes('..') || path.includes('\\')) {
      throw new Error('A generated website file has an unsafe deployment path.');
    }
    const { data, error: downloadError } = await supabase.storage
      .from(artifact.storage_bucket || artifactBucket)
      .download(artifact.storage_path);
    if (downloadError || !data) throw new Error(`Could not load generated file ${path}.`);
    const body = prepareDeploymentBody(path, Buffer.from(await data.arrayBuffer()));
    if (body.byteLength > 20 * 1024 * 1024) {
      throw new Error(`Generated file ${path} is larger than the deployment limit.`);
    }
    files.push({ path, body, contentType: artifact.content_type || 'application/octet-stream' });
  }

  const frameAncestors = ["'self'", clientspacePublicOrigin].join(' ');
  const vercelConfiguration = Buffer.from(
    JSON.stringify({
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
            {
              key: 'Content-Security-Policy',
              value: `frame-ancestors ${frameAncestors}; form-action 'none'`,
            },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ],
    }),
  );
  files.push({ path: 'vercel.json', body: vercelConfiguration, contentType: 'application/json' });
  return files;
}

async function uploadFile(file) {
  const sha = createHash('sha1').update(file.body).digest('hex');
  await vercelRequest('/v2/now/files', {
    method: 'POST',
    body: file.body,
    headers: {
      'Content-Type': file.contentType,
      'x-vercel-digest': sha,
    },
  });
  return { file: file.path, sha, size: file.body.byteLength };
}

async function waitForDeployment(job, deploymentId) {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const deployment = await vercelRequest(`/v13/deployments/${deploymentId}`);
    const state = deployment?.readyState || deployment?.state;
    if (state === 'READY') return deployment;
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new Error('Vercel could not make the client preview available.');
    }
    await updateJob(job, {
      progress_phase: 'waiting_for_vercel',
      progress_detail: 'Vercel accepted every file and is making the client preview available.',
      lease_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    await wait(2_000);
  }
  throw new Error('Vercel did not finish the client preview within ten minutes.');
}

async function assignPreviewAlias(deploymentId, job) {
  if (!previewDomain) return undefined;
  const alias = `${safeSlug(job.client_name)}-${job.business_id.slice(0, 8)}.${previewDomain}`;
  await vercelRequest(`/v2/deployments/${deploymentId}/aliases`, {
    method: 'POST',
    body: JSON.stringify({ alias }),
  });
  return `https://${alias}`;
}

async function sendClientspaceHandoff(job, deploymentUrl) {
  const { data: report } = await supabase
    .from('decision_reports')
    .select('id, version, status, summary, updated_at')
    .eq('business_id', job.business_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
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
      report: report
        ? {
            title: `${job.project_name} website report`,
            summary: report.summary,
            version: report.version,
          }
        : null,
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
    const files = await loadSiteFiles(job);
    await updateJob(job, {
      total_items: files.length + 3,
      completed_items: 0,
      progress_phase: 'uploading_files',
      progress_detail: `Uploading ${files.length} generated website files to Vercel.`,
    });

    const uploaded = [];
    for (const file of files) {
      if (await stopIfCancelled(job)) return;
      uploaded.push(await uploadFile(file));
      await updateJob(job, {
        completed_items: uploaded.length,
        progress_detail: `Uploaded ${uploaded.length} of ${files.length} generated files.`,
        lease_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    }
    if (await stopIfCancelled(job)) return;

    const projectName = deploymentProjectName(job);
    const deployment = await vercelRequest('/v12/now/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        files: uploaded,
        projectSettings: { framework: null },
        meta: { madeSolidBusinessId: job.business_id, madeSolidBuilderRunId: job.builder_run_id },
      }),
    });
    if (!deployment?.id || !deployment?.url) throw new Error('Vercel did not return a deployment.');
    await updateJob(job, {
      vercel_project_name: projectName,
      vercel_deployment_id: deployment.id,
      completed_items: files.length + 1,
      progress_phase: 'waiting_for_vercel',
      progress_detail: 'Vercel accepted the deployment and is making it available.',
    });

    const readyDeployment = await waitForDeployment(job, deployment.id);
    const generatedUrl = `https://${readyDeployment.url || deployment.url}`;
    const deploymentUrl = (await assignPreviewAlias(deployment.id, job)) || generatedUrl;
    await updateJob(job, {
      deployment_url: deploymentUrl,
      completed_items: files.length + 2,
      progress_phase: 'sending_to_clientspace',
      progress_detail: 'The Vercel preview is ready. Sending its reviewed details to Clientspace.',
    });
    if (await stopIfCancelled(job, deploymentUrl)) return;

    const handoffId = await sendClientspaceHandoff(job, deploymentUrl);
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'ready',
      progress_detail:
        'The website is hosted on Vercel and waiting for your approval in Clientspace admin.',
      completed_items: files.length + 3,
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
