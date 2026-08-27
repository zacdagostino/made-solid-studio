import { hostname } from 'node:os';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_HANDOFF_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId =
  process.env.SITEFORGE_WORKER_ID || `made-solid-handoff-${hostname()}-${process.pid}`;
const execFileAsync = promisify(execFile);
const vercelTeamSlug = process.env.VERCEL_TEAM_SLUG?.trim() || 'made-solid';
const vercelCliVersion = process.env.VERCEL_CLI_VERSION?.trim() || '58.9.2';
const reservedHostnameLabels = new Set([
  'www',
  'dev',
  'studio',
  'workspace',
  'preview',
  'app',
  'api',
  'admin',
  'portal',
  'client',
  'clients',
  'mail',
  'email',
  'status',
  'support',
  'docs',
  'assets',
  'static',
  'cdn',
  'auth',
  'dashboard',
  'test',
  'build',
]);
const dnsLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const commitPattern = /^[a-f0-9]{40}$/;
const attestationIdPattern = /^[a-f0-9]{64}$/;
const releaseVerificationProfile = 'made-solid-edited-site-release-v1';
const requiredReleaseCheckIds = new Set([
  'source-verification',
  'responsive-layout',
  'responsive-navigation',
  'accessibility',
]);

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
const handoffEndpoint = new URL(handoffUrl);
if (handoffEndpoint.protocol !== 'https:' || handoffEndpoint.username || handoffEndpoint.password) {
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
  const projectName = sourceRepositorySlug(job.source_repository_url)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  if (!dnsLabelPattern.test(projectName) || reservedHostnameLabels.has(projectName)) {
    throw new Error('The source repository resolves to a reserved or invalid deployment hostname.');
  }
  return projectName;
}

function previewDeploymentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Vercel did not return a preview deployment URL.');
  }
  let previewUrl;
  try {
    previewUrl = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    throw new Error('Vercel returned an invalid preview deployment URL.');
  }
  const labels = previewUrl.hostname.toLowerCase().split('.');
  const firstLabel = labels[0] || '';
  const isVercelPreview =
    labels.length >= 3 && previewUrl.hostname.toLowerCase().endsWith('.vercel.app');
  if (
    previewUrl.protocol !== 'https:' ||
    previewUrl.username ||
    previewUrl.password ||
    previewUrl.port ||
    previewUrl.pathname !== '/' ||
    previewUrl.search ||
    previewUrl.hash ||
    !isVercelPreview ||
    labels.some((label) => !dnsLabelPattern.test(label)) ||
    reservedHostnameLabels.has(firstLabel)
  ) {
    throw new Error('Vercel returned an unsafe preview deployment URL.');
  }
  return previewUrl.toString();
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
  const [
    { stdout: commit },
    { stdout: tree },
    { stdout: status },
    { stdout: remote },
    { stdout: gitDirectory },
  ] = await Promise.all([
    runWorkspaceCommand('git', ['rev-parse', 'HEAD'], cwd),
    runWorkspaceCommand('git', ['rev-parse', 'HEAD^{tree}'], cwd),
    runWorkspaceCommand('git', ['status', '--porcelain'], cwd),
    runWorkspaceCommand('git', ['remote', 'get-url', 'origin'], cwd),
    runWorkspaceCommand('git', ['rev-parse', '--git-dir'], cwd),
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
  const sourceTree = tree.trim().toLowerCase();
  if (!commitPattern.test(sourceTree)) {
    throw new Error('The local deployment workspace has no valid Git tree identity.');
  }
  return { cwd, gitDirectory: resolve(cwd, gitDirectory.trim()), sourceTree };
}

function requiredAttestationText(attestation, field) {
  const value = attestation?.[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`The release attestation has no valid ${field}.`);
  }
  return value.trim();
}

