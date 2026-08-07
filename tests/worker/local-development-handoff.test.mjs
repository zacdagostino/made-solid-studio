import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
      `${JSON.stringify({ name: 'generated-site', private: true, scripts: { dev: 'next dev' } })}\n`,
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
    assert.equal(origin.studioBuildId, 'builder-run-1');
    assert.equal(
      packageDocument.scripts['made-solid:log'].includes('refinement-log.mjs add'),
      true,
    );
    assert.match(await readFile(join(directory, 'AGENTS.md'), 'utf8'), /strict_invariant/);

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
