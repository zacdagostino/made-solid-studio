#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const studioDirectory = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = join(studioDirectory, 'prospect-workspaces');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: studioDirectory,
      stdio: 'inherit',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} stopped with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
          ),
        );
    });
  });
}

function runOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: studioDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let output = '';
    let errorOutput = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (errorOutput += chunk));
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(errorOutput.trim() || `${command} exited with code ${code}.`));
    });
  });
}

function printHelp() {
  console.log(`Usage: npm run workspace:open -- --repository OWNER/REPOSITORY

Clones or fast-forwards a private prospect repository inside prospect-workspaces/, verifies its
Made Solid refinement ledger, and prepares its locked website dependencies.`);
}

if (process.argv.includes('--help')) {
  printHelp();
  process.exit(0);
}

const repository = argumentValue('--repository');
if (!repository || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(repository)) {
  printHelp();
  throw new Error('Provide a valid private GitHub repository as OWNER/REPOSITORY.');
}

const repositoryName = basename(repository);
const destination = join(workspaceRoot, repositoryName);
const githubEnvironment = { ...process.env };
delete githubEnvironment.GITHUB_TOKEN;
await run('gh', ['auth', 'setup-git'], { env: githubEnvironment });

let workspaceExists = true;
try {
  await access(join(destination, '.git'));
} catch {
  workspaceExists = false;
}

if (workspaceExists) {
  const origin = await runOutput('git', ['-C', destination, 'remote', 'get-url', 'origin'], {
    env: githubEnvironment,
  });
  const originRepository = origin
    .replace(/^git@github\.com:/, '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '');
  if (originRepository.toLowerCase() !== repository.toLowerCase()) {
    throw new Error(
      `prospect-workspaces/${repositoryName} belongs to ${originRepository}, not ${repository}.`,
    );
  }
  console.log(`[workspace] Updating ${repository} without overwriting local changes.`);
  await run('git', ['-C', destination, 'pull', '--ff-only'], { env: githubEnvironment });
} else {
  console.log(`[workspace] Cloning ${repository} into prospect-workspaces/${repositoryName}.`);
  await run('gh', ['repo', 'clone', repository, destination], { env: githubEnvironment });
}

const packageDocument = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'));
for (const scriptName of ['made-solid:log', 'made-solid:summary', 'made-solid:bundle']) {
  if (typeof packageDocument.scripts?.[scriptName] !== 'string') {
    throw new Error(`The prospect workspace is missing the required ${scriptName} command.`);
  }
}

console.log('[workspace] Made Solid refinement logging is ready.');
try {
  await access(join(destination, 'node_modules', '.bin', 'next'));
  console.log('[workspace] Website dependencies are already installed.');
} catch {
  console.log('[workspace] Installing the prospect website dependencies.');
  await run('npm', ['--prefix', destination, 'ci', '--include=dev', '--no-audit', '--no-fund']);
}

console.log(
  `[workspace] Open prospect-workspaces/${repositoryName} in the current editor file tree.`,
);
console.log(
  `[workspace] Start the website: npm --prefix prospect-workspaces/${repositoryName} run dev`,
);
console.log(
  `[workspace] Review logged changes: npm --prefix prospect-workspaces/${repositoryName} run made-solid:summary`,
);