async function verifyReleaseAttestation(job, workspace) {
  const attestationPath = join(
    workspace.gitDirectory,
    'made-solid',
    'release-attestations',
    `${job.source_commit.toLowerCase()}.json`,
  );
  const source = await readFile(attestationPath).catch((error) => {
    throw new Error('The exact commit has no passed release attestation.', { cause: error });
  });
  if (source.byteLength > 128 * 1024) {
    throw new Error('The release attestation exceeds the allowed size.');
  }
  let attestation;
  try {
    attestation = JSON.parse(source.toString('utf8'));
  } catch (error) {
    throw new Error('The release attestation is not valid JSON.', { cause: error });
  }

  const sourceCommit = requiredAttestationText(attestation, 'sourceCommit').toLowerCase();
  const sourceTree = requiredAttestationText(attestation, 'sourceTree').toLowerCase();
  if (
    attestation.schemaVersion !== 1 ||
    attestation.status !== 'passed' ||
    attestation.verificationProfile !== releaseVerificationProfile ||
    !attestationIdPattern.test(requiredAttestationText(attestation, 'id')) ||
    requiredAttestationText(attestation, 'businessId') !== job.business_id ||
    requiredAttestationText(attestation, 'sourceBuilderRunId') !== job.builder_run_id ||
    requiredAttestationText(attestation, 'sourceManifestId') !== job.source_manifest_id ||
    sourceCommit !== job.source_commit.toLowerCase() ||
    !commitPattern.test(sourceCommit) ||
    sourceTree !== workspace.sourceTree ||
    !commitPattern.test(sourceTree) ||
    requiredAttestationText(attestation, 'sourceBranch') !== job.source_branch ||
    attestation.sourceEditVersion !== job.source_edit_version ||
    !Number.isFinite(Date.parse(requiredAttestationText(attestation, 'verifiedAt')))
  ) {
    throw new Error('The release attestation does not match the exact handed-off source revision.');
  }

  if (!Array.isArray(attestation.checks) || attestation.checks.length === 0) {
    throw new Error('The release attestation contains no verification checks.');
  }
  const seenCheckIds = new Set();
  for (const check of attestation.checks) {
    if (
      !check ||
      typeof check.id !== 'string' ||
      typeof check.label !== 'string' ||
      !check.label.trim() ||
      check.status !== 'passed' ||
      typeof check.detail !== 'string' ||
      !check.detail.trim() ||
      seenCheckIds.has(check.id)
    ) {
      throw new Error('The release attestation contains an invalid or failed verification check.');
    }
    seenCheckIds.add(check.id);
  }
  if ([...requiredReleaseCheckIds].some((checkId) => !seenCheckIds.has(checkId))) {
    throw new Error('The release attestation is missing a required release check.');
  }

  return {
    ...attestation,
    sourceCommit,
    sourceTree,
    digest: createHash('sha256').update(source).digest('hex'),
  };
}

async function persistReleaseAttestation(job, releaseAttestation) {
  const { data: sourceRun, error: sourceRunError } = await supabase
    .from('builder_runs')
    .select('status, quality_summary')
    .eq('id', job.builder_run_id)
    .single();
  if (sourceRunError || !sourceRun) {
    throw new Error('The source builder history could not be recorded for release.', {
      cause: sourceRunError,
    });
  }

  const record = {
    attestation_id: releaseAttestation.id,
    organization_id: job.organization_id,
    business_id: job.business_id,
    source_builder_run_id: job.builder_run_id,
    source_manifest_id: job.source_manifest_id,
    source_repository_url: job.source_repository_url,
    source_commit: releaseAttestation.sourceCommit,
    source_tree: releaseAttestation.sourceTree,
    source_branch: releaseAttestation.sourceBranch,
    source_edit_version: releaseAttestation.sourceEditVersion,
    verification_profile: releaseAttestation.verificationProfile,
    verified_at: releaseAttestation.verifiedAt,
    checks: releaseAttestation.checks,
    attestation: releaseAttestation,
    attestation_digest: releaseAttestation.digest,
    source_builder_status: sourceRun.status,
    source_builder_quality_summary: sourceRun.quality_summary,
  };
  const { error: insertError } = await supabase
    .from('source_release_attestations')
    .upsert(record, { onConflict: 'attestation_digest', ignoreDuplicates: true });
  if (insertError) throw insertError;

  const { data: saved, error: savedError } = await supabase
    .from('source_release_attestations')
    .select('id, attestation_id, attestation_digest')
    .eq('attestation_digest', releaseAttestation.digest)
    .single();
  if (
    savedError ||
    !saved ||
    saved.attestation_id !== releaseAttestation.id ||
    saved.attestation_digest !== releaseAttestation.digest
  ) {
    throw new Error('The exact release attestation could not be persisted immutably.', {
      cause: savedError,
    });
  }
  await updateJob(job, { release_attestation_id: saved.id });
}

