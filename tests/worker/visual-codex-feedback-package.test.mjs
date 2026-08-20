import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260817140000_public_codespace_ports_test_package.sql',
  import.meta.url,
);
const concurrentActivityMigrationUrl = new URL(
  '../../supabase/migrations/20260817160000_concurrent_codex_activity_test_package.sql',
  import.meta.url,
);
const markdownChatMigrationUrl = new URL(
  '../../supabase/migrations/20260817170000_markdown_codex_chat_test_package.sql',
  import.meta.url,
);
const compactComposerMigrationUrl = new URL(
  '../../supabase/migrations/20260817180000_compact_codex_composer_test_package.sql',
  import.meta.url,
);
const cameraRollMigrationUrl = new URL(
  '../../supabase/migrations/20260817200000_camera_roll_photo_upload_test_package.sql',
  import.meta.url,
);
const recentPromptTitlesMigrationUrl = new URL(
  '../../supabase/migrations/20260817210000_recent_prompt_chat_titles_test_package.sql',
  import.meta.url,
);
const interruptedChatRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260817220000_codespace_interrupted_chat_recovery_test_package.sql',
  import.meta.url,
);
const dualRepositoryWorkspaceMigrationUrl = new URL(
  '../../supabase/migrations/20260817230000_dual_repository_codex_workspace_test_package.sql',
  import.meta.url,
);
const experimentalWorkspaceCapabilityMigrationUrl = new URL(
  '../../supabase/migrations/20260817231000_codex_experimental_workspace_capability_test_package.sql',
  import.meta.url,
);
const unmaterializedChatCleanupMigrationUrl = new URL(
  '../../supabase/migrations/20260817232000_reliable_unmaterialized_chat_cleanup_test_package.sql',
  import.meta.url,
);
const durableTurnRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260817234000_durable_codex_turn_recovery_test_package.sql',
  import.meta.url,
);
const resumableAgentTeamMigrationUrl = new URL(
  '../../supabase/migrations/20260819100000_resumable_agent_team_test_package.sql',
  import.meta.url,
);
const spaciousCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260819110000_spacious_codex_chat_test_package.sql',
  import.meta.url,
);
const turnScopedAgentTeamsMigrationUrl = new URL(
  '../../supabase/migrations/20260819120000_turn_scoped_agent_teams_test_package.sql',
  import.meta.url,
);
const uninterruptedCodexRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260819130000_uninterrupted_codex_recovery_test_package.sql',
  import.meta.url,
);
const subscriptionSafeCodexRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260819200000_subscription_safe_codex_runtime_test_package.sql',
  import.meta.url,
);
const permanentRailwayRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260819210000_permanent_railway_runtime_test_package.sql',
  import.meta.url,
);
const agentTeamChatMigrationUrl = new URL(
  '../../supabase/migrations/20260818090000_agent_team_chat_test_package.sql',
  import.meta.url,
);
const repositoryUrl = new URL('../../src/lib/repository.ts', import.meta.url);
const appUrl = new URL('../../src/App.tsx', import.meta.url);
const componentUrl = new URL('../../src/components/CodexFeedbackPanel.tsx', import.meta.url);
const mobileCaptureUrl = new URL('../../src/lib/mobile-screen-capture.ts', import.meta.url);
const mainUrl = new URL('../../src/main.tsx', import.meta.url);
const localServiceUrl = new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url);
const launcherUrl = new URL('../../scripts/codespace-work', import.meta.url);
const appServerLauncherUrl = new URL('../../scripts/start-codex-app-server', import.meta.url);
const websiteLauncherUrl = new URL('../../scripts/start-made-solid-website', import.meta.url);
const portCleanupUrl = new URL('../../scripts/clean-codespace-ports', import.meta.url);
const portPublisherUrl = new URL('../../scripts/publish-codespace-ports', import.meta.url);
const workspaceSettingsUrl = new URL('../../.vscode/settings.json', import.meta.url);
const workspacePanelUrl = new URL(
  '../../worker/builder-template/src/components/foundation/workspace-codex-panel.tsx',
  import.meta.url,
);
const foundationLayoutUrl = new URL(
  '../../worker/builder-template/src/app/layout.tsx',
  import.meta.url,
);
const workspaceBridgeUrl = new URL(
  '../../worker/builder-template/public/made-solid-codex-bridge.js',
  import.meta.url,
);
const extensionManifestUrl = new URL(
  '../../browser-extension/made-solid-capture/manifest.json',
  import.meta.url,
);
const extensionBackgroundUrl = new URL(
  '../../browser-extension/made-solid-capture/background.js',
  import.meta.url,
);

