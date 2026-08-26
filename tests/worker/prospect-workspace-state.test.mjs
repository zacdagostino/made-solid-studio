import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  generatedNextEnvironmentChanged,
  meaningfulGitStatus,
  restoreGeneratedNextEnvironment,
} from '../../scripts/prospect-workspace-state.mjs';

test('excludes only Next generated development types from prospect edit state', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'made-solid-next-environment-'));
  const productionSource = '/// <reference types="next" />\nimport "./.next/types/routes.d.ts";\n';
  const developmentSource = productionSource.replace('/.next/types/', '/.next/dev/types/');
  const git = (...arguments_) =>
    execFileSync('git', arguments_, {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Made Solid test');
    git('config', 'user.email', 'studio-test@madesolid.com.au');
    await writeFile(join(workspace, 'next-env.d.ts'), productionSource);
    await writeFile(join(workspace, 'website.txt'), 'Original website.\n');
    git('add', '-A');
    git('commit', '-m', 'Create prospect website');

    await writeFile(join(workspace, 'next-env.d.ts'), developmentSource);
    assert.equal(generatedNextEnvironmentChanged(workspace), true);
    assert.equal(meaningfulGitStatus(workspace), '');

    await writeFile(join(workspace, 'website.txt'), 'Real website edit.\n');
    assert.match(meaningfulGitStatus(workspace), /website\.txt/);
    assert.doesNotMatch(meaningfulGitStatus(workspace), /next-env/);
    assert.equal(restoreGeneratedNextEnvironment(workspace), true);
    assert.equal(await readFile(join(workspace, 'next-env.d.ts'), 'utf8'), productionSource);
    assert.match(meaningfulGitStatus(workspace), /website\.txt/);

    await writeFile(join(workspace, 'next-env.d.ts'), `${productionSource}// Manual edit.\n`);
    assert.equal(generatedNextEnvironmentChanged(workspace), false);
    assert.match(meaningfulGitStatus(workspace), /next-env\.d\.ts/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
