import { hostname } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_HANDOFF_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId =
  process.env.SITEFORGE_WORKER_ID || `made-solid-handoff-${hostname()}-${process.pid}`;
const execFileAsync = promisify(execFile);
const vercelTeamSlug = process.env.VERCEL_TEAM_SLUG?.trim() || 'made-solid';
const vercelCliVersion = process.env.VERCEL_CLI_VERSION?.trim() || '58.9.2';
const madeSolidProspectDomain =
  process.env.MADE_SOLID_PROSPECT_DOMAIN?.trim().toLowerCase() || 'madesolid.com.au';
if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(madeSolidProspectDomain)) {
  throw new Error('MADE_SOLID_PROSPECT_DOMAIN must be a valid DNS domain.');
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Made Solid handoff worker.`);
  return value;
}

const supabase = createClient(
  requiredEnvironment('SITEFORGE_SUPABASE_URL'),
  requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const handoffUrl = requiredEnvironment('MADE_SOLID_HANDOFF_URL');
const handoffSecret = requiredEnvironment('MADE_SOLID_HANDOFF_SECRET');
if (new URL(handoffUrl).protocol !== 'https:') {
  throw new Error('MADE_SOLID_HANDOFF_URL must use HTTPS.');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sourceRepositorySlug(repositoryUrl) {
  const pathname = new URL(repositoryUrl).pathname.replace(/\.git$/i, '');
  const slug = pathname.split('/').filter(Boolean).at(-1);
  if (!slug || !/^[a-z0-9._-]+$/i.test(slug)) {
    throw new Error('The source repository has no safe deployment workspace name.');
  }
  return slug.toLowerCase();
}

function deploymentProjectName(job) {
  return sourceRepositorySlug(job.source_repository_url)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function prospectHostname(job) {
  const label = deploymentProjectName(job).slice(0, 63).replace(/-$/g, '');
  if (!label) throw new Error('The source repository has no safe prospect subdomain.');
  return `${label}.${madeSolidProspectDomain}`;
}

function deploymentWorkspace(job) {
  const root = process.env.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim()
    ? resolve(process.env.SITEFORGE_PROSPECT_WORKSPACES_DIR.trim())
    : resolve(process.cwd(), 'prospect-workspaces');
  return resolve(root, sourceRepositorySlug(job.source_repository_url));
}

async function runWorkspaceCommand(command, args, cwd, timeout = 60_000) {
  return execFileAsync(command, args, {
    cwd,
    env: { ...process.env, GITHUB_TOKEN: undefined },
    maxBuffer: 4 * 1024 * 1024,
    timeout,
  });
}

async function verifyExactSourceWorkspace(job) {
  const cwd = deploymentWorkspace(job);
  const [{ stdout: commit }, { stdout: status }, { stdout: remote }] = await Promise.all([
    runWorkspaceCommand('git', ['rev-parse', 'HEAD'], cwd),
    runWorkspaceCommand('git', ['status', '--porcelain'], cwd),
    runWorkspaceCommand('git', ['remote', 'get-url', 'origin'], cwd),
  ]);
  if (commit.trim().toLowerCase() !== job.source_commit.toLowerCase()) {
    throw new Error('The local deployment workspace is not on the handed-off commit.');
  }
  if (status.trim()) {
    throw new Error('The local deployment workspace has uncommitted changes.');
  }
  const expected = new URL(job.source_repository_url).pathname.replace(/\.git$/i, '').toLowerCase();
  const actual = new URL(remote.trim()).pathname.replace(/\.git$/i, '').toLowerCase();
  if (actual !== expected) {
    throw new Error('The local deployment workspace belongs to a different repository.');
  }
  return cwd;
}

function vercelArgs(...args) {
  return ['--yes', `vercel@${vercelCliVersion}`, ...args, '--scope', vercelTeamSlug];
}

async function ensureVercelProject(projectName, cwd) {
  try {
    await runWorkspaceCommand(
      'npx',
      vercelArgs('project', 'inspect', projectName),
      cwd,
      2 * 60_000,
    );
  } catch (error) {
    const detail = `${error?.stdout || ''}\n${error?.stderr || ''}`;
    if (!/not found/i.test(detail)) {
      throw new Error('Vercel project verification failed.', { cause: error });
    }
    await runWorkspaceCommand('npx', vercelArgs('project', 'add', projectName), cwd, 2 * 60_000);
  }
}

async function deployExactSource(job) {
  const cwd = await verifyExactSourceWorkspace(job);
  const projectName = deploymentProjectName(job);
  await ensureVercelProject(projectName, cwd);
  const { stdout } = await runWorkspaceCommand(
    'npx',
    vercelArgs(
      'deploy',
      '--prod',
      '--yes',
      '--project',
      projectName,
      '--meta',
      `sourceCommit=${job.source_commit}`,
      '--json',
    ),
    cwd,
    15 * 60_000,
  );
  const payload = JSON.parse(stdout.trim());
  if (payload?.status !== 'ok' || payload?.deployment?.readyState !== 'READY') {
    throw new Error('Vercel did not return a ready exact-commit deployment.');
  }
  return { cwd, projectName };
}

async function assignProspectDomain(job, deployment) {
  const hostname = prospectHostname(job);
  try {
    await runWorkspaceCommand(
      'npx',
      vercelArgs('domains', 'add', hostname, deployment.projectName, '--no-color'),
      deployment.cwd,
      2 * 60_000,
    );
  } catch (error) {
    throw new Error(`Vercel could not assign ${hostname} to the prospect deployment.`, {
      cause: error,
    });
  }
  const previewUrl = `https://${hostname}`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(previewUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return previewUrl;
    } catch {
      // DNS and TLS may still be converging after Vercel assigns the hostname.
    }
    await wait(10_000);
  }
  throw new Error(`${hostname} was assigned, but its HTTPS check did not become ready in time.`);
}