test('registers public Codespace ports once above concurrent Codex chats', async () => {
  const [migration, repository] = await Promise.all([
    readFile(migrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Public Codespace ports test package:/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 13\.7,/);
  assert.match(repository, /basePackageId: localConcurrentCodexChatsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localPublicCodespacePortsPackage,') <
      packageLedger.indexOf('localConcurrentCodexChatsPackage,'),
  );
});

test('records the current permanent Codex Testing behaviour revision', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /id: 'visual-codex-feedback'/);
  const behaviour = app.slice(app.indexOf("id: 'visual-codex-feedback'"));
  const revision = behaviour.match(/revision: `v\$\{selectedAgentPackage\.version\}\.(\d+)`/);
  assert.ok(revision);
  assert.ok(Number(revision[1]) >= 31);
  assert.match(app, /Workspace Agent now runs behind the signed-in Studio/);
  assert.match(app, /resumes after the browser closes/);
});

test('registers the permanent Railway runtime as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(permanentRailwayRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Permanent Railway Studio runtime test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.9,/);
  assert.match(repository, /basePackageId: localSubscriptionSafeCodexRuntimePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localPermanentRailwayRuntimePackage,') <
      packageLedger.indexOf('localSubscriptionSafeCodexRuntimePackage,'),
  );
});

