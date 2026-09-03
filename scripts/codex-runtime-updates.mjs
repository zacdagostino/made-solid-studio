import { execFile as executeFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { CodexPushNotifications } from './codex-push-notifications.mjs';

const execFile = promisify(executeFile);
const stableVersionPattern = /^\d+\.\d+\.\d+$/;
const defaultCheckIntervalMs = 24 * 60 * 60 * 1_000;
const defaultMaintenanceIntervalMs = 10_000;
const changelogUrl = 'https://learn.chatgpt.com/docs/changelog';
const npmLatestUrl = 'https://registry.npmjs.org/@openai%2Fcodex/latest';

function updateRoot(environment = process.env) {
  const runtimeDataDirectory = environment.SITEFORGE_RUNTIME_DATA_DIR?.trim();
  return (
    environment.SITEFORGE_CODEX_UPDATE_DIR?.trim() ||
    (runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'runtime/codex-update')
      : resolve('.made-solid', 'codex-update'))
  );
}

export function updatePaths(environment = process.env) {
  const root = updateRoot(environment);
  const runtimeDataDirectory = environment.SITEFORGE_RUNTIME_DATA_DIR?.trim();
  return {
    currentLink: resolve(root, 'current'),
    checkLock: resolve(root, 'check.lock'),
    feedbackRoot: resolve(
      environment.SITEFORGE_CODEX_FEEDBACK_DIR?.trim() ||
        (runtimeDataDirectory
          ? resolve(runtimeDataDirectory, 'codex-feedback')
          : resolve('.made-solid', 'codex-feedback')),
    ),
    notifications: resolve(
      runtimeDataDirectory
        ? resolve(runtimeDataDirectory, 'codex-push-notifications.json')
        : resolve('.made-solid', 'codex-push-notifications.json'),
    ),
    restartRequest: resolve(root, 'restart-requested'),
    root,
    state: resolve(root, 'state.json'),
    versions: resolve(root, 'versions'),
  };
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}

