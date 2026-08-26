import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const nextEnvironmentPath = 'next-env.d.ts';

function committedNextEnvironment(workspace) {
  try {
    return execFileSync('git', ['show', `HEAD:${nextEnvironmentPath}`], {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

export function generatedNextEnvironmentChanged(workspace) {
  const path = resolve(workspace, nextEnvironmentPath);
  if (!existsSync(path)) return false;
  const committedSource = committedNextEnvironment(workspace);
  if (!committedSource) return false;
  const generatedDevelopmentSource = committedSource.replace(
    './.next/types/routes.d.ts',
    './.next/dev/types/routes.d.ts',
  );
  return (
    generatedDevelopmentSource !== committedSource &&
    readFileSync(path, 'utf8') === generatedDevelopmentSource
  );
}

export function meaningfulGitStatus(workspace) {
  let source;
  try {
    source = execFileSync('git', ['status', '--porcelain'], {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trimEnd();
  } catch {
    return '';
  }
  if (!generatedNextEnvironmentChanged(workspace)) return source;
  return source
    .split(/\r?\n/)
    .filter((line) => line && line.slice(3) !== nextEnvironmentPath)
    .join('\n');
}

export function restoreGeneratedNextEnvironment(workspace) {
  if (!generatedNextEnvironmentChanged(workspace)) return false;
  const committedSource = committedNextEnvironment(workspace);
  if (!committedSource) return false;
  writeFileSync(resolve(workspace, nextEnvironmentPath), committedSource);
  return true;
}
