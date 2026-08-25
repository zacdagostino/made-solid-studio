import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  activeWorkspaceDirectory,
  restoreActiveWorkspacePreview,
} from '../../scripts/restore-active-workspace-preview.mjs';

test('restarts only the persisted approved active workspace on its recorded port', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-active-workspace-'));
  const prospectRoot = join(fixtureRoot, 'prospects');
  const destination = join(prospectRoot, 'lecegroup');
  const activePreviewPath = join(fixtureRoot, 'active-preview.json');
  await Promise.all([
    mkdir(join(destination, '.git'), { recursive: true }),
    mkdir(join(destination, 'node_modules'), { recursive: true }),
  ]);
  await writeFile(
    join(destination, 'package.json'),
    JSON.stringify({ scripts: { dev: 'next dev' } }),
  );
  await writeFile(activePreviewPath, JSON.stringify({ directory: 'lecegroup', port: 3002 }));
  const environment = {
    SITEFORGE_ACTIVE_PREVIEW_PATH: activePreviewPath,
    SITEFORGE_PROSPECT_WORKSPACES_DIR: prospectRoot,
  };
  const commands = [];
  let readyChecks = 0;
  try {
    assert.equal(activeWorkspaceDirectory('lecegroup', environment), destination);
    const result = await restoreActiveWorkspacePreview({
      environment,
      ready: async () => {
        readyChecks += 1;
        return readyChecks > 1;
      },
      runCommand: async (command, arguments_) => commands.push([command, arguments_]),
      wait: async () => undefined,
    });
    assert.deepEqual(result, {
      directory: 'lecegroup',
      port: 3002,
      sessionName: 'made-solid-lecegroup',
      status: 'restarted',
    });
    assert.deepEqual(commands, [
      ['tmux', ['kill-session', '-t', 'made-solid-lecegroup']],
      [
        'tmux',
        [
          'new-session',
          '-d',
          '-s',
          'made-solid-lecegroup',
          '-c',
          destination,
          'env',
          'NODE_ENV=development',
          'npm',
          'run',
          'dev',
          '--',
          '--hostname',
          '0.0.0.0',
          '--port',
          '3002',
        ],
      ],
      ['tmux', ['set-option', '-t', 'made-solid-lecegroup', 'remain-on-exit', 'on']],
    ]);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('does not launch a missing, dependency-free, or traversal workspace record', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-rejected-workspace-'));
  const activePreviewPath = join(fixtureRoot, 'active-preview.json');
  const commands = [];
  try {
    await writeFile(activePreviewPath, JSON.stringify({ directory: '../lecegroup', port: 3002 }));
    const invalid = await restoreActiveWorkspacePreview({
      environment: {
        SITEFORGE_ACTIVE_PREVIEW_PATH: activePreviewPath,
        SITEFORGE_PROSPECT_WORKSPACES_DIR: fixtureRoot,
      },
      ready: async () => false,
      runCommand: async (...command) => commands.push(command),
    });
    assert.equal(invalid.status, 'invalid');

    await writeFile(activePreviewPath, JSON.stringify({ directory: 'lecegroup', port: 3000 }));
    const reserved = await restoreActiveWorkspacePreview({
      environment: {
        SITEFORGE_ACTIVE_PREVIEW_PATH: activePreviewPath,
        SITEFORGE_PROSPECT_WORKSPACES_DIR: fixtureRoot,
      },
      ready: async () => true,
      runCommand: async (...command) => commands.push(command),
    });
    assert.equal(reserved.status, 'invalid');

    await writeFile(activePreviewPath, JSON.stringify({ directory: 'lecegroup', port: 3002 }));
    const rejected = await restoreActiveWorkspacePreview({
      environment: {
        SITEFORGE_ACTIVE_PREVIEW_PATH: activePreviewPath,
        SITEFORGE_PROSPECT_WORKSPACES_DIR: fixtureRoot,
      },
      ready: async () => true,
      runCommand: async (...command) => commands.push(command),
    });
    assert.equal(rejected.status, 'rejected');
    assert.deepEqual(commands, []);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('never restores a committed historical preview as the working website after restart', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-committed-preview-'));
  const activePreviewPath = join(fixtureRoot, 'active-preview.json');
  const commands = [];
  try {
    await writeFile(
      activePreviewPath,
      JSON.stringify({
        version: 2,
        previews: [
          {
            directory: 'lecegroup',
            port: 3002,
            revision: '1234567890abcdef1234567890abcdef12345678',
          },
        ],
      }),
    );
    const result = await restoreActiveWorkspacePreview({
      environment: {
        SITEFORGE_ACTIVE_PREVIEW_PATH: activePreviewPath,
        SITEFORGE_PROSPECT_WORKSPACES_DIR: fixtureRoot,
      },
      ready: async () => true,
      runCommand: async (...command) => commands.push(command),
    });
    assert.deepEqual(result, { status: 'none' });
    assert.deepEqual(commands, []);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
