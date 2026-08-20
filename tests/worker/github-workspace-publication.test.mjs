import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerUrl = new URL('../../worker/github-workspace-worker.mjs', import.meta.url);
const supervisorUrl = new URL('../../worker/supervisor.mjs', import.meta.url);
const migrationUrl = new URL(
  '../../supabase/migrations/20260807160000_github_workspace_publication.sql',
  import.meta.url,
);
const livenessMigrationUrl = new URL(
  '../../supabase/migrations/20260807162000_github_workspace_worker_liveness.sql',
  import.meta.url,
);
const sourceGuardMigrationUrl = new URL(
  '../../supabase/migrations/20260807164000_github_workspace_source_guard.sql',
  import.meta.url,
);
const cloudRepositoryUrl = new URL('../../src/lib/cloud-repository.ts', import.meta.url);

test('publishes complete local workspaces through a protected private-only GitHub worker', async () => {
  const source = await readFile(workerUrl, 'utf8');
  assert.match(source, /requiredEnvironment\('GITHUB_TOKEN'\)/);
  assert.match(source, /private: true/);
  assert.match(source, /auto_init: false/);
  assert.match(source, /applyLocalDevelopmentHandoff/);
  assert.match(source, /state === 'final_source'/);
  assert.match(source, /previewPath\.startsWith\('assets\/'\)/);
  assert.match(source, /git', \['push', '--set-upstream', 'origin', 'main'\]/);
  assert.match(source, /GIT_CONFIG_VALUE_0: `Authorization: Basic/);
  assert.doesNotMatch(source, /https:\/\/\$\{githubToken\}@github\.com/);
  assert.doesNotMatch(source, /private: false/);
});

test('refreshes the repository startup handoff after loading an archived workspace', async () => {
  const source = await readFile(workerUrl, 'utf8');
  const archiveLoad = source.indexOf(
    'await loadWorkspaceArchive(job, temporaryDirectory, localArchive)',
  );
  const archiveRefresh = source.indexOf(
    'await applyLocalDevelopmentHandoff(projectDirectory, localDevelopmentOrigin(run))',
    archiveLoad,
  );
  assert.notEqual(archiveLoad, -1);
  assert.ok(archiveRefresh > archiveLoad);
  assert.match(source, /function localDevelopmentOrigin\(run\)/);
});

test('queues completed full-site builds without weakening client quality gates', async () => {
  const source = await readFile(migrationUrl, 'utf8');
  assert.match(source, /target_run\.build_mode <> 'full_site'/);
  assert.match(source, /target_run\.status not in \('ready', 'review_required'\)/);
  assert.match(
    source,
    /visibility text not null default 'private' check \(visibility = 'private'\)/,
  );
  assert.match(source, /kind = 'source_bundle'/);
  assert.match(source, /metadata->>'state'.*= 'final_source'/);
  assert.match(source, /auth\.role\(\) <> 'service_role'/);
  assert.match(
    source,
    /grant execute on function public\.claim_next_github_workspace_publication\(text\) to service_role/,
  );
  assert.doesNotMatch(source, /quality_summary->>'status'/);
});

test('starts the GitHub worker only when protected credentials are configured', async () => {
  const [supervisor, worker] = await Promise.all([
    readFile(supervisorUrl, 'utf8'),
    readFile(workerUrl, 'utf8'),
  ]);
  assert.match(
    supervisor,
    /if \(process\.env\.SITEFORGE_GITHUB_TOKEN \|\| process\.env\.GITHUB_TOKEN\)/,
  );
  assert.match(supervisor, /\['github-workspace', 'github-workspace-worker\.mjs'\]/);
  assert.match(
    worker,
    /process\.env\.SITEFORGE_GITHUB_TOKEN\?\.trim\(\) \|\| requiredEnvironment\('GITHUB_TOKEN'\)/,
  );
  assert.match(worker, /Codespaces repository token cannot create/);
});

test('rejects unserviceable queues and reconciles an expired GitHub worker lease', async () => {
  const source = await readFile(livenessMigrationUrl, 'utf8');
  assert.match(source, /heartbeat_github_workspace_worker/);
  assert.match(source, /worker_kind = 'github_workspace'/);
  assert.match(source, /GitHub publishing is not connected.*no repository was queued/);
  assert.match(source, /github_workspace_publications_guard_queue_liveness/);
  assert.match(source, /reconcile_github_workspace_publications/);
  assert.match(source, /status = 'running' and publications\.lease_expires_at < now\(\)/);
  assert.match(source, /github_workspace_worker_available/);
});

test('refuses to label a completed build as exportable without safe source evidence', async () => {
  const source = await readFile(sourceGuardMigrationUrl, 'utf8');
  assert.match(source, /localDevelopmentHandoffVersion/);
  assert.match(source, /metadata->>'state'.*= 'final_source'/);
  assert.match(source, /no safe local-development source package/);
  assert.match(source, /no repository was queued/);
});

test('keeps core workspace loading available when the optional GitHub integration is offline', async () => {
  const source = await readFile(cloudRepositoryUrl, 'utf8');
  assert.match(source, /warnOptionalIntegrationError\('GitHub workspace reconciliation'/);
  assert.match(source, /'GitHub workspace publication history'/);
  assert.match(source, /'GitHub workspace worker availability'/);
  assert.match(source, /core workspace loading will continue/);
  assert.doesNotMatch(source, /throwIfError\(githubLifecycleError\)/);
});

test('loads build history without joining every source artifact into the startup query', async () => {
  const source = await readFile(cloudRepositoryUrl, 'utf8');
  assert.match(source, /\.select\('\*, agent_packages\(version\)'\)/);
  assert.match(source, /\.in\('kind', \['checkpoint', 'source_bundle'\]\)/);
  assert.match(
    source,
    /typeof metadata\.localDevelopmentHandoffVersion === 'number'/,
    'legacy source bundles must not suppress the final-source availability fallback',
  );
  assert.match(source, /finalSourceFallbackResults/);
  assert.doesNotMatch(
    source,
    /\.select\('\*, agent_packages\(version\), builder_artifacts\(kind, label, metadata\)'\)/,
  );
});
