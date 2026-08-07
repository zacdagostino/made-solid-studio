import { execFileSync } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  applyLocalDevelopmentHandoff,
  writeDownloadedBuildFile,
} from '../worker/local-development-handoff.mjs';

function argumentsFrom(commandArguments) {
  const values = new Map();
  for (let index = 0; index < commandArguments.length; index += 1) {
    const key = commandArguments[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = commandArguments[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values.set(key.slice(2), value.trim());
    index += 1;
  }
  return values;
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function git(projectDirectory, ...arguments_) {
  return execFileSync('git', arguments_, {
    cwd: projectDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function ensureEmptyDestination(destinationDirectory) {
  const destinationStat = await stat(destinationDirectory).catch(() => undefined);
  if (destinationStat && !destinationStat.isDirectory()) {
    throw new Error('The local build destination exists and is not a directory.');
  }
  if (destinationStat && (await readdir(destinationDirectory)).length) {
    throw new Error('The local build destination must be new or empty.');
  }
  await mkdir(destinationDirectory, { recursive: true });
}

async function downloadArtifact(client, artifact, projectDirectory, relativePath) {
  const { data, error } = await client.storage
    .from(artifact.storage_bucket || 'siteforge-artifacts')
    .download(artifact.storage_path);
  if (error || !data) {
    throw new Error(`Could not download ${relativePath}.`);
  }
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

const values = argumentsFrom(process.argv.slice(2));
const requestedRun = values.get('run') || 'latest';
const destinationValue = values.get('destination');
if (!destinationValue) {
  throw new Error('--destination is required and must point to a new or empty directory.');
}

const supabaseUrl = process.env.SITEFORGE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SITEFORGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Made Solid Studio Supabase credentials are unavailable in this shell.');
}

const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
let runQuery = client
  .from('builder_runs')
  .select(
    'id,business_id,build_manifest_id,agent_package_id,build_mode,status,template_version,created_at',
  )
  .in('status', ['ready', 'review_required'])
  .order('created_at', { ascending: false })
  .limit(1);
if (requestedRun !== 'latest') runQuery = runQuery.eq('id', requestedRun);
else runQuery = runQuery.eq('build_mode', 'full_site');
const { data: runs, error: runError } = await runQuery;
if (runError) throw runError;
const run = runs?.[0];
if (!run) throw new Error('No completed private website build matched this export request.');

const [{ data: artifacts, error: artifactError }, { data: agentPackage, error: packageError }] =
  await Promise.all([
    client
      .from('builder_artifacts')
      .select('id,kind,label,storage_bucket,storage_path,metadata')
      .eq('builder_run_id', run.id)
      .in('kind', ['draft_file', 'site_file'])
      .order('created_at'),
    run.agent_package_id
      ? client
          .from('agent_packages')
          .select('id,version')
          .eq('id', run.agent_package_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
if (artifactError) throw artifactError;
if (packageError) throw packageError;

const sourceArtifacts = (artifacts ?? []).filter(
  (artifact) =>
    artifact.kind === 'draft_file' && record(artifact.metadata).state === 'final_source',
);
if (!sourceArtifacts.length) {
  throw new Error('This build has no complete per-file source evidence to export safely.');
}
const assetArtifacts = (artifacts ?? []).filter((artifact) => {
  const previewPath = record(artifact.metadata).previewPath;
  return (
    artifact.kind === 'site_file' &&
    typeof previewPath === 'string' &&
    previewPath.startsWith('assets/')
  );
});

const destinationDirectory = resolve(destinationValue);
await ensureEmptyDestination(destinationDirectory);
await downloadInBatches([
  ...sourceArtifacts.map((artifact) => () => {
    const sourcePath = record(artifact.metadata).sourcePath;
    if (typeof sourcePath !== 'string')
      throw new Error('A final source artifact has no safe path.');
    return downloadArtifact(client, artifact, destinationDirectory, sourcePath);
  }),
  ...assetArtifacts.map((artifact) => () => {
    const previewPath = record(artifact.metadata).previewPath;
    return downloadArtifact(client, artifact, destinationDirectory, `public/${previewPath}`);
  }),
]);

let baselineCommit = null;
try {
  git(destinationDirectory, 'init', '--initial-branch=main');
  git(destinationDirectory, 'config', 'user.name', 'Made Solid Studio');
  git(destinationDirectory, 'config', 'user.email', 'local-development@madesolid.invalid');
  git(destinationDirectory, 'add', '--all');
  git(destinationDirectory, 'commit', '-m', `Baseline from Made Solid Studio build ${run.id}`);
  baselineCommit = git(destinationDirectory, 'rev-parse', 'HEAD');
} catch {
  console.warn('Git baseline commit could not be created automatically; initialise it manually.');
}

await applyLocalDevelopmentHandoff(destinationDirectory, {
  studioBuildId: run.id,
  businessId: run.business_id,
  buildManifestId: run.build_manifest_id,
  agentPackageId: run.agent_package_id,
  agentPackageVersion: agentPackage?.version ? Number(agentPackage.version) : null,
  buildMode: run.build_mode,
  templateVersion: run.template_version,
  baselineCommit,
});

if (baselineCommit) {
  git(destinationDirectory, 'add', '--all');
  git(destinationDirectory, 'commit', '-m', 'Add Made Solid local refinement workflow');
}

console.log(
  JSON.stringify(
    {
      status: 'ready',
      buildId: run.id,
      destination: destinationDirectory,
      sourceFiles: sourceArtifacts.length,
      approvedAssets: assetArtifacts.length,
      baselineCommit,
      next: ['npm ci', 'npm run dev', 'Read AGENTS.md and LOCAL_DEVELOPMENT.md'],
    },
    null,
    2,
  ),
);
