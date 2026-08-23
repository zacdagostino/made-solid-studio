#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function run(command, arguments_, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, arguments_, { stdio: 'ignore', ...options });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}

export function activeWorkspaceDirectory(
  directory,
  environment = process.env,
  pathExists = existsSync,
) {
  if (!directoryPattern.test(directory || '')) return undefined;
  const candidates = [];
  for (const configuredPath of [
    environment.SITEFORGE_STUDIO_WORKSPACE_DIR,
    environment.MADE_SOLID_WEBSITE_DIRECTORY,
  ]) {
    const workspace = configuredPath?.trim();
    if (workspace && basename(resolve(workspace)) === directory)
      candidates.push(resolve(workspace));
  }
  const prospectRoot = environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim();
  if (prospectRoot) candidates.push(resolve(prospectRoot, directory));
  return candidates.find(
    (candidate) =>
      pathExists(resolve(candidate, '.git')) &&
      pathExists(resolve(candidate, 'package.json')) &&
      pathExists(resolve(candidate, 'node_modules')),
  );
}

export function developmentServerHostFlag(packageDocument) {
  const developmentScript = String(packageDocument?.scripts?.dev || '');
  return /(?:^|\s)vite(?:\s|$)/.test(developmentScript) ? '--host' : '--hostname';
}

async function websiteIsReady(port, fetchImplementation = fetch) {
  try {
    await fetchImplementation(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(1_000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function restoreActiveWorkspacePreview({
  environment = process.env,
  pathExists = existsSync,
  readFileImplementation = readFile,
  runCommand = run,
  ready = (port) => websiteIsReady(port),
  wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)),
} = {}) {
  const activePreviewPath = environment.SITEFORGE_ACTIVE_PREVIEW_PATH?.trim();
  if (!activePreviewPath || !pathExists(activePreviewPath)) return { status: 'none' };
  let active;
  try {
    active = JSON.parse(await readFileImplementation(activePreviewPath, 'utf8'));
  } catch {
    return { status: 'invalid' };
  }
  if (
    !directoryPattern.test(active.directory || '') ||
    !Number.isInteger(active.port) ||
    active.port < 1 ||
    active.port > 65_535
  ) {
    return { status: 'invalid' };
  }
  const reservedPorts = new Set([
    Number(environment.PORT) || 8080,
    Number(environment.SITEFORGE_WORKSPACE_PROXY_PORT) || 3000,
    Number(environment.SITEFORGE_PREVIEW_PORT) || 8787,
    4500,
  ]);
  if (reservedPorts.has(active.port)) return { ...active, status: 'invalid' };
  const destination = activeWorkspaceDirectory(active.directory, environment, pathExists);
  if (!destination) return { ...active, status: 'rejected' };
  if (await ready(active.port)) return { ...active, status: 'ready' };
  let packageDocument;
  try {
    packageDocument = JSON.parse(
      await readFileImplementation(resolve(destination, 'package.json'), 'utf8'),
    );
  } catch {
    return { ...active, status: 'rejected' };
  }
  if (typeof packageDocument.scripts?.dev !== 'string') {
    return { ...active, status: 'rejected' };
  }
  const sessionName = `made-solid-${active.directory.replace(/[^A-Za-z0-9_-]/g, '-')}`.slice(0, 80);
  await runCommand('tmux', ['kill-session', '-t', sessionName]).catch(() => undefined);
  await runCommand('tmux', [
    'new-session',
    '-d',
    '-s',
    sessionName,
    '-c',
    destination,
    'env',
    'NODE_ENV=development',
    'npm',
    'run',
    'dev',
    '--',
    developmentServerHostFlag(packageDocument),
    '0.0.0.0',
    '--port',
    String(active.port),
  ]);
  await runCommand('tmux', ['set-option', '-t', sessionName, 'remain-on-exit', 'on']);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await ready(active.port)) {
      return { ...active, sessionName, status: 'restarted' };
    }
    await wait(500);
  }
  throw new Error('The saved active workspace did not restart within 30 seconds.');
}

async function main() {
  const result = await restoreActiveWorkspacePreview();
  if (result.status === 'restarted') {
    console.log(
      `[railway-runtime] Restored active workspace ${result.directory} on port ${result.port}.`,
    );
  } else if (result.status === 'ready') {
    console.log(
      `[railway-runtime] Active workspace ${result.directory} is already ready on port ${result.port}.`,
    );
  } else if (result.status === 'invalid' || result.status === 'rejected') {
    console.warn('[railway-runtime] Ignored an invalid or unapproved active workspace record.');
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  main().catch((error) => {
    console.error(`[railway-runtime] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
