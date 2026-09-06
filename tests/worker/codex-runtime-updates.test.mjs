import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import test from 'node:test';
import {
  activatePendingUpdate,
  checkForCodexUpdate,
  codexAppServerHealthy,
  compareCodexVersions,
  completePendingUpdate,
  parseCodexChangelog,
  parseCodexGitHubReleases,
  publicCodexUpdateStatus,
  requestIdleActivation,
  resolveCodexExecutable,
  rollbackPendingUpdate,
  updatePaths,
} from '../../scripts/codex-runtime-updates.mjs';

async function websocketFixture(response) {
  const server = createServer((socket) => {
    socket.once('data', () => socket.end(response));
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

const changelogFixture = `
<li id="github-release-2" data-product="codex" data-products="codex" data-codex-topics="codex-cli">
  <time>2026-09-01</time><h3>Codex CLI<span> 0.152.1</span></h3>
  <h2>Bug Fixes</h2><ul><li>Guardian review now honors Node REPL policies.</li></ul>
</li>
<li id="github-release-1" data-product="codex" data-products="codex" data-codex-topics="codex-cli">
  <time>2026-09-01</time><h3>Codex CLI<span> 0.152.0</span></h3>
  <h2>New Features</h2><ul><li>App-server clients can configure longer shell timeouts.</li></ul>
  <h2>Changelog</h2><ul><li>Internal entry that should not be shown.</li></ul>
</li>`;

const githubReleaseFixture = [
  {
    tag_name: 'rust-v0.152.1',
    published_at: '2026-09-01T23:53:12Z',
    body: `## Bug Fixes

- Corrected the [Fast tier](https://example.test/fast) description to say \`2x speed\`.
- Set \`tui.auto_recap\` to false while keeping manual recap available.

## Changelog

- Internal entry that should not be shown.`,
  },
  { tag_name: 'nightly', published_at: '2026-09-02T00:00:00Z', body: '## New Features' },
];

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), 'codex-updates-'));
  const bundled = resolve(directory, 'bundled-codex');
  await writeFile(bundled, '#!/usr/bin/env bash\necho "codex-cli 0.148.0"\n');
  await chmod(bundled, 0o755);
  return {
    directory,
    environment: {
      SITEFORGE_BUNDLED_CODEX_BIN: bundled,
      SITEFORGE_CODEX_PROCESS_SCAN: '0',
      SITEFORGE_CODEX_UPDATE_DIR: resolve(directory, 'updates'),
      SITEFORGE_RUNTIME_DATA_DIR: directory,
    },
  };
}

