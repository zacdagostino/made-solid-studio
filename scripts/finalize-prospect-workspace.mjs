#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { relative, resolve, sep } from 'node:path';

const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const arguments_ = process.argv.slice(2);
const directoryIndex = arguments_.indexOf('--directory');
const directory = directoryIndex >= 0 ? arguments_[directoryIndex + 1]?.trim() : '';

function emit(status, phase, detail, extra = {}) {
  process.stdout.write(`${JSON.stringify({ status, phase, detail, ...extra })}\n`);
}

function git(workspace, ...gitArguments) {
  return execFileSync('git', gitArguments, {
    cwd: workspace,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function optionalGit(workspace, ...gitArguments) {
  try {
    return git(workspace, ...gitArguments);
  } catch {
    return '';
  }
}

function prospectWorkspace(directory, environment = process.env) {
  const studioWorkspace = environment.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim();
  const prospectRoot = studioWorkspace
    ? resolve(studioWorkspace, 'prospect-workspaces')
    : resolve(environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim() || 'prospect-workspaces');
  return resolve(prospectRoot, directory);
}

function restoreGeneratedNextEnvironment(workspace) {
  const relativePath = 'next-env.d.ts';
  const changed = optionalGit(workspace, 'status', '--porcelain', '--', relativePath);
  if (!changed || !existsSync(resolve(workspace, relativePath))) return;
  let committedSource;
  try {
    committedSource = execFileSync('git', ['show', `HEAD:${relativePath}`], {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }
  const generatedDevelopmentSource = committedSource.replace(
    './.next/types/routes.d.ts',
    './.next/dev/types/routes.d.ts',
  );
  const currentSource = readFileSync(resolve(workspace, relativePath), 'utf8');
  if (currentSource === generatedDevelopmentSource) {
    writeFileSync(resolve(workspace, relativePath), committedSource);
  }
}

function run(command, commandArguments, cwd, environment = process.env) {
  const result = spawnSync(command, commandArguments, {
    cwd,
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const commandOutput = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    const outputLines = commandOutput.split(/\r?\n/).filter(Boolean);
    const noteworthyLines = outputLines.filter((line) =>
      /TypeError|Error occurred|prerender|Export encountered|build worker exited|Error:/i.test(
        line,
      ),
    );
    const usefulTail = outputLines.filter(
      (line) =>
        !/Each child in a list should have a unique|Check the top-level render call|react\.dev\/link\/warning-keys/i.test(
          line,
        ),
    );
    const detailLines = [...noteworthyLines.slice(-8), ...usefulTail.slice(-12)]
      .filter((line, index, lines) => lines.indexOf(line) === index)
      .slice(-16);
    const detail = detailLines.join(' ') || `${command} failed.`;
    const error = new Error(detail);
    error.commandOutput = commandOutput;
    throw error;
  }
}

function isTransientNextExportFailure(error) {
  return /Export encountered an error|Next\.js build worker exited|\/_global-error/i.test(
    error?.commandOutput || error?.message || '',
  );
}

function verifyWorkspace(workspace, directory) {
  const verificationRoot = mkdtempSync(resolve(tmpdir(), 'made-solid-final-edit-'));
  const verificationWorkspace = resolve(verificationRoot, directory);
  const excludedDirectories = new Set(['.git', '.next', 'node_modules', 'out']);
  const verificationEnvironment = {
    ...process.env,
    CIRCLE_NODE_TOTAL: '2',
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_ENV: 'production',
  };
  try {
    cpSync(workspace, verificationWorkspace, {
      recursive: true,
      filter(source) {
        const sourceRelativePath = relative(workspace, source);
        if (!sourceRelativePath) return true;
        return !sourceRelativePath.split(sep).some((segment) => excludedDirectories.has(segment));
      },
    });
    symlinkSync(
      resolve(workspace, 'node_modules'),
      resolve(verificationWorkspace, 'node_modules'),
      'dir',
    );
    run('npm', ['run', 'verify'], verificationWorkspace, verificationEnvironment);
  } finally {
    rmSync(verificationRoot, { recursive: true, force: true });
  }
}

try {
  if (!directory || !directoryPattern.test(directory)) {
    throw new Error('A valid prospect workspace directory is required.');
  }
  const workspace = prospectWorkspace(directory);
  if (!existsSync(resolve(workspace, '.git'))) {
    throw new Error('Open the prospect workspace before committing its final edit.');
  }
  if (!existsSync(resolve(workspace, '.made-solid', 'refinement-log.jsonl'))) {
    throw new Error('The Made Solid refinement ledger is missing.');
  }

  const branch = optionalGit(workspace, 'branch', '--show-current');
  const upstreamRemote = branch
    ? optionalGit(workspace, 'config', '--get', `branch.${branch}.remote`)
    : '';
  const upstreamMergeReference = branch
    ? optionalGit(workspace, 'config', '--get', `branch.${branch}.merge`)
    : '';
  const upstreamBranch = upstreamMergeReference.startsWith('refs/heads/')
    ? upstreamMergeReference.slice('refs/heads/'.length)
    : '';
  const remote = upstreamRemote ? optionalGit(workspace, 'remote', 'get-url', upstreamRemote) : '';
  if (!branch || !upstreamRemote || upstreamRemote === '.' || !upstreamBranch || !remote) {
    throw new Error(
      'Repository connection needs repair. Your website changes are still safe and no new version was committed. Reopen the editing workspace, then retry this checkpoint.',
    );
  }
  const upstream = optionalGit(workspace, 'rev-parse', '--abbrev-ref', '@{upstream}');
  if (upstream !== `${upstreamRemote}/${upstreamBranch}`) {
    throw new Error(
      'The editable repository branch does not match its configured upstream branch. Reconnect the editing workspace before committing it.',
    );
  }
  const startingCommit = git(workspace, 'rev-parse', 'HEAD');
  const upstreamCommit = git(workspace, 'rev-parse', '@{upstream}');
  if (startingCommit !== upstreamCommit) {
    throw new Error(
      'The editable repository is not synced with its GitHub branch. Sync it before committing this website edit.',
    );
  }

  restoreGeneratedNextEnvironment(workspace);

  const latestSubject = git(workspace, 'log', '-1', '--pretty=%s');
  const hasChanges = Boolean(git(workspace, 'status', '--porcelain'));
  if (hasChanges) {
    const priorVersionCount = Number(
      git(
        workspace,
        'log',
        '--format=%H',
        '--grep=^Finalize Made Solid edit:',
        '--grep=^Made Solid edit v[0-9]',
      )
        .split(/\r?\n/)
        .filter(Boolean).length,
    );
    const editVersion = priorVersionCount + 1;
    emit(
      'running',
      'verifying',
      'Running the complete website verification in an isolated source snapshot.',
    );
    try {
      verifyWorkspace(workspace, directory);
    } catch (error) {
      if (!isTransientNextExportFailure(error)) throw error;
      emit(
        'running',
        'verifying',
        'The Next.js export worker stopped unexpectedly. Retrying the complete verification once.',
      );
      verifyWorkspace(workspace, directory);
    }
    emit('running', 'bundling', 'Refreshing the immutable Made Solid refinement bundle.');
    run('npm', ['run', 'made-solid:bundle'], workspace);
    emit('running', 'committing', 'Creating the final website edit commit.');
    git(workspace, 'add', '-A');
    git(workspace, 'commit', '-m', `Made Solid edit v${editVersion}: ${directory}`);
  } else if (
    !latestSubject.startsWith('Finalize Made Solid edit:') &&
    !latestSubject.startsWith('Made Solid edit v')
  ) {
    throw new Error('There are no pending edits to finalise.');
  }

  const commit = git(workspace, 'rev-parse', 'HEAD');
  emit('running', 'pushing', 'Pushing the final edit to its configured repository branch.');
  const githubEnvironment = { ...process.env };
  delete githubEnvironment.GITHUB_TOKEN;
  run('gh', ['auth', 'setup-git'], workspace, githubEnvironment);
  run(
    'git',
    ['push', upstreamRemote, `HEAD:refs/heads/${upstreamBranch}`],
    workspace,
    githubEnvironment,
  );
  const pushedCommit = git(workspace, 'rev-parse', '@{upstream}');
  if (pushedCommit !== commit) {
    throw new Error('GitHub did not confirm the exact website edit commit on its tracked branch.');
  }
  emit(
    'complete',
    'ready',
    'The final edit is committed and available in the prospect repository.',
    {
      branch,
      commit,
    },
  );
} catch (error) {
  emit(
    'failed',
    'failed',
    error instanceof Error ? error.message : 'The final edit could not be committed.',
  );
  process.exitCode = 1;
}
