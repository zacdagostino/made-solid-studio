import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  applyLocalDevelopmentHandoff,
  localDevelopmentHandoffVersion,
} from '../../worker/local-development-handoff.mjs';

test('creates a versioned local refinement ledger and private learning bundle', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-local-handoff-'));
  try {
    await writeFile(
      join(directory, 'package.json'),
      `${JSON.stringify({ name: 'generated-site', private: true, scripts: {}, dependencies: { next: '16.2.12' } })}\n`,
    );
    await applyLocalDevelopmentHandoff(directory, {
      studioBuildId: 'builder-run-1',
      buildManifestId: 'manifest-1',
      agentPackageId: 'package-1',
      agentPackageVersion: 9,
      baselineCommit: 'baseline-commit',
    });

    const origin = JSON.parse(
      await readFile(join(directory, '.made-solid', 'origin.json'), 'utf8'),
    );
    const packageDocument = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    assert.equal(origin.schemaVersion, localDevelopmentHandoffVersion);
    assert.equal(origin.schemaVersion, 7);
    assert.equal(origin.studioBuildId, 'builder-run-1');
    assert.equal(packageDocument.scripts.dev, 'next dev');
    assert.equal(
      packageDocument.scripts['made-solid:log'].includes('refinement-log.mjs add'),
      true,
    );
    assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /strict_invariant/);

    const devcontainer = JSON.parse(
      await readFile(join(directory, '.devcontainer', 'devcontainer.json'), 'utf8'),
    );
    const tasks = JSON.parse(await readFile(join(directory, '.vscode', 'tasks.json'), 'utf8'));
    const setupScript = await readFile(join(directory, '.devcontainer', 'setup.sh'), 'utf8');
    const siteScript = await readFile(join(directory, '.devcontainer', 'start-site.sh'), 'utf8');
    const codexScript = await readFile(join(directory, '.devcontainer', 'start-codex.sh'), 'utf8');
    const portScript = await readFile(join(directory, '.devcontainer', 'publish-port.sh'), 'utf8');
    const workspaceScript = await readFile(
      join(directory, '.devcontainer', 'start-workspace.sh'),
      'utf8',
    );
    const launchWorkspaceScript = await readFile(
      join(directory, '.devcontainer', 'launch-workspace.sh'),
      'utf8',
    );
    const openWorkspaceScript = await readFile(
      join(directory, '.devcontainer', 'open-workspace.sh'),
      'utf8',
    );
    const developmentGuide = await readFile(join(directory, 'LOCAL_DEVELOPMENT.md'), 'utf8');
    assert.deepEqual(devcontainer.customizations.vscode.extensions, ['openai.chatgpt']);
    assert.equal(devcontainer.portsAttributes['3000'].onAutoForward, 'openBrowser');
    assert.equal(devcontainer.postCreateCommand, undefined);
    assert.equal(devcontainer.postStartCommand, 'bash .devcontainer/launch-workspace.sh');
    assert.deepEqual(
      tasks.tasks.map((task) => [task.label, task.runOptions.runOn]),
      [['Made Solid: Open persistent workspace', 'folderOpen']],
    );
    assert.equal(tasks.tasks[0].runOptions.instancePolicy, undefined);
    assert.match(setupScript, /chatgpt\.com\/codex\/install\.sh/);
    assert.match(setupScript, /flock 9/);
    assert.match(setupScript, /cd "\$project_directory"/);
    assert.match(setupScript, /setup-v6\.ready/);
    assert.match(setupScript, /Another startup is preparing this Codespace/);
    assert.match(setupScript, /npm ci --no-audit --no-fund/);
    assert.match(setupScript, /--connect-timeout 15 --max-time 180/);
    assert.match(setupScript, /CODEX_NON_INTERACTIVE=1 sh/);
    assert.match(siteScript, /bash "\$project_directory\/\.devcontainer\/setup\.sh"/);
    assert.match(siteScript, /exec npm run dev/);
    assert.match(codexScript, /bash "\$project_directory\/\.devcontainer\/setup\.sh"/);
    assert.match(codexScript, /CODEX_ACCESS_TOKEN/);
    assert.match(codexScript, /OPENAI_API_KEY/);
    assert.match(codexScript, /login --with-access-token/);
    assert.doesNotMatch(codexScript, /login --with-api-key/);
    assert.match(codexScript, /forced_login_method="chatgpt"/);
    assert.match(codexScript, /unset OPENAI_API_KEY SITEFORGE_CODEX_API_KEY CODEX_API_KEY/);
    assert.match(workspaceScript, /flock 8/);
    assert.match(workspaceScript, /tmux has-session/);
    assert.match(workspaceScript, /tmux new-session/);
    assert.match(workspaceScript, /-n codex/);
    assert.match(workspaceScript, /tmux new-window/);
    assert.match(workspaceScript, /run_window website start-site\.sh/);
    assert.match(workspaceScript, /run_window ports publish-port\.sh/);
    assert.match(portScript, /codespace ports visibility 3000:public/);
    assert.doesNotMatch(portScript, /4500/);
    assert.match(workspaceScript, /remain-on-exit on/);
    assert.match(workspaceScript, /#\{pane_dead\}/);
    assert.match(workspaceScript, /tmux respawn-pane/);
    assert.match(launchWorkspaceScript, /nohup bash/);
    assert.match(launchWorkspaceScript, /startup\.log/);
    assert.match(launchWorkspaceScript, /startup\.pid/);
    assert.match(openWorkspaceScript, /launch-workspace\.sh/);
    assert.match(openWorkspaceScript, /tail -n \+1 -F/);
    assert.match(openWorkspaceScript, /workspace failed/);
    assert.match(openWorkspaceScript, /exec tmux attach-session -d -t "\$session_name"/);
    assert.doesNotMatch(codexScript, /sk-[A-Za-z0-9]/);
    assert.match(developmentGuide, /Never save a\s+token in this repository/);
    assert.equal((await stat(join(directory, '.devcontainer', 'setup.sh'))).mode & 0o111, 0o111);
    assert.equal(
      (await stat(join(directory, '.devcontainer', 'start-codex.sh'))).mode & 0o111,
      0o111,
    );
    assert.equal(
      (await stat(join(directory, '.devcontainer', 'start-workspace.sh'))).mode & 0o111,
      0o111,
    );
    assert.equal(
      (await stat(join(directory, '.devcontainer', 'publish-port.sh'))).mode & 0o111,
      0o111,
    );
    assert.equal(
      (await stat(join(directory, '.devcontainer', 'launch-workspace.sh'))).mode & 0o111,
      0o111,
    );
    assert.equal(
      (await stat(join(directory, '.devcontainer', 'open-workspace.sh'))).mode & 0o111,
      0o111,
    );

    const refinementScript = join(directory, '.made-solid', 'scripts', 'refinement-log.mjs');
    execFileSync(
      process.execPath,
      [
        refinementScript,
        'add',
        '--id',
        'MS-001',
        '--classification',
        'strict_invariant',
        '--title',
        'Resolve every internal route',
        '--problem',
        'A generated navigation link pointed to a missing route.',
        '--fix',
        'The shared route map now uses the generated output paths.',
        '--pattern',
        'route-resolution',
        '--viewports',
        '375x812,1440x900',
        '--verification',
        'All internal links resolve',
      ],
      { cwd: directory },
    );
    execFileSync(process.execPath, [refinementScript, 'bundle'], { cwd: directory });

    const ledger = await readFile(join(directory, '.made-solid', 'refinement-log.jsonl'), 'utf8');
    const bundle = JSON.parse(
      await readFile(join(directory, '.made-solid', 'learning-bundle.json'), 'utf8'),
    );
    assert.match(ledger, /"classification":"strict_invariant"/);
    assert.equal(bundle.origin.studioBuildId, 'builder-run-1');
    assert.equal(bundle.entries[0].id, 'MS-001');
    assert.equal(bundle.distillationStatus, 'awaiting_review');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('keeps the Studio Codespace startup script inside the repository', async () => {
  const startupScript = await readFile(
    new URL('../../scripts/codespace-work', import.meta.url),
    'utf8',
  );
  const tasks = JSON.parse(
    await readFile(new URL('../../.vscode/tasks.json', import.meta.url), 'utf8'),
  );
  assert.match(tasks.tasks[0].command, /scripts\/codespace-work/);
  assert.doesNotMatch(tasks.tasks[0].command, /HOME|\.local\/bin/);
  assert.match(startupScript, /chatgpt\.com\/codex\/install\.sh/);
  assert.match(startupScript, /code --install-extension openai\.chatgpt/);
  assert.match(startupScript, /npm run start:local/);
  assert.match(startupScript, /codex resume --last/);
});
