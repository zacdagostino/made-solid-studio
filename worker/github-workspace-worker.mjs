import { execFile } from 'node:child_process';
import { hostname, tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  applyLocalDevelopmentHandoff,
  writeDownloadedBuildFile,
} from './local-development-handoff.mjs';

const runFile = promisify(execFile);
const artifactBucket = 'siteforge-artifacts';
const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_GITHUB_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId = process.env.SITEFORGE_WORKER_ID || `github-workspace-${hostname()}-${process.pid}`;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the GitHub workspace worker.`);
  return value;
}

const supabase = createClient(
  requiredEnvironment('SITEFORGE_SUPABASE_URL'),
  requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const githubToken = requiredEnvironment('GITHUB_TOKEN');
const allowedOwners = new Set(
  (process.env.GITHUB_ALLOWED_OWNERS || '')
    .split(',')
    .map((owner) => owner.trim().toLowerCase())
    .filter(Boolean),
);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function githubRequest(path, options = {}) {
  const response = await fetch(new URL(path, 'https://api.github.com'), {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'X-GitHub-Api-Version': '2026-03-10',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload?.message === 'string' ? ` ${payload.message}` : '';
    throw new Error(`GitHub rejected the repository request (${response.status}).${detail}`);
  }
  return payload;
}

async function updateJob(job, patch) {
  const { error } = await supabase
    .from('github_workspace_publications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function currentJob(job) {
  const { data, error } = await supabase
    .from('github_workspace_publications')
    .select('cancel_requested_at')
    .eq('id', job.id)
    .single();
  if (error) throw error;
  return data;
}

async function stopIfCancelled(job, repository) {
  const current = await currentJob(job);
  if (!current.cancel_requested_at) return false;
  await updateJob(job, {
    status: 'cancelled',
    progress_phase: 'cancelled',
    progress_detail: repository
      ? 'Publishing stopped before the source push. The private GitHub repository may remain empty and can be inspected from this workspace.'
      : 'Publishing stopped at a safe checkpoint before a GitHub repository was created.',
    github_repository_id: repository?.id ?? null,
    github_repository_url: repository?.html_url ?? null,
    github_clone_url: repository?.clone_url ?? null,
    github_full_name: repository?.full_name ?? null,
    github_default_branch: repository?.default_branch ?? 'main',
    lease_expires_at: null,
    completed_at: new Date().toISOString(),
  });
  return true;
}

async function downloadArtifact(artifact, projectDirectory, relativePath) {
  const { data, error } = await supabase.storage
    .from(artifact.storage_bucket || artifactBucket)
    .download(artifact.storage_path);
  if (error || !data) throw new Error(`Could not load ${relativePath} from the private build.`);
  await writeDownloadedBuildFile(
    projectDirectory,
    relativePath,
    Buffer.from(await data.arrayBuffer()),
  );
}

async function downloadInBatches(tasks, concurrency = 6) {
  for (let index = 0; index < tasks.length; index += concurrency) {
    await Promise.all(tasks.slice(index, index + concurrency).map((task) => task()));
  }
}

async function loadRun(job) {
  const { data, error } = await supabase
    .from('builder_runs')
    .select(
      'id,business_id,build_manifest_id,agent_package_id,build_mode,status,template_version,agent_packages(version)',
    )
    .eq('id', job.builder_run_id)
    .single();
  if (error || !data) throw new Error('The completed Studio build could not be loaded.');
  if (data.build_mode !== 'full_site' || !['ready', 'review_required'].includes(data.status)) {
    throw new Error('A completed full-site build is required for local development publishing.');
  }
  return data;
}

async function loadWorkspaceArchive(job, temporaryDirectory, artifact) {
  const archivePath = join(temporaryDirectory, 'workspace.tgz');
  const { data, error } = await supabase.storage
    .from(artifact.storage_bucket || artifactBucket)
    .download(artifact.storage_path);
  if (error || !data) throw new Error('The local-development workspace could not be downloaded.');
  await writeFile(archivePath, Buffer.from(await data.arrayBuffer()));
  const { stdout } = await runFile('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const entries = stdout.split('\n').filter(Boolean);
  if (!entries.length || entries.length > 10_000) {
    throw new Error('The local-development workspace archive is invalid.');
  }
  if (
    entries.some((entry) => {
      const path = entry.replaceAll('\\', '/');
      return path.startsWith('/') || path.split('/').some((segment) => segment === '..');
    })
  ) {
    throw new Error('The local-development workspace contains an unsafe path.');
  }
  await runFile('tar', ['-xzf', archivePath, '-C', temporaryDirectory]);
  const nestedDirectory = join(temporaryDirectory, 'website');
  return (await stat(join(nestedDirectory, 'package.json')).catch(() => undefined))
    ? nestedDirectory
    : temporaryDirectory;
}

async function reconstructWorkspace(job, run, temporaryDirectory, artifacts) {
  const projectDirectory = join(temporaryDirectory, 'website');
  await mkdir(projectDirectory, { recursive: true });
  const sourceArtifacts = artifacts.filter(
    (artifact) =>
      artifact.kind === 'draft_file' && record(artifact.metadata).state === 'final_source',
  );
  if (!sourceArtifacts.length) {
    throw new Error('This build has no complete per-file source evidence to publish safely.');
  }
  const assetArtifacts = artifacts.filter((artifact) => {
    const previewPath = record(artifact.metadata).previewPath;
    return (
      artifact.kind === 'site_file' &&
      typeof previewPath === 'string' &&
      previewPath.startsWith('assets/')
    );
  });
  await updateJob(job, {
    total_items: sourceArtifacts.length + assetArtifacts.length + 4,
    progress_detail: `Rebuilding the local workspace from ${sourceArtifacts.length} source files and ${assetArtifacts.length} approved assets.`,
  });
  await downloadInBatches([
    ...sourceArtifacts.map((artifact) => () => {
      const sourcePath = record(artifact.metadata).sourcePath;
      if (typeof sourcePath !== 'string') {
        throw new Error('A final source artifact has no safe path.');
      }
      return downloadArtifact(artifact, projectDirectory, sourcePath);
    }),
    ...assetArtifacts.map((artifact) => () => {
      const previewPath = record(artifact.metadata).previewPath;
      return downloadArtifact(artifact, projectDirectory, `public/${previewPath}`);
    }),
  ]);
  await applyLocalDevelopmentHandoff(projectDirectory, {
    studioBuildId: run.id,
    businessId: run.business_id,
    buildManifestId: run.build_manifest_id,
    agentPackageId: run.agent_package_id,
    agentPackageVersion: run.agent_packages?.version ? Number(run.agent_packages.version) : null,
    buildMode: run.build_mode,
    templateVersion: run.template_version,
    baselineCommit: null,
  });
  await updateJob(job, {
    completed_items: sourceArtifacts.length + assetArtifacts.length,
  });
  return {
    projectDirectory,
    completedItems: sourceArtifacts.length + assetArtifacts.length,
    totalItems: sourceArtifacts.length + assetArtifacts.length + 4,
  };
}

async function prepareWorkspace(job, run, temporaryDirectory) {
  const { data: artifacts, error } = await supabase
    .from('builder_artifacts')
    .select('kind,label,storage_bucket,storage_path,metadata')
    .eq('builder_run_id', run.id)
    .in('kind', ['source_bundle', 'draft_file', 'site_file'])
    .order('created_at');
  if (error) throw error;
  const localArchive = artifacts?.find(
    (artifact) =>
      artifact.kind === 'source_bundle' &&
      typeof record(artifact.metadata).localDevelopmentHandoffVersion === 'number',
  );
  if (!localArchive) return reconstructWorkspace(job, run, temporaryDirectory, artifacts ?? []);

  await updateJob(job, {
    total_items: 5,
    progress_detail: 'Downloading the complete local-development workspace.',
  });
  const projectDirectory = await loadWorkspaceArchive(job, temporaryDirectory, localArchive);
  if (!(await stat(join(projectDirectory, 'package.json')).catch(() => undefined))) {
    throw new Error('The local-development workspace has no package.json.');
  }
  await updateJob(job, { completed_items: 1 });
  return { projectDirectory, completedItems: 1, totalItems: 5 };
}

async function initialiseRepository(job, projectDirectory) {
  await updateJob(job, {
    progress_phase: 'preparing_repository',
    progress_detail: 'Creating a clean main branch and initial source commit.',
    lease_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  await rm(join(projectDirectory, '.git'), { recursive: true, force: true });
  await runFile('git', ['init', '--initial-branch=main'], { cwd: projectDirectory });
  await runFile('git', ['config', 'user.name', 'Made Solid Studio'], { cwd: projectDirectory });
  await runFile('git', ['config', 'user.email', 'local-development@madesolid.invalid'], {
    cwd: projectDirectory,
  });
  await runFile('git', ['add', '--all'], { cwd: projectDirectory });
  await runFile(
    'git',
    ['commit', '-m', `Local development workspace from Studio build ${job.builder_run_id}`],
    { cwd: projectDirectory, maxBuffer: 10 * 1024 * 1024 },
  );
}

async function createRepository(job) {
  const viewer = await githubRequest('/user');
  const requestedOwner = job.repository_owner.toLowerCase();
  if (allowedOwners.size && !allowedOwners.has(requestedOwner)) {
    throw new Error('That GitHub owner is not allowed by this Studio worker configuration.');
  }
  const body = JSON.stringify({
    name: job.repository_name,
    description: job.repository_description,
    private: true,
    auto_init: false,
  });
  const endpoint =
    viewer?.login?.toLowerCase() === requestedOwner
      ? '/user/repos'
      : `/orgs/${encodeURIComponent(job.repository_owner)}/repos`;
  return githubRequest(endpoint, { method: 'POST', body });
}

async function pushRepository(projectDirectory, repository) {
  const remoteUrl = `https://github.com/${repository.full_name}.git`;
  await runFile('git', ['remote', 'add', 'origin', remoteUrl], { cwd: projectDirectory });
  const basicCredential = Buffer.from(`x-access-token:${githubToken}`).toString('base64');
  await runFile('git', ['push', '--set-upstream', 'origin', 'main'], {
    cwd: projectDirectory,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.extraHeader',
      GIT_CONFIG_VALUE_0: `Authorization: Basic ${basicCredential}`,
      GIT_TERMINAL_PROMPT: '0',
    },
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function processJob(job) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'made-solid-github-'));
  let repository;
  try {
    const run = await loadRun(job);
    const workspace = await prepareWorkspace(job, run, temporaryDirectory);
    const { projectDirectory, completedItems, totalItems } = workspace;
    if (await stopIfCancelled(job)) return;

    await initialiseRepository(job, projectDirectory);
    await updateJob(job, {
      completed_items: completedItems + 1,
      progress_phase: 'creating_private_repository',
      progress_detail: `Creating the private GitHub repository ${job.repository_owner}/${job.repository_name}.`,
    });
    if (await stopIfCancelled(job)) return;

    repository = await createRepository(job);
    if (!repository?.id || !repository?.html_url || !repository?.full_name) {
      throw new Error('GitHub did not return the created private repository.');
    }
    if (!repository.private) {
      throw new Error('GitHub did not confirm that the created repository is private.');
    }
    await updateJob(job, {
      github_repository_id: repository.id,
      github_repository_url: repository.html_url,
      github_clone_url: repository.clone_url,
      github_full_name: repository.full_name,
      github_default_branch: repository.default_branch || 'main',
      completed_items: completedItems + 2,
      progress_phase: 'pushing_source',
      progress_detail:
        'The private repository exists. Pushing the editable source and local refinement workflow.',
      lease_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    if (await stopIfCancelled(job, repository)) return;

    await pushRepository(projectDirectory, repository);
    await updateJob(job, {
      status: 'ready',
      progress_phase: 'ready',
      progress_detail: 'The private GitHub repository is ready to clone for local development.',
      completed_items: totalItems,
      github_default_branch: 'main',
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub workspace publishing failed.';
    await updateJob(job, {
      status: 'failed',
      progress_phase: 'failed',
      progress_detail: repository
        ? 'The private repository was created, but the source push did not finish. Inspect the repository before retrying with a new name.'
        : 'Publishing stopped before a usable GitHub repository was ready.',
      github_repository_id: repository?.id ?? null,
      github_repository_url: repository?.html_url ?? null,
      github_clone_url: repository?.clone_url ?? null,
      github_full_name: repository?.full_name ?? null,
      github_default_branch: repository?.default_branch ?? null,
      error_summary: message.slice(0, 1_000),
      lease_expires_at: null,
      completed_at: new Date().toISOString(),
    }).catch(() => undefined);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc('claim_next_github_workspace_publication', {
    worker_identity: workerId,
  });
  if (error) throw error;
  return data?.[0];
}

async function heartbeatWorker() {
  const { error } = await supabase.rpc('heartbeat_github_workspace_worker', {
    worker_identity: workerId,
  });
  if (error) throw error;
}

async function releaseWorker() {
  const { error } = await supabase.rpc('release_github_workspace_worker', {
    worker_identity: workerId,
  });
  if (error) throw error;
}

async function run() {
  await heartbeatWorker();
  const heartbeat = setInterval(() => {
    void heartbeatWorker().catch((error) => {
      console.error(
        '[github-workspace-worker] heartbeat failed:',
        error instanceof Error ? error.message : error,
      );
    });
  }, 15_000);
  try {
    let keepPolling = true;
    while (keepPolling) {
      const job = await claimJob();
      if (job) await processJob(job);
      if (!job && !once) await wait(pollMs);
      keepPolling = !once;
    }
  } finally {
    clearInterval(heartbeat);
    await releaseWorker().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error(
    '[github-workspace-worker] stopped:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