export function compareCodexVersions(first, second) {
  if (!stableVersionPattern.test(first) || !stableVersionPattern.test(second)) {
    throw new Error('Codex update versions must be stable semantic versions.');
  }
  const left = first.split('.').map(Number);
  const right = second.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function releaseFromSegment(segment) {
  const version = /Codex CLI\s*<span[^>]*>\s*([0-9]+\.[0-9]+\.[0-9]+)\s*<\/span>/i.exec(
    segment,
  )?.[1];
  if (!version) return undefined;
  const date = /<time[^>]*>([0-9]{4}-[0-9]{2}-[0-9]{2})<\/time>/i.exec(segment)?.[1];
  const sections = [];
  const headingPattern = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|<p><strong>Full Changelog|$)/gi;
  for (const match of segment.matchAll(headingPattern)) {
    const title = decodeHtml(match[1]);
    if (!title || title.toLowerCase() === 'changelog') continue;
    const items = [...match[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => decodeHtml(item[1]))
      .filter(Boolean)
      .slice(0, 8);
    if (items.length) sections.push({ title, items });
  }
  return { date: date || undefined, sections, version };
}

export function parseCodexChangelog(source) {
  const starts = [
    ...source.matchAll(/<li\s+id="github-release-[^"]+"[^>]*data-product="codex"[^>]*>/gi),
  ].map((match) => match.index);
  const releases = [];
  for (let index = 0; index < starts.length; index += 1) {
    const release = releaseFromSegment(
      source.slice(starts[index], starts[index + 1] ?? source.length),
    );
    if (release) releases.push(release);
  }
  return releases;
}

async function executableVersion(executable) {
  const { stdout } = await execFile(executable, ['--version'], { timeout: 30_000 });
  const version = /(?:^|\s)([0-9]+\.[0-9]+\.[0-9]+)(?:\s|$)/.exec(stdout)?.[1];
  if (!version) throw new Error('The Codex executable did not report a stable version.');
  return version;
}

function bundledExecutable(environment = process.env) {
  return environment.SITEFORGE_BUNDLED_CODEX_BIN?.trim() || 'codex';
}

async function readState(environment = process.env) {
  const paths = updatePaths(environment);
  try {
    const state = JSON.parse(await readFile(paths.state, 'utf8'));
    if (
      stableVersionPattern.test(state.currentVersion) &&
      typeof state.currentExecutable === 'string'
    ) {
      return state;
    }
  } catch {
    // First startup creates state from the image-bundled executable.
  }
  const currentExecutable = bundledExecutable(environment);
  const currentVersion = await executableVersion(currentExecutable);
  const state = {
    checkedAt: null,
    currentExecutable,
    currentVersion,
    releases: [],
    status: 'current',
    updateAvailable: false,
  };
  await atomicWriteJson(paths.state, state);
  return state;
}

async function writeState(environment, patch) {
  const paths = updatePaths(environment);
  const state = { ...(await readState(environment)), ...patch };
  await atomicWriteJson(paths.state, state);
  return state;
}

export async function publicCodexUpdateStatus(environment = process.env) {
  const state = await readState(environment);
  return {
    checkedAt: state.checkedAt || null,
    currentVersion: state.currentVersion,
    failureSummary: state.failureSummary || null,
    latestVersion: state.latestVersion || state.currentVersion,
    releases: Array.isArray(state.releases) ? state.releases : [],
    status: state.status,
    updateAvailable: Boolean(state.updateAvailable),
    updatedAt: state.updatedAt || null,
  };
}

async function latestRelease(fetchImplementation = globalThis.fetch) {
  const response = await fetchImplementation(npmLatestUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'Made-Solid-Studio-Codex-Updater' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`The Codex release registry returned ${response.status}.`);
  const metadata = await response.json();
  if (metadata.name !== '@openai/codex' || !stableVersionPattern.test(metadata.version)) {
    throw new Error('The Codex release registry did not return a stable official version.');
  }
  return metadata.version;
}

async function releaseNotes(fromVersion, throughVersion, fetchImplementation = globalThis.fetch) {
  try {
    const response = await fetchImplementation(changelogUrl, {
      headers: { Accept: 'text/html', 'User-Agent': 'Made-Solid-Studio-Codex-Updater' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return [];
    return parseCodexChangelog(await response.text())
      .filter(
        (release) =>
          compareCodexVersions(release.version, fromVersion) > 0 &&
          compareCodexVersions(release.version, throughVersion) <= 0,
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

async function installRelease(version, environment = process.env, runner = execFile) {
  const paths = updatePaths(environment);
  const destination = resolve(paths.versions, version);
  const executable = resolve(destination, 'node_modules/.bin/codex');
  try {
    if ((await executableVersion(executable)) === version) return executable;
  } catch {
    // A missing or incomplete destination is replaced below.
  }
  await mkdir(paths.versions, { recursive: true, mode: 0o700 });
  const temporary = resolve(paths.versions, `.install-${version}-${randomUUID()}`);
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  try {
    await runner(
      process.env.npm_execpath || 'npm',
      [
        'install',
        '--prefix',
        temporary,
        '--no-audit',
        '--no-fund',
        '--omit=dev',
        '--registry',
        'https://registry.npmjs.org',
        `@openai/codex@${version}`,
      ],
      { maxBuffer: 8 * 1024 * 1024, timeout: 5 * 60_000 },
    );
    const stagedExecutable = resolve(temporary, 'node_modules/.bin/codex');
    if ((await executableVersion(stagedExecutable)) !== version) {
      throw new Error('The staged Codex executable did not match the requested release.');
    }
    await rm(destination, { force: true, recursive: true });
    await rename(temporary, destination);
    return executable;
  } catch (error) {
    await rm(temporary, { force: true, recursive: true });
    throw error;
  }
}

async function acquireUpdateCheck(environment = process.env) {
  const paths = updatePaths(environment);
  await mkdir(paths.root, { recursive: true, mode: 0o700 });
  try {
    await mkdir(paths.checkLock, { mode: 0o700 });
    return true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  const lockAge = await stat(paths.checkLock)
    .then((value) => Date.now() - value.mtimeMs)
    .catch(() => 0);
  if (lockAge <= 10 * 60_000) return false;
  await rm(paths.checkLock, { force: true, recursive: true });
  try {
    await mkdir(paths.checkLock, { mode: 0o700 });
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
}

export async function checkForCodexUpdate({
  environment = process.env,
  fetchImplementation = globalThis.fetch,
  installer = installRelease,
} = {}) {
  const paths = updatePaths(environment);
  if (!(await acquireUpdateCheck(environment))) return readState(environment);
  try {
    const before = await readState(environment);
    await writeState(environment, { checkedAt: new Date().toISOString(), status: 'checking' });
    const latestVersion = await latestRelease(fetchImplementation);
    const releases = await releaseNotes(before.currentVersion, latestVersion, fetchImplementation);
    if (compareCodexVersions(latestVersion, before.currentVersion) <= 0) {
      return writeState(environment, {
        failureSummary: null,
        latestVersion,
        releases: releases.length ? releases : before.releases,
        status: 'current',
        updateAvailable: false,
      });
    }
    if (before.failedVersion === latestVersion) {
      return writeState(environment, {
        latestVersion,
        releases,
        status: 'rollback',
        updateAvailable: true,
      });
    }
    await writeState(environment, {
      failureSummary: null,
      latestVersion,
      releases,
      status: 'downloading',
      updateAvailable: true,
    });
    const pendingExecutable = await installer(latestVersion, environment);
    return writeState(environment, {
      pendingExecutable,
      pendingVersion: latestVersion,
      status: 'waiting_for_idle',
      updateAvailable: true,
    });
  } catch (error) {
    return writeState(environment, {
      failureSummary: error instanceof Error ? error.message : 'Codex update check failed.',
      status: 'failed',
    });
  } finally {
    await rm(paths.checkLock, { force: true, recursive: true });
  }
}

async function activeFeedbackRecord(paths) {
  try {
    const files = (await readdir(paths.feedbackRoot)).filter((file) => file.endsWith('.json'));
    for (const file of files) {
      try {
        const record = JSON.parse(await readFile(resolve(paths.feedbackRoot, file), 'utf8'));
        if (['queued', 'running', 'recovering'].includes(record.status)) return true;
      } catch {
        // Ignore incomplete private records while their atomic replacement settles.
      }
    }
  } catch {
    // No feedback directory means there is no tracked Studio chat work.
  }
  return false;
}

async function activeCodexProcess() {
  try {
    const processIds = (await readdir('/proc')).filter((entry) => /^\d+$/.test(entry));
    for (const processId of processIds) {
      try {
        const command = await readFile(`/proc/${processId}/cmdline`, 'utf8');
        const [executable, ...argumentsList] = command.split('\0');
        if (
          /(?:^|\/)codex(?:-[^/]*)?$/.test(executable) &&
          !argumentsList.includes('app-server') &&
          !argumentsList.includes('--version')
        ) {
          return true;
        }
      } catch {
        // Processes can finish during inspection.
      }
    }
  } catch {
    // Non-Linux development environments rely on tracked Studio records.
  }
  return false;
}

export async function codexWorkIsIdle(environment = process.env) {
  const paths = updatePaths(environment);
  const processBusy =
    environment.SITEFORGE_CODEX_PROCESS_SCAN === '0' ? false : await activeCodexProcess();
  return !(await activeFeedbackRecord(paths)) && !processBusy;
}

export async function requestIdleActivation(environment = process.env) {
  const paths = updatePaths(environment);
  const state = await readState(environment);
  if (!state.pendingVersion || !state.pendingExecutable || state.status !== 'waiting_for_idle') {
    return false;
  }
  await mkdir(paths.root, { recursive: true, mode: 0o700 });
  await writeFile(paths.restartRequest, `${state.pendingVersion}\n`, {
    flag: 'wx',
    mode: 0o600,
  }).catch((error) => {
    if (error?.code !== 'EEXIST') throw error;
  });
  if (!(await codexWorkIsIdle(environment))) {
    await rm(paths.restartRequest, { force: true });
    return false;
  }
  await writeState(environment, { status: 'restart_pending' });
  return true;
}

async function switchCurrentLink(target, environment = process.env) {
  const paths = updatePaths(environment);
  await mkdir(paths.root, { recursive: true, mode: 0o700 });
  const temporaryLink = `${paths.currentLink}.${process.pid}.tmp`;
  await rm(temporaryLink, { force: true });
  await symlink(target, temporaryLink);
  await rename(temporaryLink, paths.currentLink);
}

export async function activatePendingUpdate(environment = process.env) {
  const paths = updatePaths(environment);
  const state = await readState(environment);
  if (!state.pendingVersion || !state.pendingExecutable) return '';
  const versionRoot = resolve(state.pendingExecutable, '../../..');
  await switchCurrentLink(versionRoot, environment);
  await rm(paths.restartRequest, { force: true });
  await writeState(environment, {
    currentExecutable: state.pendingExecutable,
    currentVersion: state.pendingVersion,
    previousExecutable: state.currentExecutable,
    previousVersion: state.currentVersion,
    status: 'restarting',
  });
  return state.pendingVersion;
}

export async function completePendingUpdate(environment = process.env) {
  const state = await readState(environment);
  if (state.status !== 'restarting' || !state.pendingVersion) return false;
  const updatedAt = new Date().toISOString();
  const completed = await writeState(environment, {
    failureSummary: null,
    pendingExecutable: null,
    pendingVersion: null,
    status: 'updated',
    updateAvailable: false,
    updatedAt,
  });
  const notifications = new CodexPushNotifications({
    storagePath: updatePaths(environment).notifications,
    subject: environment.SITEFORGE_PUBLIC_ORIGIN,
  });
  await notifications.notifyCodexUpdate({
    releases: completed.releases,
    version: completed.currentVersion,
  });
  const paths = updatePaths(environment);
  const retainedVersions = new Set([completed.currentVersion, completed.previousVersion]);
  try {
    const versions = await readdir(paths.versions);
    await Promise.all(
      versions
        .filter((version) => stableVersionPattern.test(version) && !retainedVersions.has(version))
        .map((version) => rm(resolve(paths.versions, version), { force: true, recursive: true })),
    );
  } catch {
    // Old staged versions are harmless and can be pruned after a later successful update.
  }
  return true;
}

export async function rollbackPendingUpdate(
  failureSummary = 'The updated Codex App Server stopped during its startup check.',
  environment = process.env,
) {
  const paths = updatePaths(environment);
  const state = await readState(environment);
  if (!state.previousVersion || !state.previousExecutable) return false;
  if (state.previousExecutable === bundledExecutable(environment)) {
    await rm(paths.currentLink, { force: true });
  } else {
    const previousRoot = resolve(state.previousExecutable, '../../..');
    await switchCurrentLink(previousRoot, environment);
  }
  await rm(paths.restartRequest, { force: true });
  await writeState(environment, {
    currentExecutable: state.previousExecutable,
    currentVersion: state.previousVersion,
    failedAt: new Date().toISOString(),
    failedVersion: state.currentVersion,
    failureSummary,
    pendingExecutable: null,
    pendingVersion: null,
    status: 'rollback',
    updateAvailable: true,
  });
  return true;
}

export async function resolveCodexExecutable(environment = process.env) {
  const state = await readState(environment);
  return state.currentExecutable || bundledExecutable(environment);
}

export function codexAppServerHealthy({ host = '127.0.0.1', port = 4500, timeout = 5_000 } = {}) {
  return new Promise((resolveHealth) => {
    const socket = createConnection({ host, port });
    let settled = false;
    let response = '';
    const finish = (healthy) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveHealth(healthy);
    };
    socket.setTimeout(timeout, () => finish(false));
    socket.once('error', () => finish(false));
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\r\n\r\n')) finish(/^HTTP\/1\.1 101\b/.test(response));
    });
    socket.once('connect', () => {
      const websocketKey = randomBytes(16).toString('base64');
      socket.write(
        `GET / HTTP/1.1\r\nHost: ${host}:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${websocketKey}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
  });
}

export async function runUpdateDaemon({ environment = process.env } = {}) {
  const checkInterval =
    Number(environment.SITEFORGE_CODEX_UPDATE_CHECK_INTERVAL_MS) || defaultCheckIntervalMs;
  const maintenanceInterval =
    Number(environment.SITEFORGE_CODEX_UPDATE_MAINTENANCE_INTERVAL_MS) ||
    defaultMaintenanceIntervalMs;
  while (true) {
    const state = await readState(environment);
    const checkedAt = Date.parse(state.checkedAt || '');
    if (
      !state.pendingVersion &&
      (!Number.isFinite(checkedAt) || Date.now() - checkedAt >= checkInterval)
    ) {
      await checkForCodexUpdate({ environment });
    }
    await requestIdleActivation(environment);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, maintenanceInterval));
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'daemon') return runUpdateDaemon();
  if (command === 'check') return void (await checkForCodexUpdate());
  if (command === 'request-activation') return void (await requestIdleActivation());
  if (command === 'activate') return console.log(await activatePendingUpdate());
  if (command === 'complete') return void (await completePendingUpdate());
  if (command === 'rollback') return void (await rollbackPendingUpdate(process.argv[3]));
  if (command === 'resolve-bin') return console.log(await resolveCodexExecutable());
  if (command === 'health') {
    if (!(await codexAppServerHealthy())) process.exitCode = 1;
    return;
  }
  if (command === 'status') return console.log(JSON.stringify(await publicCodexUpdateStatus()));
  throw new Error('Choose a Codex updater command.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