async function updateJob(job, patch) {
  const { error } = await supabase
    .from('made_solid_handoffs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function cancelled(job, savedAdminRevision = false) {
  const { data, error } = await supabase
    .from('made_solid_handoffs')
    .select('cancel_requested_at')
    .eq('id', job.id)
    .single();
  if (error) throw error;
  if (!data.cancel_requested_at) return false;
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: savedAdminRevision
      ? 'The source revision was saved privately in Made Solid; final workspace verification was cancelled.'
      : 'The handoff stopped before a new Made Solid admin revision was saved.',
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

async function processJob(job) {
  try {
    if (await cancelled(job)) return;
    await updateJob(job, {
      total_items: 6,
      progress_phase: 'verifying_source',
      progress_detail: 'Verifying the clean local repository against the exact handed-off commit.',
      completed_items: 0,
      lease_expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    });
    const deployment = await deployExactSource(job);
    await updateJob(job, {
      progress_phase: 'configuring_domain',
      progress_detail: `Vercel built the exact commit. Assigning ${prospectHostname(job)} and checking HTTPS.`,
      completed_items: 2,
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    const previewUrl = await assignProspectDomain(job, deployment);
    await updateJob(job, {
      progress_phase: 'preview_ready',
      progress_detail: `${prospectHostname(job)} is serving the exact committed website over HTTPS.`,
      completed_items: 3,
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (await cancelled(job)) return;
    await updateJob(job, {
      progress_phase: 'sending',
      progress_detail: 'Sending the exact source lineage and verified preview to Made Solid.',
      completed_items: 4,
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    const response = await fetch(handoffUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${handoffSecret}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        handoffKind: 'source_revision',
        sourceProjectId: job.business_id,
        sourceBuilderRunId: job.builder_run_id,
        sourceRepositoryUrl: job.source_repository_url,
        sourceBranch: job.source_branch,
        sourceCommit: job.source_commit,
        sourceEditVersion: job.source_edit_version,
        sourceManifestId: job.source_manifest_id,
        sourceAgentPackageId: job.source_agent_package_id,
        clientName: job.client_name,
        contactName: job.contact_name,
        clientEmail: job.client_email,
        projectName: job.project_name,
        previewUrl,
        currency: 'AUD',
        pricingSnapshot: job.pricing_snapshot,
        handoffNotes: job.handoff_notes,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.handoff?.id || !payload?.adminUrl) {
      throw new Error(payload?.message || 'The Made Solid website did not accept this revision.');
    }
    const adminUrl = new URL(payload.adminUrl);
    if (adminUrl.protocol !== 'https:' || !adminUrl.pathname.startsWith('/admin')) {
      throw new Error('Made Solid returned an invalid private admin location.');
    }
    await updateJob(job, {
      progress_phase: 'verifying',
      progress_detail:
        'Made Solid saved the revision. Verifying the returned private admin record.',
      completed_items: 5,
      website_handoff_id: payload.handoff.id,
      website_admin_url: adminUrl.toString(),
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (await cancelled(job, true)) return;
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'ready',
      progress_detail:
        'The committed edit is recorded in Made Solid admin and ready for client setup.',
      completed_items: 6,
      website_handoff_id: payload.handoff.id,
      website_admin_url: adminUrl.toString(),
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Made Solid handoff failed.';
    await updateJob(job, {
      status: 'failed',
      progress_phase: 'failed',
      progress_detail: 'The transfer stopped safely. The committed source was not changed.',
      error_summary: message.slice(0, 1_000),
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc('claim_next_made_solid_handoff', {
    worker_identity: workerId,
  });
  if (error) throw error;
  return data?.[0];
}

async function heartbeat() {
  const { error } = await supabase.rpc('heartbeat_made_solid_handoff_worker', {
    worker_identity: workerId,
  });
  if (error) throw error;
}

async function releaseHeartbeat() {
  try {
    await supabase.rpc('release_made_solid_handoff_worker', { worker_identity: workerId });
  } catch {
    // Process shutdown must continue even if the heartbeat cleanup request cannot complete.
  }
}

async function run() {
  await heartbeat();
  const heartbeatTimer = setInterval(() => {
    void heartbeat().catch((error) =>
      console.error(error instanceof Error ? error.message : error),
    );
  }, 15_000);
  try {
    let keepPolling = true;
    while (keepPolling) {
      const job = await claimJob();
      if (job) await processJob(job);
      if (!job) await wait(pollMs);
      keepPolling = !once;
    }
  } finally {
    clearInterval(heartbeatTimer);
    await releaseHeartbeat();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