function releaseFetch(input) {
  const url = String(input);
  if (url.includes('registry.npmjs.org')) {
    return Promise.resolve(
      new Response(JSON.stringify({ name: '@openai/codex', version: '0.152.1' }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  }
  if (url.includes('api.github.com')) {
    return Promise.resolve(
      new Response(JSON.stringify(githubReleaseFixture), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  }
  return Promise.resolve(
    new Response(changelogFixture, { headers: { 'content-type': 'text/html' } }),
  );
}

test('compares stable Codex versions numerically', () => {
  assert.ok(compareCodexVersions('0.152.0', '0.151.9') > 0);
  assert.equal(compareCodexVersions('0.152.1', '0.152.1'), 0);
  assert.throws(() => compareCodexVersions('0.153.0-beta.1', '0.152.1'), /stable/);
});

test('extracts official Codex CLI release features and fixes', () => {
  assert.deepEqual(parseCodexChangelog(changelogFixture), [
    {
      date: '2026-09-01',
      sections: [{ title: 'Bug Fixes', items: ['Guardian review now honors Node REPL policies.'] }],
      version: '0.152.1',
    },
    {
      date: '2026-09-01',
      sections: [
        {
          title: 'New Features',
          items: ['App-server clients can configure longer shell timeouts.'],
        },
      ],
      version: '0.152.0',
    },
  ]);
});

test('extracts immediate official GitHub release notes without raw links or changelog noise', () => {
  assert.deepEqual(parseCodexGitHubReleases(githubReleaseFixture), [
    {
      date: '2026-09-01',
      sections: [
        {
          title: 'Bug Fixes',
          items: [
            'Corrected the Fast tier description to say 2x speed.',
            'Set tui.auto_recap to false while keeping manual recap available.',
          ],
        },
      ],
      version: '0.152.1',
    },
  ]);
});

test('requires a successful App Server WebSocket handshake before completing an update', async () => {
  const healthyServer = await websocketFixture(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n',
  );
  const unhealthyServer = await websocketFixture('HTTP/1.1 503 Service Unavailable\r\n\r\n');
  try {
    assert.equal(
      await codexAppServerHealthy({ port: healthyServer.address().port, timeout: 1_000 }),
      true,
    );
    assert.equal(
      await codexAppServerHealthy({ port: unhealthyServer.address().port, timeout: 1_000 }),
      false,
    );
  } finally {
    healthyServer.close();
    unhealthyServer.close();
  }
});

test('stages, activates, completes, and rolls back a verified update', async () => {
  const { directory, environment } = await fixture();
  try {
    const installer = async (version) => {
      const destination = resolve(updatePaths(environment).versions, version);
      const executable = resolve(destination, 'node_modules/.bin/codex');
      await mkdir(resolve(destination, 'node_modules/.bin'), { recursive: true });
      await writeFile(executable, `#!/usr/bin/env bash\necho "codex-cli ${version}"\n`);
      await chmod(executable, 0o755);
      return executable;
    };
    const staged = await checkForCodexUpdate({
      environment,
      fetchImplementation: releaseFetch,
      installer,
    });
    assert.equal(staged.status, 'waiting_for_idle');
    assert.equal(staged.pendingVersion, '0.152.1');
    assert.equal(staged.releases.length, 2);

    assert.equal(await requestIdleActivation(environment), true);
    assert.equal(await readFile(updatePaths(environment).restartRequest, 'utf8'), '0.152.1\n');
    assert.equal(await activatePendingUpdate(environment), '0.152.1');
    assert.match(await resolveCodexExecutable(environment), /0\.152\.1/);
    assert.equal((await publicCodexUpdateStatus(environment)).status, 'restarting');

    assert.equal(await completePendingUpdate(environment), true);
    const completed = await publicCodexUpdateStatus(environment);
    assert.equal(completed.status, 'updated');
    assert.equal(completed.currentVersion, '0.152.1');
    assert.ok(completed.updatedAt);

    const statePath = updatePaths(environment).state;
    const saved = JSON.parse(await readFile(statePath, 'utf8'));
    saved.status = 'restarting';
    saved.pendingVersion = '0.153.0';
    saved.pendingExecutable = saved.currentExecutable;
    saved.previousExecutable = environment.SITEFORGE_BUNDLED_CODEX_BIN;
    saved.previousVersion = '0.148.0';
    await writeFile(statePath, `${JSON.stringify(saved)}\n`);
    assert.equal(await rollbackPendingUpdate('Startup health check failed.', environment), true);
    const rolledBack = await publicCodexUpdateStatus(environment);
    assert.equal(rolledBack.status, 'rollback');
    assert.equal(rolledBack.currentVersion, '0.148.0');
    assert.equal(rolledBack.failureSummary, 'Startup health check failed.');
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('defers activation while a tracked Codex turn is queued', async () => {
  const { directory, environment } = await fixture();
  try {
    const paths = updatePaths(environment);
    await mkdir(paths.feedbackRoot, { recursive: true });
    await writeFile(resolve(paths.feedbackRoot, 'turn.json'), JSON.stringify({ status: 'queued' }));
    await checkForCodexUpdate({
      environment,
      fetchImplementation: releaseFetch,
      installer: async (version) => {
        const executable = resolve(paths.versions, version, 'node_modules/.bin/codex');
        await mkdir(resolve(executable, '..'), { recursive: true });
        await writeFile(executable, `#!/usr/bin/env bash\necho "codex-cli ${version}"\n`);
        await chmod(executable, 0o755);
        return executable;
      },
    });
    assert.equal(await requestIdleActivation(environment), false);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('serializes concurrent update checks across the persistent runtime', async () => {
  const { directory, environment } = await fixture();
  let registryCalls = 0;
  let releaseRegistry;
  const registryGate = new Promise((resolveGate) => {
    releaseRegistry = resolveGate;
  });
  const blockingFetch = async (input) => {
    if (String(input).includes('registry.npmjs.org')) {
      registryCalls += 1;
      await registryGate;
    }
    return releaseFetch(input);
  };
  try {
    await publicCodexUpdateStatus(environment);
    const firstCheck = checkForCodexUpdate({
      environment,
      fetchImplementation: blockingFetch,
      installer: async () => {
        throw new Error('The fixture does not install a newer release.');
      },
    });
    let activeStatus = await publicCodexUpdateStatus(environment);
    for (let attempt = 0; attempt < 100 && activeStatus.status !== 'checking'; attempt += 1) {
      await new Promise((resolveTick) => setTimeout(resolveTick, 5));
      activeStatus = await publicCodexUpdateStatus(environment);
    }
    assert.equal(activeStatus.status, 'checking');
    const overlappingCheck = await checkForCodexUpdate({
      environment,
      fetchImplementation: blockingFetch,
    });
    assert.equal(overlappingCheck.status, 'checking');
    assert.equal(registryCalls, 1);
    releaseRegistry();
    await firstCheck;
  } finally {
    releaseRegistry?.();
    await rm(directory, { force: true, recursive: true });
  }
});
