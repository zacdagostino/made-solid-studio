import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

function required(name, environment) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required for this deployment.`);
  return value;
}

async function run(command, arguments_, { cwd, environment = process.env } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout = `${stdout}${chunk}`.slice(-24_000);
    });
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-24_000);
    });
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) {
        resolveRun(stdout.trim());
        return;
      }
      const safeDetail = `${stderr || stdout}`
        .replace(/(token|secret|password|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(-600);
      rejectRun(new Error(safeDetail || `${command} stopped with exit code ${code}.`));
    });
  });
}

async function requireCleanExactCommit(directory, expectedCommit) {
  const status = await run('git', ['status', '--porcelain=v1'], { cwd: directory });
  if (status)
    throw new Error('The repository has uncommitted changes. Commit or isolate them first.');
  const head = await run('git', ['rev-parse', 'HEAD'], { cwd: directory });
  if (head.toLowerCase() !== expectedCommit.toLowerCase()) {
    throw new Error('The repository HEAD no longer matches the feature release commit.');
  }
}

async function requireReachable(url, expectedText) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const body = await response.text();
  if (!response.ok || (expectedText && !body.includes(expectedText))) {
    throw new Error(`Deployment verification failed at ${new URL(url).hostname}.`);
  }
}

function railwayCliEnvironment(environment) {
  const cliEnvironment = { ...environment };
  for (const name of [
    'RAILWAY_TOKEN',
    'RAILWAY_PROJECT_ID',
    'RAILWAY_PROJECT_NAME',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_SERVICE_NAME',
    'RAILWAY_ENVIRONMENT',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_ENVIRONMENT_NAME',
  ]) {
    delete cliEnvironment[name];
  }
  return cliEnvironment;
}

async function deployWebsite({ directory, production, environment }) {
  const project =
    environment.MADE_SOLID_WEBSITE_RAILWAY_PROJECT_ID?.trim() ||
    '6bc96d42-6c26-4ef5-967e-3ef8c62ec314';
  const service =
    environment.MADE_SOLID_WEBSITE_RAILWAY_SERVICE_ID?.trim() ||
    'c18c6e44-3210-4222-b8d3-0b8d378d3b6e';
  const railwayEnvironment = production ? 'production' : 'development';
  await run(
    'npx',
    [
      '--yes',
      '@railway/cli',
      'up',
      '--ci',
      '--project',
      project,
      '--service',
      service,
      '--environment',
      railwayEnvironment,
      '--message',
      `Deploy verified Made Solid website ${railwayEnvironment} release`,
    ],
    { cwd: directory, environment: railwayCliEnvironment(environment) },
  );
  await requireReachable(production ? 'https://madesolid.com.au' : 'https://dev.madesolid.com.au');
  return production ? 'https://madesolid.com.au' : 'https://dev.madesolid.com.au';
}

async function deployStudio({ directory, production, environment }) {
  if (!production) {
    await requireReachable(
      'https://dev.studio.madesolid.com.au/health',
      'feature-release-metadata-v2',
    );
    return 'https://dev.studio.madesolid.com.au';
  }
  await run(
    'npx',
    [
      '--yes',
      '@railway/cli',
      'up',
      '--ci',
      '--project',
      required('RAILWAY_PROJECT_ID', environment),
      '--service',
      required('RAILWAY_SERVICE_ID', environment),
      '--environment',
      'production',
      '--message',
      'Promote verified Feature Releases selection',
    ],
    { cwd: directory, environment: railwayCliEnvironment(environment) },
  );
  await requireReachable('https://studio.madesolid.com.au/health', 'feature-release-metadata-v2');
  return 'https://studio.madesolid.com.au';
}

export async function runFeatureDeployment({
  feature,
  run: deploymentRun,
  repositories,
  environment = process.env,
}) {
  const targets = feature.targets || [];
  for (const target of targets) {
    const repository = repositories.find((candidate) => candidate.id === target.repositoryId);
    if (!repository) throw new Error(`The ${target.label} repository is unavailable.`);
    await requireCleanExactCommit(resolve(repository.directory), target.sourceCommit);
  }

  const production = deploymentRun.environment === 'production';
  const targetIds = new Set(targets.map((target) => target.repositoryId));
  if (production && targetIds.has('studio') && targetIds.has('website')) {
    const studio = repositories.find((candidate) => candidate.id === 'studio');
    await run('npm', ['run', 'deploy:synchronized-runtime'], {
      cwd: studio.directory,
      environment,
    });
    return {
      studio: 'https://studio.madesolid.com.au',
      website: 'https://madesolid.com.au',
    };
  }

  const urls = {};
  if (targetIds.has('website')) {
    const website = repositories.find((candidate) => candidate.id === 'website');
    urls.website = await deployWebsite({
      directory: website.directory,
      production,
      environment,
    });
  }
  if (targetIds.has('studio')) {
    const studio = repositories.find((candidate) => candidate.id === 'studio');
    urls.studio = await deployStudio({
      directory: studio.directory,
      production,
      environment,
    });
  }
  return urls;
}

export async function runAutomaticDevelopmentRelease({
  feature,
  featureReleaseStore,
  repositories,
  environment = process.env,
  deploy = runFeatureDeployment,
}) {
  if (!feature?.id || feature.status !== 'ready_development') {
    return {
      status: 'blocked',
      detail: 'Development waits for an exact committed feature revision.',
    };
  }
  if (
    feature.deploymentRuns?.some((run) => ['queued', 'running'].includes(String(run.status || '')))
  ) {
    return { status: 'already_running' };
  }
  const started = await featureReleaseStore.deploymentStarted({
    featureId: feature.id,
    environment: 'development',
  });
  try {
    const urls = await deploy({
      feature: started.feature,
      run: started.run,
      repositories,
      environment,
    });
    await featureReleaseStore.deploymentFinished({
      featureId: started.feature.id,
      runId: started.run.id,
      status: 'completed',
      detail: 'The exact development release was deployed automatically and verified.',
      urls,
    });
    return { status: 'completed', run: started.run, urls };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The deployment did not finish.';
    await featureReleaseStore.deploymentFinished({
      featureId: started.feature.id,
      runId: started.run.id,
      status: 'failed',
      detail,
    });
    return { status: 'failed', run: started.run, detail };
  }
}