test('registers the subscription-safe Codex runtime as the newest immutable package', async () => {
  const [migration, repository, app, launcher] = await Promise.all([
    readFile(subscriptionSafeCodexRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(appServerLauncherUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Subscription-safe Codex runtime test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback", "framework-quality-gates"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.8,/);
  assert.match(repository, /basePackageId: localUninterruptedCodexRecoveryPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localSubscriptionSafeCodexRuntimePackage,') <
      packageLedger.indexOf('localUninterruptedCodexRecoveryPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.89`/);
  assert.match(launcher, /forced_login_method="chatgpt"/);
  assert.match(launcher, /unset OPENAI_API_KEY SITEFORGE_CODEX_API_KEY CODEX_API_KEY/);
});

test('registers uninterrupted Codex recovery as the newest immutable local and cloud package', async () => {
  const [migration, repository, bridge, localService] = await Promise.all([
    readFile(uninterruptedCodexRecoveryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Uninterrupted Codex recovery test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.7,/);
  assert.match(repository, /basePackageId: localTurnScopedAgentTeamsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localUninterruptedCodexRecoveryPackage,') <
      packageLedger.indexOf('localTurnScopedAgentTeamsPackage,'),
  );
  assert.match(bridge, /record\.status === 'recovering'/);
  assert.match(bridge, /interruptedAgentsForSupervisor/);
  assert.match(bridge, /turn\/steer/);
  assert.match(bridge, /followup_task collaboration tool/);
  assert.doesNotMatch(bridge, /Number\(record\.recoveryCount \|\| 0\) >= 1/);
  assert.match(localService, /void codexFeedbackBridge\.maintain\(\)/);
  assert.match(localService, /await codexFeedbackBridge\.maintain\(\)/);
});

test('registers turn-scoped Agent teams as the newest immutable local and cloud package', async () => {
  const [migration, repository, bridge, component] = await Promise.all([
    readFile(turnScopedAgentTeamsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Turn-scoped Agent teams test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.6,/);
  assert.match(repository, /basePackageId: localSpaciousCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localTurnScopedAgentTeamsPackage,') <
      packageLedger.indexOf('localSpaciousCodexChatPackage,'),
  );
  assert.match(bridge, /collabAgentTurnIds/);
  assert.match(component, /agentTeamsAfterMessage/);
  assert.match(component, /supervisorTurnId/);
});

test('registers spacious Codex chat above its prior immutable package', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(spaciousCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Spacious Codex chat test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.5,/);
  assert.match(repository, /basePackageId: localResumableAgentTeamPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localSpaciousCodexChatPackage,') <
      packageLedger.indexOf('localResumableAgentTeamPackage,'),
  );
  assert.match(component, /label="Chat settings"/);
  assert.match(component, /codex-composer-settings/);
});

test('registers resumable Agent team above its prior immutable package', async () => {
  const [migration, repository, bridge, component] = await Promise.all([
    readFile(resumableAgentTeamMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Resumable Agent team test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15\.4,/);
  assert.match(repository, /basePackageId: localClientspaceAdminEmailReviewPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localResumableAgentTeamPackage,') <
      packageLedger.indexOf('localClientspaceAdminEmailReviewPackage,'),
  );
  assert.match(bridge, /resumedAgents/);
  assert.match(bridge, /agentResumeFailures/);
  assert.match(component, /Resuming interrupted agents/);
  assert.match(component, /Resume working/);
});

test('registers Agent team chat above durable turn recovery', async () => {
  const [migration, repository, bridge, component] = await Promise.all([
    readFile(agentTeamChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Agent team chat test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 15,/);
  assert.match(repository, /basePackageId: localDurableCodexTurnRecoveryPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localAgentTeamChatPackage,') <
      packageLedger.indexOf('localDurableCodexTurnRecoveryPackage,'),
  );
  assert.match(bridge, /ancestorThreadId: thread\.id/);
  assert.match(bridge, /teamDelegationInstruction/);
  assert.match(component, /codex-agent-team/);
  assert.match(component, /Agent team/);
});

test('registers durable Codex turn recovery above New-chat cleanup', async () => {
  const [migration, repository, bridge, launcher] = await Promise.all([
    readFile(durableTurnRecoveryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(launcherUrl, 'utf8'),
  ]);
  assert.match(migration, /Durable Codex turn recovery test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 14\.9,/);
  assert.match(repository, /basePackageId: localReliableUnmaterializedChatCleanupPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDurableCodexTurnRecoveryPackage,') <
      packageLedger.indexOf('localReliableUnmaterializedChatCleanupPackage,'),
  );
  assert.match(bridge, /status: 'running'/);
  assert.match(bridge, /recoveryCount/);
  assert.match(launcher, /start-codex-app-server/);
});

test('registers unmaterialized New-chat cleanup above capability negotiation', async () => {
  const [migration, repository, bridge] = await Promise.all([
    readFile(unmaterializedChatCleanupMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Reliable unmaterialized-chat cleanup test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.8,/);
  assert.match(repository, /basePackageId: localCodexExperimentalWorkspaceCapabilityPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localReliableUnmaterializedChatCleanupPackage,') <
      packageLedger.indexOf('localCodexExperimentalWorkspaceCapabilityPackage,'),
  );
  assert.match(bridge, /not materialized\|includeTurns/);
  assert.match(bridge, /this\.startedThreads\.get\(threadId\)/);
});

test('registers app-server capability negotiation above the dual-repository package', async () => {
  const [migration, repository, bridge] = await Promise.all([
    readFile(experimentalWorkspaceCapabilityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Codex experimental workspace capability test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.7,/);
  assert.match(repository, /basePackageId: localDualRepositoryCodexWorkspacePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCodexExperimentalWorkspaceCapabilityPackage,') <
      packageLedger.indexOf('localDualRepositoryCodexWorkspacePackage,'),
  );
  assert.match(bridge, /capabilities:\s*\{\s*experimentalApi: true/);
});

test('registers the dual-repository Codex workspace above interrupted-chat recovery', async () => {
  const [migration, repository, bridge] = await Promise.all([
    readFile(dualRepositoryWorkspaceMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Dual-repository Codex workspace test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.6,/);
  assert.match(repository, /basePackageId: localCodespaceInterruptedChatRecoveryPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDualRepositoryCodexWorkspacePackage,') <
      packageLedger.indexOf('localCodespaceInterruptedChatRecoveryPackage,'),
  );
  assert.match(bridge, /runtimeWorkspaceRoots: this\.runtimeWorkspaceRoots/);
  assert.match(bridge, /resolve\(this\.cwd, '\.\.', 'made-solid-website'\)/);
  assert.match(bridge, /capabilities:\s*\{\s*experimentalApi: true/);
});

test('registers Codespace interrupted-chat recovery above the retained local package ledger', async () => {
  const [migration, repository, component, bridge] = await Promise.all([
    readFile(interruptedChatRecoveryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Codespace interrupted-chat recovery test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.5,/);
  assert.match(repository, /basePackageId: localRecentPromptChatTitlesPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCodespaceInterruptedChatRecoveryPackage,') <
      packageLedger.indexOf('localRecentPromptChatTitlesPackage,'),
  );
  assert.match(component, /Work was interrupted/);
  assert.match(component, /continue-interrupted-thread/);
  assert.match(bridge, /continueInterruptedThread/);
  assert.match(bridge, /lastTurn\?\.status === 'interrupted'/);
});

test('registers camera-roll photo uploads above the retained local package ledger', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(cameraRollMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /Camera-roll photo upload test package:/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.3,/);
  assert.match(repository, /basePackageId: localSubscriptionBuilderPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCameraRollPhotoUploadPackage,') <
      packageLedger.indexOf('localSubscriptionBuilderPackage,'),
  );
  assert.match(component, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(component, /Upload photo from camera roll/);
});

test('registers recent-prompt chat titles above the retained local package ledger', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(recentPromptTitlesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /Recent-prompt chat titles test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 14\.4,/);
  assert.match(repository, /basePackageId: localCameraRollPhotoUploadPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRecentPromptChatTitlesPackage,') <
      packageLedger.indexOf('localCameraRollPhotoUploadPackage,'),
  );
  assert.match(component, /latestPrompt \|\| thread\?\.name/);
  assert.match(component, /Captured from:/);
});

test('registers concurrent per-chat activity above the retained package ledger', async () => {
  const [migration, repository, component, bridge] = await Promise.all([
    readFile(concurrentActivityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Concurrent Codex activity test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 13\.9,/);
  assert.match(repository, /basePackageId: localCodexTranscriptPositionPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localConcurrentCodexActivityPackage,') <
      packageLedger.indexOf('localCodexTranscriptPositionPackage,'),
  );
  assert.match(component, /codex-conversation-picker__menu/);
  assert.match(component, /Last used/);
  assert.match(bridge, /this\.flushRequested = true/);
  assert.match(bridge, /this\.scheduleFlush\(1_000\)/);
});

test('retains safe Markdown chat in the immutable package ledger', async () => {
  const [migration, repository, component, markdown] = await Promise.all([
    readFile(markdownChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../src/components/MarkdownContent.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Markdown Codex chat test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 14,/);
  assert.match(repository, /basePackageId: localConcurrentCodexActivityPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localMarkdownCodexChatPackage,') <
      packageLedger.indexOf('localConcurrentCodexActivityPackage,'),
  );
  assert.match(component, /<MarkdownContent>/);
  assert.doesNotMatch(markdown, /dangerouslySetInnerHTML/);
  assert.match(markdown, /safeHref/);
  assert.match(markdown, /tabIndex=\{0\}/);
});

test('registers the compact deduplicated composer above Markdown chat', async () => {
  const [migration, repository, component, bridge] = await Promise.all([
    readFile(compactComposerMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Compact Codex composer test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 14\.1,/);
  assert.match(repository, /basePackageId: localMarkdownCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCompactCodexComposerPackage,') <
      packageLedger.indexOf('localMarkdownCodexChatPackage,'),
  );
  assert.match(component, /pendingChatAccepted/);
  assert.match(component, /isComposerExpanded/);
  assert.match(bridge, /message\.feedbackId = record\.id/);
});

test('uses shared controls, a compact model selector, and live model discovery for Codex chat', async () => {
  const [app, component, mobileCapture, main, service] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(mobileCaptureUrl, 'utf8'),
    readFile(mainUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(component, /Button, ButtonGroup, IconButton/);
  assert.doesNotMatch(component, /<button[\s>]/);
  assert.match(component, /getDisplayMedia/);
  assert.match(component, /<select/);
  assert.match(component, /Send message/);
  assert.match(component, /Conversation/);
  assert.match(component, /Codex chat log/);
  assert.match(component, /codex-composer-surface/);
  assert.match(component, /codex-composer-footer/);
  assert.match(component, /codex-working-status/);
  assert.match(component, /elapsedTime/);
  assert.match(component, /hasUnseenCompletion/);
  assert.match(component, /pendingChatMessage/);
  assert.match(component, /made-solid-codex-preferences-v1/);
  assert.match(component, /made-solid-codex-draft-v1/);
  assert.match(component, /effortByModel/);
  assert.match(component, /codex-queued-message/);
  assert.match(component, /interrupt-queued/);
  assert.match(component, /workingStartedAt/);
  assert.doesNotMatch(component, /Interrupt and send message/);
  assert.match(component, /expanded: phase === 'selecting'/);
  assert.match(main, /<App\s*\/>[\s\S]*<CodexFeedbackPanel embedded=\{isCodexPanelRoute\}\s*\/>/);
  assert.match(main, /document\.documentElement\.dataset\.codexPanel = 'embedded'/);
  assert.match(app, /studioPreviewUrl\(previewUrl\)/);
  assert.match(app, /studioPreviewUrl\(event\.previewUrl\)/);
  assert.match(component, /codex-status/);
  assert.match(component, /codex-feedback/);
  assert.match(component, /captureVisiblePage/);
  assert.match(component, /Mobile screen capture ready/);
  assert.match(component, /Use whole screenshot/);
  assert.match(component, /codex-chat-message__attachment/);
  assert.match(component, /delete-empty-thread/);
  assert.match(mobileCapture, /inlineVisibleImages/);
  assert.match(mobileCapture, /imagePlaceholder: transparentPixel/);
  assert.doesNotMatch(
    mobileCapture,
    /iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk\+M\/w/,
  );
  assert.match(service, /CodexFeedbackBridge/);
  assert.match(service, /__made-solid\/page-screenshot/);
  assert.match(service, /localCaptureTarget/);
  assert.match(service, /chromium\.launch/);
  assert.match(service, /sec-fetch-site/);
  assert.match(service, /22 \* 1024 \* 1024/);
  assert.match(service, /configurePreviewServer: configureWorkspaceServer/);
  assert.match(service, /configureServer: configureWorkspaceServer/);
});

test('ships one locally scoped Manifest V3 capture helper for Chrome and Brave', async () => {
  const [manifestSource, background] = await Promise.all([
    readFile(extensionManifestUrl, 'utf8'),
    readFile(extensionBackgroundUrl, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.match(JSON.stringify(manifest.content_scripts), /app\.github\.dev/);
  assert.match(background, /captureVisibleTab/);
  assert.match(background, /-5173\.app\.github\.dev/);
});

test('starts the local app-server before the full-access remote tmux client', async () => {
  const [launcher, appServerLauncher] = await Promise.all([
    readFile(launcherUrl, 'utf8'),
    readFile(appServerLauncherUrl, 'utf8'),
  ]);
  const server = launcher.indexOf('start-codex-app-server');
  const client = launcher.indexOf('codex resume --last --remote ws://127.0.0.1:4500');
  assert.ok(server >= 0);
  assert.ok(client > server);
  assert.match(appServerLauncher, /app-server/);
  assert.match(appServerLauncher, /forced_login_method="chatgpt"/);
  assert.match(appServerLauncher, /--enable prevent_idle_sleep/);
  assert.match(appServerLauncher, /--disable shell_snapshot/);
  assert.match(launcher, /--model gpt-5\.6-sol/);
  assert.match(launcher, /model_reasoning_effort=medium/);
  assert.match(launcher, /--sandbox danger-full-access --ask-for-approval never/);
  assert.match(launcher, /--add-dir \\"\$made_solid_website_directory\\"/);
  assert.match(launcher, /--retry-connrefused/);
  assert.match(launcher, /http:\/\/127\.0\.0\.1:5173/);
});

test('starts and opens the Made Solid website on stable public labelled ports', async () => {
  const [launcher, websiteLauncher, portCleanup, portPublisher, settingsSource, service] =
    await Promise.all([
      readFile(launcherUrl, 'utf8'),
      readFile(websiteLauncherUrl, 'utf8'),
      readFile(portCleanupUrl, 'utf8'),
      readFile(portPublisherUrl, 'utf8'),
      readFile(workspaceSettingsUrl, 'utf8'),
      readFile(localServiceUrl, 'utf8'),
    ]);
  const settings = JSON.parse(settingsSource);
  assert.equal(settings['remote.restoreForwardedPorts'], false);
  assert.deepEqual(settings['remote.portsAttributes']['3001'], {
    label: 'Made Solid website',
    onAutoForward: 'openBrowser',
  });
  assert.equal(settings['remote.portsAttributes']['4500'].onAutoForward, 'ignore');
  assert.equal(settings['remote.portsAttributes']['4173-4176'].onAutoForward, 'ignore');
  assert.match(launcher, /-n website/);
  assert.match(launcher, /http:\/\/127\.0\.0\.1:3001/);
  assert.match(launcher, /made-solid-website-browser-opened/);
  assert.match(launcher, /scripts\/clean-codespace-ports/);
  assert.match(launcher, /scripts\/publish-codespace-ports/);
  assert.match(launcher, /-n ports/);
  assert.match(websiteLauncher, /MADE_SOLID_STUDIO_ORIGIN/);
  assert.match(websiteLauncher, /MADE_SOLID_WEBSITE_PORT:-3001/);
  assert.match(portCleanup, /managePortsAccessToken/);
  assert.match(portCleanup, /3002 3010 3100 4173 4174 4175 4176 4500/);
  assert.doesNotMatch(portCleanup, /for port in[^\n]*(?:3000|3001|5173|8788)(?:\s|;)/);
  assert.match(portPublisher, /3000 3001 5173 6006 8788/);
  assert.match(portPublisher, /codespace ports visibility "\$\{port\}:public"/);
  assert.doesNotMatch(portPublisher, /4500/);
  assert.match(service, /'3000', '3001', '5173', '8788'/);
});

test('mounts the shared Codex panel directly in raw development websites only', async () => {
  const [panel, bridge, layout, service] = await Promise.all([
    readFile(workspacePanelUrl, 'utf8'),
    readFile(workspaceBridgeUrl, 'utf8'),
    readFile(foundationLayoutUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(layout, /<WorkspaceCodexPanel\s*\/>/);
  assert.match(layout, /made-solid-codex-bridge\.js/);
  assert.match(panel, /MADE_SOLID_STUDIO_ORIGIN/);
  assert.match(panel, /data-made-solid-codex-panel/);
  assert.match(panel, /allow="display-capture"/);
  assert.match(bridge, /event\.origin !== trustedOrigin/);
  assert.match(bridge, /event\.source !== frame\.contentWindow/);
  assert.match(bridge, /expanded \? '100vw'/);
  assert.match(service, /MADE_SOLID_STUDIO_ORIGIN=/);
  assert.match(service, /studioOrigin\(request\)/);
});