async function loadVerifiedValueReport(job, releaseAttestation) {
  const { data: report, error } = await supabase
    .from('decision_report_versions')
    .select('id, version, schema_version, review_state, summary, data, created_at')
    .eq('business_id', job.business_id)
    .eq('schema_version', 9)
    .eq('review_state', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const redesign = report?.data?.redesign;
  if (
    !report ||
    report.data?.reportKind !== 'verified_redesign_value' ||
    report.data?.generatorRevision !== 'gpt-5.6-sol-design-curation-v1' ||
    redesign?.status !== 'passed' ||
    redesign?.attestationId !== releaseAttestation.id ||
    redesign?.sourceBuilderRunId !== job.builder_run_id ||
    redesign?.sourceManifestId !== job.source_manifest_id ||
    redesign?.sourceCommit?.toLowerCase() !== job.source_commit.toLowerCase() ||
    redesign?.sourceEditVersion !== job.source_edit_version
  ) {
    throw new Error(
      'Create a current value report for this exact verified edit before Made Solid handoff.',
    );
  }
  return {
    ...report.data,
    summary: report.summary,
    version: report.version,
    schemaVersion: report.schema_version,
    reviewedAt: report.created_at,
  };
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

async function deployExactSource(job, cwd) {
  const projectName = deploymentProjectName(job);
  await ensureVercelProject(projectName, cwd);
  const { stdout } = await runWorkspaceCommand(
    'npx',
    vercelArgs(
      'deploy',
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
  return { previewUrl: previewDeploymentUrl(payload.deployment.url) };
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
      total_items: 5,
      progress_phase: 'verifying_source',
      progress_detail: 'Verifying the clean local repository against the exact handed-off commit.',
      completed_items: 0,
      lease_expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    });
    const workspace = await verifyExactSourceWorkspace(job);
    const releaseAttestation = await verifyReleaseAttestation(job, workspace);
    await persistReleaseAttestation(job, releaseAttestation);
    const report = await loadVerifiedValueReport(job, releaseAttestation);
    const deployment = await deployExactSource(job, workspace.cwd);
    await updateJob(job, {
      progress_phase: 'preview_ready',
      progress_detail:
        'Vercel built the exact commit as an isolated preview deployment. No production domain was assigned.',
      completed_items: 2,
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (await cancelled(job)) return;
    await updateJob(job, {
      progress_phase: 'sending',
      progress_detail: 'Sending the exact source lineage and verified preview to Made Solid.',
      completed_items: 3,
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
        releaseAttestation,
        report,
        clientName: job.client_name,
        contactName: job.contact_name,
        clientEmail: job.client_email,
        projectName: job.project_name,
        previewUrl: deployment.previewUrl,
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
    if (adminUrl.origin !== handoffEndpoint.origin || !adminUrl.pathname.startsWith('/admin')) {
      throw new Error('Made Solid returned an invalid private admin location.');
    }
    await updateJob(job, {
      progress_phase: 'verifying',
      progress_detail:
        'Made Solid saved the revision. Verifying the returned private admin record.',
      completed_items: 4,
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
      completed_items: 5,
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
