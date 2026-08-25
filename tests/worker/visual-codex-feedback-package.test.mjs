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
const fastCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260820174000_fast_codex_chat_test_package.sql',
  import.meta.url,
);
const animatedCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260820175000_animated_codex_chat_test_package.sql',
  import.meta.url,
);
const inlineMultiImageCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260820180000_inline_multi_image_codex_chat_test_package.sql',
  import.meta.url,
);
const contextualCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260820181000_contextual_codex_chat_test_package.sql',
  import.meta.url,
);
const privateWorkspacePreviewAccessMigrationUrl = new URL(
  '../../supabase/migrations/20260820182000_private_workspace_preview_access_test_package.sql',
  import.meta.url,
);
const messageMotionCodexChatMigrationUrl = new URL(
  '../../supabase/migrations/20260820183000_message_motion_codex_chat_test_package.sql',
  import.meta.url,
);
const agentTeamClarityMigrationUrl = new URL(
  '../../supabase/migrations/20260820184000_agent_team_clarity_test_package.sql',
  import.meta.url,
);
const stableWorkspacePreviewMigrationUrl = new URL(
  '../../supabase/migrations/20260820210000_stable_workspace_preview_test_package.sql',
  import.meta.url,
);
const restartableWorkspacePreviewMigrationUrl = new URL(
  '../../supabase/migrations/20260820211000_restartable_workspace_preview_test_package.sql',
  import.meta.url,
);
const renderableWorkspacePreviewMigrationUrl = new URL(
  '../../supabase/migrations/20260820212000_renderable_workspace_preview_test_package.sql',
  import.meta.url,
);
const authenticatedStudioControlsMigrationUrl = new URL(
  '../../supabase/migrations/20260820213000_authenticated_studio_controls_test_package.sql',
  import.meta.url,
);
const observableCodexActivityMigrationUrl = new URL(
  '../../supabase/migrations/20260821100000_observable_codex_activity_test_package.sql',
  import.meta.url,
);
const deviceVoiceReadAloudMigrationUrl = new URL(
  '../../supabase/migrations/20260821110000_device_voice_read_aloud_test_package.sql',
  import.meta.url,
);
const codexConversationLoadingMigrationUrl = new URL(
  '../../supabase/migrations/20260821120000_codex_conversation_loading_test_package.sql',
  import.meta.url,
);
const codexSubscriptionUsageMigrationUrl = new URL(
  '../../supabase/migrations/20260821130000_codex_subscription_usage_test_package.sql',
  import.meta.url,
);
const evidenceLinkedCodexActivityMigrationUrl = new URL(
  '../../supabase/migrations/20260821140000_evidence_linked_codex_activity_test_package.sql',
  import.meta.url,
);
const reliableFullReplyReadingMigrationUrl = new URL(
  '../../supabase/migrations/20260821150000_reliable_full_reply_reading_test_package.sql',
  import.meta.url,
);
const seamlessStudioHydrationMigrationUrl = new URL(
  '../../supabase/migrations/20260821160000_seamless_studio_hydration_test_package.sql',
  import.meta.url,
);
const deletableQueuedCodexMessagesMigrationUrl = new URL(
  '../../supabase/migrations/20260821170000_deletable_queued_codex_messages_test_package.sql',
  import.meta.url,
);
const selectableGoogleCodexVoicesMigrationUrl = new URL(
  '../../supabase/migrations/20260821180000_selectable_google_codex_voices_test_package.sql',
  import.meta.url,
);
const durableCodexChatSessionMigrationUrl = new URL(
  '../../supabase/migrations/20260821190000_durable_codex_chat_session_test_package.sql',
  import.meta.url,
);
const imageOnlyCodexMessageMigrationUrl = new URL(
  '../../supabase/migrations/20260821200000_image_only_codex_message_test_package.sql',
  import.meta.url,
);
const liveEditableStudioRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260821210000_live_editable_studio_runtime_test_package.sql',
  import.meta.url,
);
const globalGoogleVoiceCatalogueMigrationUrl = new URL(
  '../../supabase/migrations/20260821220000_global_google_voice_catalogue_test_package.sql',
  import.meta.url,
);
const authenticatedGoogleVoiceCatalogueMigrationUrl = new URL(
  '../../supabase/migrations/20260821221000_authenticated_google_voice_catalogue_test_package.sql',
  import.meta.url,
);
const resilientStudioSessionRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260821222000_resilient_studio_session_recovery_test_package.sql',
  import.meta.url,
);
const renderableRailwayStudioMigrationUrl = new URL(
  '../../supabase/migrations/20260822113000_renderable_railway_studio_test_package.sql',
  import.meta.url,
);
const studioOwnedWorkspaceShellMigrationUrl = new URL(
  '../../supabase/migrations/20260822114000_studio_owned_workspace_shell_test_package.sql',
  import.meta.url,
);
const clientScopedCodexChatsMigrationUrl = new URL(
  '../../supabase/migrations/20260822115000_client_scoped_codex_chats_test_package.sql',
  import.meta.url,
);
const workspaceHostedEditorShellMigrationUrl = new URL(
  '../../supabase/migrations/20260822120000_workspace_hosted_editor_shell_test_package.sql',
  import.meta.url,
);
const liveCodexLauncherRecoveryMigrationUrl = new URL(
  '../../supabase/migrations/20260823040000_live_codex_launcher_recovery_test_package.sql',
  import.meta.url,
);
const lockedWorkspaceDevDependenciesMigrationUrl = new URL(
  '../../supabase/migrations/20260823050000_locked_workspace_dev_dependencies_test_package.sql',
  import.meta.url,
);
const reliableWorkspaceDevelopmentSurfacesMigrationUrl = new URL(
  '../../supabase/migrations/20260823060000_reliable_workspace_development_surfaces_test_package.sql',
  import.meta.url,
);
const opaqueWorkspaceFrameCapabilityMigrationUrl = new URL(
  '../../supabase/migrations/20260823070000_opaque_workspace_frame_capability_test_package.sql',
  import.meta.url,
);
const nextCompatibleWorkspaceRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260823080000_next_compatible_workspace_runtime_test_package.sql',
  import.meta.url,
);
const executableNextWorkspaceRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260823090000_executable_next_workspace_runtime_test_package.sql',
  import.meta.url,
);
const ownerApiCreditsSwitchMigrationUrl = new URL(
  '../../supabase/migrations/20260823100000_owner_api_credits_switch_test_package.sql',
  import.meta.url,
);
const deployedStudioShellMigrationUrl = new URL(
  '../../supabase/migrations/20260823110000_deployed_studio_shell_test_package.sql',
  import.meta.url,
);
const canonicalWorkspaceEntryMigrationUrl = new URL(
  '../../supabase/migrations/20260824100000_canonical_workspace_entry_test_package.sql',
  import.meta.url,
);
const workspaceDevelopmentStudioMigrationUrl = new URL(
  '../../supabase/migrations/20260824110000_workspace_development_studio_test_package.sql',
  import.meta.url,
);
const restoredCodexVoiceExperienceMigrationUrl = new URL(
  '../../supabase/migrations/20260824120000_restored_codex_voice_experience_test_package.sql',
  import.meta.url,
);
const persistentCodexChatSurfacesMigrationUrl = new URL(
  '../../supabase/migrations/20260824130000_persistent_codex_chat_surfaces_test_package.sql',
  import.meta.url,
);
const selectedCodexExcerptActionsMigrationUrl = new URL(
  '../../supabase/migrations/20260825000000_selected_codex_excerpt_actions_test_package.sql',
  import.meta.url,
);
const codexPhoneNotificationsMigrationUrl = new URL(
  '../../supabase/migrations/20260825120000_codex_phone_notifications_test_package.sql',
  import.meta.url,
);
const branchableCodexConversationsMigrationUrl = new URL(
  '../../supabase/migrations/20260825130000_branchable_codex_conversations_test_package.sql',
  import.meta.url,
);
const liveWorkspaceCodexBranchingMigrationUrl = new URL(
  '../../supabase/migrations/20260825140000_live_workspace_codex_branching_test_package.sql',
  import.meta.url,
);
const liveWorkspacePhoneNotificationsMigrationUrl = new URL(
  '../../supabase/migrations/20260825150000_live_workspace_phone_notifications_test_package.sql',
  import.meta.url,
);
const naturalCodexReadingMigrationUrl = new URL(
  '../../supabase/migrations/20260825160000_natural_codex_reading_test_package.sql',
  import.meta.url,
);
const focusedCodexSettingsMigrationUrl = new URL(
  '../../supabase/migrations/20260825170000_focused_codex_settings_test_package.sql',
  import.meta.url,
);
const conciseCodexReadingMigrationUrl = new URL(
  '../../supabase/migrations/20260825180000_concise_codex_reading_test_package.sql',
  import.meta.url,
);
const developmentReleaseUrlsMigrationUrl = new URL(
  '../../supabase/migrations/20260825190000_development_release_urls_test_package.sql',
  import.meta.url,
);
const resilientLiveCodexBranchingMigrationUrl = new URL(
  '../../supabase/migrations/20260825200000_resilient_live_codex_branching_test_package.sql',
  import.meta.url,
);
const stoppableCodexTurnsMigrationUrl = new URL(
  '../../supabase/migrations/20260825210000_stoppable_codex_turns_test_package.sql',
  import.meta.url,
);
const clientUrlReleaseContractMigrationUrl = new URL(
  '../../supabase/migrations/20260825230000_client_url_release_contract_test_package.sql',
  import.meta.url,
);
const revocableReadyClientReviewsMigrationUrl = new URL(
  '../../supabase/migrations/20260825250000_revocable_ready_client_reviews_test_package.sql',
  import.meta.url,
);
const reliableCodexStopStateMigrationUrl = new URL(
  '../../supabase/migrations/20260825260000_reliable_codex_stop_state_test_package.sql',
  import.meta.url,
);
const dedicatedClientWebsiteEditorMigrationUrl = new URL(
  '../../supabase/migrations/20260825270000_dedicated_client_website_editor_test_package.sql',
  import.meta.url,
);
const resilientDevelopmentStudioRuntimeMigrationUrl = new URL(
  '../../supabase/migrations/20260825280000_resilient_development_studio_runtime_test_package.sql',
  import.meta.url,
);
const railwayWorkspaceWriteMigrationUrl = new URL(
  '../../supabase/migrations/20260820170000_railway_workspace_write_test_package.sql',
  import.meta.url,
);
const railwayPersistentCheckoutMigrationUrl = new URL(
  '../../supabase/migrations/20260820171500_railway_persistent_checkout_test_package.sql',
  import.meta.url,
);
const railwayContainerAccessMigrationUrl = new URL(
  '../../supabase/migrations/20260820173000_railway_container_access_test_package.sql',
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
const workspaceBranchServiceUrl = new URL(
  '../../scripts/workspace-codex-branch-vite-plugin.mjs',
  import.meta.url,
);
const appShellUrl = new URL('../../src/components/AppShell.tsx', import.meta.url);
const studioHotUpdateUrl = new URL('../../src/lib/studio-hot-update.ts', import.meta.url);
const launcherUrl = new URL('../../scripts/codespace-work', import.meta.url);
const appServerLauncherUrl = new URL('../../scripts/start-codex-app-server', import.meta.url);
const websiteLauncherUrl = new URL('../../scripts/start-made-solid-website', import.meta.url);
const portCleanupUrl = new URL('../../scripts/clean-codespace-ports', import.meta.url);
const portPublisherUrl = new URL('../../scripts/publish-codespace-ports', import.meta.url);
const workspaceSettingsUrl = new URL('../../.vscode/settings.json', import.meta.url);
const foundationLayoutUrl = new URL(
  '../../worker/builder-template/src/app/layout.tsx',
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
  assert.equal(Number(revision[1]), 91);
  assert.match(app, /build checks can no longer erase the live development module cache/);
  assert.match(app, /shows a safe reload screen instead of a white page/);
  assert.match(app, /shows chats for that client plus clearly labelled universal Studio chats/);
  assert.match(app, /gives only the authenticated Studio owner a disclosed, reversible switch/);
  assert.match(app, /saved Natural or Literal interpretation and three speeds/);
  assert.match(app, /opt-in chat-scoped auto-read/);
  assert.match(app, /progressive private Google audio/);
  assert.match(app, /persistent read-along dock/);
  assert.match(app, /dedicated Studio page/);
  assert.match(app, /launcher is present during startup checks/);
  assert.match(app, /temporary read-only quick question/);
  assert.match(app, /appending the quote to the draft/);
  assert.match(app, /per-phone Web Push opt-in/);
  assert.match(app, /primary Send control becomes a Stop Codex control/);
  assert.match(app, /without clearing the unsent draft/);
});

test('registers the restored Codex voice experience above immutable v20.2', async () => {
  const [migration, repository] = await Promise.all([
    readFile(restoredCodexVoiceExperienceMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /Restored Codex voice experience test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.3/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.2'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /Natural or Literal reading style/);
  assert.match(migration, /coalesce queued progress to its newest update/);
  assert.match(migration, /keep at most 24 private in-memory MP3 blobs/);
  assert.match(migration, /keyboard or pointer restart from a rendered word/);
  assert.match(repository, /version: 20\.3,/);
  assert.match(repository, /basePackageId: localWorkspaceDevelopmentStudioPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localRestoredCodexVoiceExperiencePackage,') <
      ledger.indexOf('localWorkspaceDevelopmentStudioPackage,'),
  );
});

test('registers the Workspace development Studio above immutable v20.1', async () => {
  const [migration, repository] = await Promise.all([
    readFile(workspaceDevelopmentStudioMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /Workspace development Studio test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.2/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.1'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /Serve production Studio only from immutable built release assets/);
  assert.match(migration, /Serve Workspace from \/data\/workspaces\/siteforge-os/);
  assert.match(migration, /never expose capability tokens in the clean Workspace URL/);
  assert.match(repository, /version: 20\.2,/);
  assert.match(repository, /basePackageId: localCanonicalWorkspaceEntryPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localWorkspaceDevelopmentStudioPackage,') <
      ledger.indexOf('localCanonicalWorkspaceEntryPackage,'),
  );
});

test('registers canonical Workspace entry above immutable v20.0', async () => {
  const [migration, repository, proxy, access, vitePlugin] = await Promise.all([
    readFile(canonicalWorkspaceEntryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/workspace-preview-proxy.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../src/WorkspacePreviewAccess.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Canonical Workspace entry test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.1/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.0'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 20\.1,/);
  assert.match(repository, /basePackageId: localDeployedStudioShellPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localCanonicalWorkspaceEntryPackage,') <
      ledger.indexOf('localDeployedStudioShellPackage,'),
  );
  assert.match(proxy, /Location: `\$\{configuration\.studioOrigin\}\/#\/prospects`/);
  assert.doesNotMatch(proxy, /requestCookie\(request, lastWorkspaceCookieName\)/);
  assert.match(access, /restoreLegacyWorkspacePreviewRoute/);
  assert.match(access, /#\/workspace-development-access\?path=/);
  assert.match(vitePlugin, /if \(!directoryPattern\.test\(requestedDirectory\)\)/);
  assert.doesNotMatch(vitePlugin, /requestedDirectory \|\| active\?\.directory/);
});

test('registers the deployed Studio shell above immutable v19.9', async () => {
  const [migration, repository, launcher] = await Promise.all([
    readFile(deployedStudioShellMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Deployed Studio shell test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.9'/,
  );
  assert.match(repository, /version: 20,/);
  assert.match(repository, /basePackageId: localOwnerApiCreditsSwitchPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localDeployedStudioShellPackage,') <
      ledger.indexOf('localOwnerApiCreditsSwitchPackage,'),
  );
  assert.match(launcher, /cd "\$application_directory"/);
  assert.match(launcher, /--config "\$application_directory\/vite\.config\.ts"/);
  assert.match(launcher, /SITEFORGE_STUDIO_WORKSPACE_DIR="\$workspace_root\/siteforge-os"/);
  assert.match(launcher, /MADE_SOLID_WEBSITE_DIRECTORY="\$workspace_root\/made-solid-website"/);
});

test('registers the owner API credits switch above immutable v19.8', async () => {
  const [migration, repository] = await Promise.all([
    readFile(ownerApiCreditsSwitchMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /Owner API credits switch test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.8'/,
  );
  assert.match(repository, /version: 19\.9,/);
  assert.match(repository, /basePackageId: localExecutableNextWorkspaceRuntimePackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localOwnerApiCreditsSwitchPackage,') <
      ledger.indexOf('localExecutableNextWorkspaceRuntimePackage,'),
  );
});

test('registers the executable Next Workspace runtime above immutable v19.7', async () => {
  const [migration, repository, previewHost] = await Promise.all([
    readFile(executableNextWorkspaceRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../preview-host/server.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Executable Next Workspace runtime test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.7'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 19\.8,/);
  assert.match(repository, /basePackageId: localNextCompatibleWorkspaceRuntimePackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localExecutableNextWorkspaceRuntimePackage,') <
      ledger.indexOf('localNextCompatibleWorkspaceRuntimePackage,'),
  );
  assert.match(previewHost, /CHUNK_BASE_PATH\|RUNTIME_PUBLIC_PATH/);
  assert.match(previewHost, /data-made-solid-opaque-runtime/);
});

test('registers the Next-compatible Workspace runtime above immutable v19.6', async () => {
  const [migration, repository, previewHost, launcher, restoreScript] = await Promise.all([
    readFile(nextCompatibleWorkspaceRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../preview-host/server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
    readFile(
      new URL('../../scripts/restore-active-workspace-preview.mjs', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(migration, /Next-compatible Workspace runtime test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.7/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.6'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 19\.7,/);
  assert.match(repository, /basePackageId: localOpaqueWorkspaceFrameCapabilityPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localNextCompatibleWorkspaceRuntimePackage,') <
      ledger.indexOf('localOpaqueWorkspaceFrameCapabilityPackage,'),
  );
  assert.match(previewHost, /delete headers\.origin/);
  assert.match(previewHost, /startsWith\('sec-fetch-'\)/);
  assert.match(launcher, /restore-active-workspace-preview\.mjs/);
  assert.match(restoreScript, /SITEFORGE_PROSPECT_WORKSPACES_DIR/);
  assert.match(restoreScript, /NODE_ENV=development/);
});

test('registers the opaque Workspace frame capability above immutable v19.5', async () => {
  const [migration, repository, proxy, previewHost] = await Promise.all([
    readFile(opaqueWorkspaceFrameCapabilityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/workspace-preview-proxy.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../preview-host/server.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Opaque Workspace frame capability test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.6/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.5'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 19\.6,/);
  assert.match(repository, /basePackageId: localReliableWorkspaceDevelopmentSurfacesPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localOpaqueWorkspaceFrameCapabilityPackage,') <
      ledger.indexOf('localReliableWorkspaceDevelopmentSurfacesPackage,'),
  );
  assert.doesNotMatch(proxy, /client-preview[^\n]+allow-same-origin/);
  assert.match(proxy, /workspaceFrameRoutePrefix/);
  assert.match(previewHost, /private, no-store/);
  assert.match(previewHost, /frame-ancestors/);
  assert.match(previewHost, /handleWorkspaceFrameUpgrade/);
});

test('registers reliable Workspace development surfaces above the retained package ledger', async () => {
  const [migration, repository, proxy, vitePlugin] = await Promise.all([
    readFile(reliableWorkspaceDevelopmentSurfacesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/workspace-preview-proxy.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/local-workspace-vite-plugin.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Reliable Workspace development surfaces test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.5/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.4'/,
  );
  assert.match(repository, /version: 19\.5,/);
  assert.match(repository, /basePackageId: localLockedWorkspaceDevDependenciesPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localReliableWorkspaceDevelopmentSurfacesPackage,') <
      ledger.indexOf('localLockedWorkspaceDevDependenciesPackage,'),
  );
  assert.match(proxy, /Codex scoped to this website/);
  assert.match(proxy, />Exit to Studio<\/a>/);
  assert.match(vitePlugin, /renderWorkspaceCodexDocument/);
  assert.match(vitePlugin, /transformIndexHtml/);
});

test('registers locked workspace development dependencies above the retained package ledger', async () => {
  const [migration, repository, workspaceLauncher, localService] = await Promise.all([
    readFile(lockedWorkspaceDevDependenciesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/open-prospect-workspace.mjs', import.meta.url), 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Locked workspace development dependencies test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.4/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.3'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 19\.4,/);
  assert.match(repository, /basePackageId: localLiveCodexLauncherRecoveryPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localLockedWorkspaceDevDependenciesPackage,') <
      packageLedger.indexOf('localLiveCodexLauncherRecoveryPackage,'),
  );
  assert.equal((workspaceLauncher.match(/'--include=dev'/g) ?? []).length, 1);
  assert.equal((localService.match(/'--include=dev'/g) ?? []).length, 2);
});

test('registers live Codex launcher recovery above the retained package ledger', async () => {
  const [migration, repository, launcher] = await Promise.all([
    readFile(liveCodexLauncherRecoveryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appServerLauncherUrl, 'utf8'),
  ]);
  assert.match(migration, /Live Codex launcher recovery test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.3/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.2'/,
  );
  assert.match(repository, /version: 19\.3,/);
  assert.match(repository, /basePackageId: localWorkspaceHostedEditorShellPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localLiveCodexLauncherRecoveryPackage,') <
      packageLedger.indexOf('localWorkspaceHostedEditorShellPackage,'),
  );
  assert.match(launcher, /sandbox_mode="danger-full-access"/);
  assert.match(launcher, /approval_policy="never"/);
  assert.doesNotMatch(launcher, /sandbox_permissions/);
});

test('registers the workspace-hosted editor shell once above the retained package ledger', async () => {
  const [migration, repository, proxy, preview] = await Promise.all([
    readFile(workspaceHostedEditorShellMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/workspace-preview-proxy.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../src/PreviewFrame.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Workspace-hosted editor shell test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.2/);
  assert.match(migration, /Frame only a dedicated Studio Codex document/);
  assert.doesNotMatch(migration, /Permit the workspace hostname as a Studio frame ancestor/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.1'/,
  );
  assert.match(repository, /version: 19\.2,/);
  assert.match(repository, /basePackageId: localClientScopedCodexChatsPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localWorkspaceHostedEditorShellPackage,') <
      ledger.indexOf('localClientScopedCodexChatsPackage,'),
  );
  assert.match(proxy, /Made Solid Workspace/);
  assert.match(proxy, /serveWorkspaceShell/);
  assert.match(preview, /window\.top\.location\.href/);
});

test('registers client-scoped Codex chats once above the retained package ledger', async () => {
  const [migration, repository, component, bridge] = await Promise.all([
    readFile(clientScopedCodexChatsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Client-scoped Codex chats test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.1/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v19\.0'/,
  );
  assert.match(repository, /version: 19\.1,/);
  assert.match(repository, /basePackageId: localStudioOwnedWorkspaceShellPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localClientScopedCodexChatsPackage,') <
      ledger.indexOf('localStudioOwnedWorkspaceShellPackage,'),
  );
  assert.match(component, /Editing only/);
  assert.match(component, /Universal Studio/);
  assert.match(bridge, /clientWorkspaceInstruction/);
  assert.match(bridge, /assertThreadScope/);
});

test('registers the Studio-owned workspace shell once above the retained package ledger', async () => {
  const [migration, repository] = await Promise.all([
    readFile(studioOwnedWorkspaceShellMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Studio-owned workspace shell test package:/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /made-solid-studio-builder-agent-v19\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.9'/,
  );
  assert.match(repository, /version: 19,/);
  assert.match(repository, /basePackageId: localRenderableRailwayStudioPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localStudioOwnedWorkspaceShellPackage,') <
      ledger.indexOf('localRenderableRailwayStudioPackage,'),
  );
});

test('retains the renderable Railway Studio as the immutable v18.9 base package', async () => {
  const [migration, repository, launcher] = await Promise.all([
    readFile(renderableRailwayStudioMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Renderable Railway Studio test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.8'/,
  );
  assert.match(repository, /version: 18\.9,/);
  assert.match(repository, /basePackageId: localResilientStudioSessionRecoveryPackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localRenderableRailwayStudioPackage,') <
      ledger.indexOf('localResilientStudioSessionRecoveryPackage,'),
  );
  assert.match(launcher, /vite\.js" preview/);
  assert.match(launcher, /--config "\$application_directory\/vite\.config\.ts"/);
  assert.match(launcher, /maintain_workspace_studio/);
  assert.match(launcher, /cd "\$studio_workspace_directory"/);
  assert.match(launcher, /--mode development/);
  assert.match(launcher, /--force/);
});

test('registers resilient Studio session recovery as the newest immutable package', async () => {
  const [migration, repository, runtime, proxy, previewHost] = await Promise.all([
    readFile(resilientStudioSessionRecoveryMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../src/lib/studio-runtime.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/workspace-preview-proxy.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../preview-host/server.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Resilient Studio session recovery test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.7'/,
  );
  assert.match(repository, /version: 18\.8,/);
  assert.match(repository, /basePackageId: localAuthenticatedGoogleVoiceCataloguePackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localResilientStudioSessionRecoveryPackage,') <
      ledger.indexOf('localAuthenticatedGoogleVoiceCataloguePackage,'),
  );
  assert.match(runtime, /response\.status !== 401/);
  assert.match(runtime, /refreshRuntimeAccessToken/);
  assert.match(previewHost, /upstreamTimeoutMs/);
  assert.match(proxy, /requestStudioReentry/);
});

test('registers authenticated Google voices as the newest immutable package', async () => {
  const [migration, repository, speech] = await Promise.all([
    readFile(authenticatedGoogleVoiceCatalogueMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/google-cloud-tts.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Authenticated Google voice catalogue test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.7/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.6'/,
  );
  assert.match(repository, /version: 18\.7,/);
  assert.match(repository, /basePackageId: localGlobalGoogleVoiceCataloguePackage\.id/);
  const ledger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    ledger.indexOf('localAuthenticatedGoogleVoiceCataloguePackage,') <
      ledger.indexOf('localGlobalGoogleVoiceCataloguePackage,'),
  );
  assert.match(speech, /urn:ietf:params:oauth:grant-type:jwt-bearer/);
  assert.doesNotMatch(speech, /urn:ietf:params:oauth2:grant-type:jwt-bearer/);
});

test('registers the global Google voice catalogue as the newest immutable package', async () => {
  const [migration, repository, component, speech] = await Promise.all([
    readFile(globalGoogleVoiceCatalogueMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/google-cloud-tts.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Global Google voice catalogue test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.6/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.5'/,
  );
  assert.match(repository, /version: 18\.6,/);
  assert.match(repository, /basePackageId: localLiveEditableStudioRuntimePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localGlobalGoogleVoiceCataloguePackage,') <
      packageLedger.indexOf('localLiveEditableStudioRuntimePackage,'),
  );
  assert.match(component, /Model quality/);
  assert.match(component, /selectedCloudSpeechVoice\.qualityLabel/);
  assert.match(speech, /texttospeech\.googleapis\.com\/v1\/voices/);
  assert.match(speech, /Choose an available Google voice/);
});

test('registers the live editable Studio runtime as the newest immutable package', async () => {
  const [migration, repository, launcher, viteConfiguration] = await Promise.all([
    readFile(liveEditableStudioRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/start-railway-runtime', import.meta.url), 'utf8'),
    readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Live editable Studio runtime test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.5/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.4'/,
  );
  assert.match(repository, /version: 18\.5,/);
  assert.match(repository, /basePackageId: localImageOnlyCodexMessagePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localLiveEditableStudioRuntimePackage,') <
      packageLedger.indexOf('localImageOnlyCodexMessagePackage,'),
  );
  assert.match(launcher, /maintain_workspace_studio/);
  assert.match(launcher, /SITEFORGE_WORKSPACE_DEVELOPMENT=1/);
  assert.match(launcher, /--host 127\.0\.0\.1/);
  assert.match(launcher, /--mode development/);
  assert.match(launcher, /--force/);
  assert.match(launcher, /studio_workspace_directory/);
  assert.match(viteConfiguration, /\.\.\.railwayAllowedHosts/);
});

test('registers image-only Codex messages as the newest immutable package', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(imageOnlyCodexMessageMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Image-only Codex message test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.4/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.3'/,
  );
  assert.match(repository, /version: 18\.4,/);
  assert.match(repository, /basePackageId: localDurableCodexChatSessionPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localImageOnlyCodexMessagePackage,') <
      packageLedger.indexOf('localDurableCodexChatSessionPackage,'),
  );
  assert.match(component, /!prompt\.trim\(\) && draftAttachments\.length === 0/);
});

test('retains durable Codex chat session restoration as an immutable package', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(durableCodexChatSessionMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Durable Codex chat session test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.3/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.2'/,
  );
  assert.match(repository, /version: 18\.3,/);
  assert.match(repository, /basePackageId: localSelectableGoogleCodexVoicesPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDurableCodexChatSessionPackage,') <
      packageLedger.indexOf('localSelectableGoogleCodexVoicesPackage,'),
  );
  assert.match(component, /made-solid-codex-chat-session-v1/);
  assert.match(component, /anchorOffset/);
  assert.match(component, /restoredChatThreadRef/);
  assert.match(component, /saveChatPosition\(\)/);
});

test('registers selectable Google Codex voices as the newest immutable package', async () => {
  const [migration, repository, component, service] = await Promise.all([
    readFile(selectableGoogleCodexVoicesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Selectable Google Codex voices test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.2/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.1'/,
  );
  assert.match(repository, /version: 18\.2,/);
  assert.match(repository, /basePackageId: localDeletableQueuedCodexMessagesPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localSelectableGoogleCodexVoicesPackage,') <
      packageLedger.indexOf('localDeletableQueuedCodexMessagesPackage,'),
  );
  assert.match(component, /Read aloud voice/);
  assert.match(component, /Preview voice/);
  assert.match(component, /Speech playback position/);
  assert.match(service, /__made-solid\/codex-speech/);
  assert.match(service, /Cache-Control': 'private, no-store/);
});

test('registers deletable queued Codex messages as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(deletableQueuedCodexMessagesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Deletable queued Codex messages test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.0'/,
  );
  assert.match(repository, /version: 18\.1,/);
  assert.match(repository, /basePackageId: localSeamlessStudioHydrationPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDeletableQueuedCodexMessagesPackage,') <
      packageLedger.indexOf('localSeamlessStudioHydrationPackage,'),
  );
});

test('retains seamless Studio hydration as an immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(seamlessStudioHydrationMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Seamless Studio hydration test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v18\.0/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.9'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v18\.0'/,
  );
  assert.match(migration, /Codex bridge reloads independently/);
  assert.match(migration, /active route and rendered workspace remain mounted/);
  assert.match(repository, /version: 18\.0,/);
  assert.match(repository, /basePackageId: localReliableFullReplyReadingPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localSeamlessStudioHydrationPackage,') <
        ledger.indexOf('localReliableFullReplyReadingPackage,'),
    );
  }
});

test('retains reliable full-reply reading as an immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(reliableFullReplyReadingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Reliable full-reply reading test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.9/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.8'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.9'/,
  );
  assert.match(migration, /English read-aloud for the full reply/);
  assert.match(migration, /estimated elapsed-and-total timeline/);
  assert.match(migration, /ignore stale completion events/);
  assert.match(repository, /version: 17\.9,/);
  assert.match(repository, /basePackageId: localEvidenceLinkedCodexActivityPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localReliableFullReplyReadingPackage,') <
        ledger.indexOf('localEvidenceLinkedCodexActivityPackage,'),
    );
  }
});

test('retains evidence-linked Codex activity as an immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(evidenceLinkedCodexActivityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Evidence-linked Codex activity test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.8/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.7'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.8'/,
  );
  assert.match(migration, /structural observable outcomes and explicit assistant commentary/);
  assert.match(migration, /chronologically within the turn where they occurred/);
  assert.match(migration, /inferred conclusions, raw command output, diffs, tool results/);
  assert.match(migration, /hidden chain-of-thought, or private reasoning/);
  assert.match(repository, /version: 17\.8,/);
  assert.match(repository, /basePackageId: localCodexSubscriptionUsagePackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localEvidenceLinkedCodexActivityPackage,') <
        ledger.indexOf('localCodexSubscriptionUsagePackage,'),
    );
  }
});

test('registers Codex subscription usage as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(codexSubscriptionUsageMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Codex subscription usage test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.7/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.6'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.7'/,
  );
  assert.match(migration, /account\/rateLimits\/read/);
  assert.match(migration, /unavailable usage never interrupts chat/);
  assert.match(migration, /Never derive subscription quota from conversation tokens/);
  assert.match(repository, /version: 17\.7,/);
  assert.match(repository, /basePackageId: localCodexConversationLoadingPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localCodexSubscriptionUsagePackage,') <
        ledger.indexOf('localCodexConversationLoadingPackage,'),
    );
  }
});

test('registers Codex conversation loading above its prior immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(codexConversationLoadingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Codex conversation loading test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.6/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.5'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.6'/,
  );
  assert.match(migration, /replaces the previous transcript/);
  assert.match(migration, /static prefers-reduced-motion presentation/);
  assert.match(repository, /version: 17\.6,/);
  assert.match(repository, /basePackageId: localDeviceVoiceReadAloudPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localCodexConversationLoadingPackage,') <
        ledger.indexOf('localDeviceVoiceReadAloudPackage,'),
    );
  }
});

test('registers device voice read aloud above its prior immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(deviceVoiceReadAloudMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Device voice read aloud test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.5/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.4'/,
  );
  assert.match(
    migration,
    /existing\.builder_contract_version = 'made-solid-studio-builder-agent-v17\.5'/,
  );
  assert.match(migration, /browser speech-synthesis service/);
  assert.match(migration, /Start speech only from the reviewer''s action/);
  assert.match(migration, /mobile browsers that cancel rather than pause/);
  assert.match(migration, /Never claim these device voices are ChatGPT voices/);
  assert.match(repository, /version: 17\.5,/);
  assert.match(repository, /basePackageId: localObservableCodexActivityPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localDeviceVoiceReadAloudPackage,') <
        ledger.indexOf('localObservableCodexActivityPackage,'),
    );
  }
});

test('registers observable Codex activity as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(observableCodexActivityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Observable Codex activity test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.4/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /inline between conversation messages/);
  assert.match(migration, /Do not collect the entries into a persistent bottom workbench/);
  assert.match(migration, /never present hidden chain-of-thought/);
  assert.match(repository, /version: 17\.4,/);
  assert.match(repository, /basePackageId: localAuthenticatedStudioControlsPackage\.id/);
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.ok(
      ledger.indexOf('localObservableCodexActivityPackage,') <
        ledger.indexOf('localAuthenticatedStudioControlsPackage,'),
    );
  }
});

test('registers authenticated Studio controls as the newest immutable package', async () => {
  const [migration, repository, main, panelGate] = await Promise.all([
    readFile(authenticatedStudioControlsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../src/main.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../../src/components/AuthenticatedCodexFeedbackPanel.tsx', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(migration, /Authenticated Studio controls test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.3/);
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 17\.3,/);
  assert.match(repository, /basePackageId: localRenderableWorkspacePreviewPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localAuthenticatedStudioControlsPackage,') <
      packageLedger.indexOf('localRenderableWorkspacePreviewPackage,'),
  );
  assert.doesNotMatch(main, /<CodexFeedbackPanel/);
  assert.match(main, /<AuthenticatedCodexFeedbackPanel/);
  assert.match(panelGate, /getSession\(\)/);
  assert.match(panelGate, /onAuthStateChange/);
  assert.match(panelGate, /authenticated \? \([\s\S]*<CodexFeedbackPanel/);
});

test('registers renderable workspace previews as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(renderableWorkspacePreviewMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Renderable workspace preview test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.2/);
  assert.match(migration, /NODE_ENV=development/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 17\.2,/);
  assert.match(repository, /basePackageId: localRestartableWorkspacePreviewPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRenderableWorkspacePreviewPackage,') <
      packageLedger.indexOf('localRestartableWorkspacePreviewPackage,'),
  );
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.match(ledger, /localRenderableWorkspacePreviewPackage,/);
  }
});

test('registers restartable workspace previews as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(restartableWorkspacePreviewMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Restartable workspace preview test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 17\.1,/);
  assert.match(repository, /basePackageId: localStableWorkspacePreviewPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRestartableWorkspacePreviewPackage,') <
      packageLedger.indexOf('localStableWorkspacePreviewPackage,'),
  );
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.match(ledger, /localRestartableWorkspacePreviewPackage,/);
  }
});

test('registers stable workspace previews as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(stableWorkspacePreviewMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Stable workspace preview test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v17\.0/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 17,/);
  assert.match(repository, /basePackageId: localAgentTeamClarityPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localStableWorkspacePreviewPackage,') <
      packageLedger.indexOf('localAgentTeamClarityPackage,'),
  );
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const ledger of [freshLedger, upgradeLedger, recoveryLedger]) {
    assert.match(ledger, /localStableWorkspacePreviewPackage,/);
  }
});

test('retains agent-team clarity below the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(agentTeamClarityMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Agent-team clarity test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.9/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.9,/);
  assert.match(repository, /basePackageId: localMessageMotionCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localAgentTeamClarityPackage,') <
      packageLedger.indexOf('localMessageMotionCodexChatPackage,'),
  );
});

test('registers message motion as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(messageMotionCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Message-motion Codex chat test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.8/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.8,/);
  assert.match(repository, /basePackageId: localPrivateWorkspacePreviewAccessPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localMessageMotionCodexChatPackage,') <
      packageLedger.indexOf('localPrivateWorkspacePreviewAccessPackage,'),
  );
});

test('registers private workspace preview access as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(privateWorkspacePreviewAccessMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Private workspace preview access test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.7/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.7,/);
  assert.match(repository, /basePackageId: localContextualCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localPrivateWorkspacePreviewAccessPackage,') <
      packageLedger.indexOf('localContextualCodexChatPackage,'),
  );
  const freshLedger = repository.slice(
    repository.indexOf('if (!localPackageRecord)'),
    repository.indexOf('} else {', repository.indexOf('if (!localPackageRecord)')),
  );
  const upgradeLedger = repository.slice(
    repository.indexOf('const missingPackages = ['),
    repository.indexOf('].filter(', repository.indexOf('const missingPackages = [')),
  );
  const recoveryLedger = repository.slice(repository.indexOf('} catch {'));
  for (const packageName of [
    'localPrivateWorkspacePreviewAccessPackage',
    'localContextualCodexChatPackage',
    'localInlineMultiImageCodexChatPackage',
    'localAnimatedCodexChatPackage',
    'localFastCodexChatPackage',
    'localRailwayContainerAccessPackage',
    'localRailwayPersistentCheckoutPackage',
    'localRailwayWorkspaceWritePackage',
  ]) {
    assert.match(freshLedger, new RegExp(`${packageName},`));
    assert.match(upgradeLedger, new RegExp(`${packageName},`));
    assert.match(recoveryLedger, new RegExp(`${packageName},`));
  }
});

test('registers contextual Codex chat as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(contextualCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Contextual Codex chat test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.6/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.6,/);
  assert.match(repository, /basePackageId: localInlineMultiImageCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localContextualCodexChatPackage,') <
      packageLedger.indexOf('localInlineMultiImageCodexChatPackage,'),
  );
});

test('registers inline multi-image Codex chat as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(inlineMultiImageCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Inline multi-image Codex chat test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.5/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.5,/);
  assert.match(repository, /basePackageId: localAnimatedCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localInlineMultiImageCodexChatPackage,') <
      packageLedger.indexOf('localAnimatedCodexChatPackage,'),
  );
});

test('registers animated Codex chat as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(animatedCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Animated Codex chat test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.4/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.4,/);
  assert.match(repository, /basePackageId: localFastCodexChatPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localAnimatedCodexChatPackage,') <
      packageLedger.indexOf('localFastCodexChatPackage,'),
  );
});

test('registers Fast Codex chat as the newest immutable package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(fastCodexChatMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Fast Codex chat test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.3/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.3,/);
  assert.match(repository, /basePackageId: localRailwayContainerAccessPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localFastCodexChatPackage,') <
      packageLedger.indexOf('localRailwayContainerAccessPackage,'),
  );
});

test('registers Railway container access while preserving auth and workspace roots', async () => {
  const [migration, repository, bridge, launcher] = await Promise.all([
    readFile(railwayContainerAccessMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../scripts/start-codex-app-server', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Railway container-access test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.2/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.2,/);
  assert.match(repository, /basePackageId: localRailwayPersistentCheckoutPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRailwayContainerAccessPackage,') <
      packageLedger.indexOf('localRailwayPersistentCheckoutPackage,'),
  );
  assert.match(bridge, /sandbox: 'danger-full-access'/);
  assert.match(bridge, /type: 'dangerFullAccess'/);
  assert.match(bridge, /runtimeWorkspaceRoots/);
  assert.match(launcher, /forced_login_method="chatgpt"/);
  assert.match(launcher, /sandbox_mode="danger-full-access"/);
  assert.match(launcher, /expected_studio_workspace=.*siteforge-os/);
  assert.match(launcher, /expected_website_workspace=.*made-solid-website/);
});

test('registers the Railway persistent-checkout package as newest', async () => {
  const [migration, repository, bootstrap] = await Promise.all([
    readFile(railwayPersistentCheckoutMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../scripts/bootstrap-railway-workspaces', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /Railway persistent-checkout test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.1/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16\.1,/);
  assert.match(repository, /basePackageId: localRailwayWorkspaceWritePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRailwayPersistentCheckoutPackage,') <
      packageLedger.indexOf('localRailwayWorkspaceWritePackage,'),
  );
  assert.match(bootstrap, /repository_matches/);
  assert.match(bootstrap, /preserving both verified persistent repository checkouts/);
});

test('retains the immutable Railway repository-scoped workspace-write package', async () => {
  const [migration, repository] = await Promise.all([
    readFile(railwayWorkspaceWriteMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /Railway workspace-write test package:/);
  assert.match(migration, /made-solid-studio-builder-agent-v16\.0/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 16,/);
  assert.match(repository, /basePackageId: localPermanentRailwayRuntimePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRailwayWorkspaceWritePackage,') <
      packageLedger.indexOf('localPermanentRailwayRuntimePackage,'),
  );
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
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.43`/);
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
  assert.match(
    localService,
    /const maintainCodexFeedbackBridge = \(\) =>[\s\S]*bridge\.maintain\(\)[\s\S]*\.catch\(\(\) => undefined\)/,
  );
  assert.match(localService, /await bridge\.maintain\(\)/);
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
  assert.match(component, /agent is.*resuming/s);
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
  assert.match(bridge, /railwayContainerThreadSettings\(scope\)/);
  assert.match(bridge, /railwayContainerTurnSettings\(recordScope\)/);
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
  const [app, appShell, component, hotUpdate, mobileCapture, main, service] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(appShellUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(studioHotUpdateUrl, 'utf8'),
    readFile(mobileCaptureUrl, 'utf8'),
    readFile(mainUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(component, /Button, ButtonGroup, ConfirmationDialog, IconButton/);
  assert.match(component, /delete-queued/);
  assert.match(component, /Delete queued message\?/);
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
  assert.match(
    main,
    /<App\s*\/>[\s\S]*<AuthenticatedCodexFeedbackPanel[\s\S]*embedded=\{isCodexPanelRoute\}[\s\S]*workspaceDirectory=\{workspaceDirectory\}/,
  );
  assert.match(main, /document\.documentElement\.dataset\.codexPanel = 'embedded'/);
  assert.match(app, /studioPreviewUrl\(lastEvent\.previewUrl, window\.location\.hash, directory\)/);
  assert.match(app, /workspaceEditorUrl\(window\.location\.hash\)/);
  assert.match(app, /function workspaceEditorUrl\(returnRoute = window\.location\.hash\)/);
  assert.match(app, /return developmentStudioUrl\(returnRoute\)/);
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
  assert.doesNotMatch(service, /import \{ CodexFeedbackBridge \} from/);
  assert.match(service, /pathToFileURL\([\s\S]*codex-feedback-bridge\.mjs/);
  assert.match(service, /\?updated=\$\{modifiedAt\}/);
  assert.match(service, /nextBridge\.startedThreads = activeCodexFeedbackBridge\.startedThreads/);
  assert.match(hotUpdate, /vite:beforeUpdate/);
  assert.match(hotUpdate, /vite:afterUpdate/);
  assert.match(appShell, /subscribeToStudioUpdates/);
  assert.match(appShell, /isHydrating \|\| isStudioUpdating/);
  assert.match(appShell, /Updating Studio/);
  assert.match(service, /__made-solid\/page-screenshot/);
  assert.match(service, /localCaptureTarget/);
  assert.match(service, /chromium\.launch/);
  assert.match(service, /sec-fetch-site/);
  assert.match(service, /110 \* 1024 \* 1024/);
  assert.match(service, /configurePreviewServer: configureWorkspaceServer/);
  assert.match(service, /configureServer: configureWorkspaceServer/);
});

test('registers persistent Codex page and popup surfaces as the newest immutable package', async () => {
  const [migration, repository, app, appShell, component] = await Promise.all([
    readFile(persistentCodexChatSurfacesMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(appShellUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.4/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.3'/,
  );
  assert.match(repository, /version: 20\.4,/);
  assert.match(repository, /basePackageId: localRestoredCodexVoiceExperiencePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localPersistentCodexChatSurfacesPackage,') <
      packageLedger.indexOf('localRestoredCodexVoiceExperiencePackage,'),
  );
  assert.match(app, /page: 'codex'/);
  assert.match(app, /<CodexFeedbackPanel page \/>/);
  assert.match(appShell, /label: 'Codex chat'/);
  assert.match(component, /disabled=\{isSupported === false\}/);
  assert.match(component, /page \|\| phase === 'compose'/);
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localPersistentCodexChatSurfacesPackage,') <
      existingLedgerUpgrade.indexOf('localRestoredCodexVoiceExperiencePackage,'),
  );
  assert.ok(
    existingLedgerUpgrade.indexOf('localRestoredCodexVoiceExperiencePackage,') <
      existingLedgerUpgrade.indexOf('localWorkspaceDevelopmentStudioPackage,'),
  );
  const corruptLedgerFallback = repository.slice(
    repository.indexOf("} catch {\n        await this.put('meta'"),
  );
  assert.match(corruptLedgerFallback, /localPersistentCodexChatSurfacesPackage,/);
  assert.match(corruptLedgerFallback, /localRestoredCodexVoiceExperiencePackage,/);
  assert.match(corruptLedgerFallback, /localWorkspaceDevelopmentStudioPackage,/);
});

test('registers selected Codex excerpt actions above immutable v20.4 in every local ledger path', async () => {
  const [migration, repository, app, component, service] = await Promise.all([
    readFile(selectedCodexExcerptActionsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.5/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.4'/,
  );
  assert.match(repository, /version: 20\.5,/);
  assert.match(repository, /basePackageId: localPersistentCodexChatSurfacesPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localSelectedCodexExcerptActionsPackage,') <
      packageLedger.indexOf('localPersistentCodexChatSurfacesPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localSelectedCodexExcerptActionsPackage,') <
      existingLedgerUpgrade.indexOf('localPersistentCodexChatSurfacesPackage,'),
  );
  const corruptLedgerFallback = repository.slice(
    repository.indexOf("} catch {\n        await this.put('meta'"),
  );
  assert.match(corruptLedgerFallback, /localSelectedCodexExcerptActionsPackage,/);
  assert.match(component, /aria-label="Selected Codex excerpt"/);
  assert.match(component, />Quick question</);
  assert.match(component, /Add to prompt/);
  assert.match(component, /Send now/);
  assert.match(service, /case 'temporary-question':/);
  assert.match(app, /Selecting text inside one Codex reply/);
});

test('registers Codex phone notifications above immutable v20.5', async () => {
  const [migration, repository, app, service] = await Promise.all([
    readFile(codexPhoneNotificationsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.6/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.5'/,
  );
  assert.match(repository, /version: 20\.6,/);
  assert.match(repository, /basePackageId: localSelectedCodexExcerptActionsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localCodexPhoneNotificationsPackage,') <
      packageLedger.indexOf('localSelectedCodexExcerptActionsPackage,'),
  );
  assert.match(app, /Codex completion notifications/);
  assert.match(app, /Turn on phone notifications/);
  assert.match(service, /codexNotificationsEndpoint/);
  assert.match(service, /notifyCompletion/);
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localCodexPhoneNotificationsPackage,') <
      existingLedgerUpgrade.indexOf('localSelectedCodexExcerptActionsPackage,'),
  );
});

test('registers branchable Codex conversations above immutable v20.6', async () => {
  const [migration, repository, app, service, bridge, component] = await Promise.all([
    readFile(branchableCodexConversationsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /coalesce\(max\(existing\.version\), 0\) \+ 0\.1/);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.7/);
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.6'/,
  );
  assert.match(repository, /version: 20\.7,/);
  assert.match(repository, /basePackageId: localCodexPhoneNotificationsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localBranchableCodexConversationsPackage,') <
      packageLedger.indexOf('localCodexPhoneNotificationsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localBranchableCodexConversationsPackage,') <
      existingLedgerUpgrade.indexOf('localCodexPhoneNotificationsPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(service, /case 'branch-thread':/);
  assert.match(service, /codexBranchEndpoint/);
  assert.match(bridge, /client\.request\('thread\/fork'/);
  assert.match(bridge, /lastTurnId: turnId/);
  assert.match(component, /Branch chat from this reply/);
  assert.match(component, /codex-branch/);
});

test('registers live Workspace Codex branching above immutable v20.7', async () => {
  const [migration, repository, workspaceService, viteConfiguration] = await Promise.all([
    readFile(liveWorkspaceCodexBranchingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(workspaceBranchServiceUrl, 'utf8'),
    readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.7'/,
  );
  assert.match(repository, /version: 20\.8,/);
  assert.match(repository, /basePackageId: localBranchableCodexConversationsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localLiveWorkspaceCodexBranchingPackage,') <
      packageLedger.indexOf('localBranchableCodexConversationsPackage,'),
  );
  assert.match(workspaceService, /workspaceCodexBranchEndpoint/);
  assert.match(workspaceService, /activeBridge\.forkThread\(input\)/);
  assert.doesNotMatch(workspaceService, /\.maintain\(/);
  assert.match(viteConfiguration, /workspaceCodexBranchPlugin\(\)/);
});

test('registers live Workspace phone notifications above immutable v20.8', async () => {
  const [migration, repository, workspaceService, notificationClient] = await Promise.all([
    readFile(liveWorkspacePhoneNotificationsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(workspaceBranchServiceUrl, 'utf8'),
    readFile(new URL('../../src/lib/codex-notifications.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v20\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.8'/,
  );
  assert.match(repository, /version: 20\.9,/);
  assert.match(repository, /basePackageId: localLiveWorkspaceCodexBranchingPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localLiveWorkspacePhoneNotificationsPackage,') <
      packageLedger.indexOf('localLiveWorkspaceCodexBranchingPackage,'),
  );
  assert.match(workspaceService, /workspaceCodexNotificationsEndpoint/);
  assert.match(workspaceService, /dispatchCompletionNotifications/);
  assert.doesNotMatch(workspaceService, /activeBridge\.maintain\(\)/);
  assert.match(notificationClient, /if \(!text\.trim\(\)\) return/);
  assert.match(notificationClient, /Phone notifications are not ready on this Studio server yet/);
});

test('registers natural Codex reading above immutable v20.9', async () => {
  const [migration, repository, speech] = await Promise.all([
    readFile(naturalCodexReadingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(new URL('../../src/lib/codex-speech.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v20\.9'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 21,/);
  assert.match(repository, /basePackageId: localLiveWorkspacePhoneNotificationsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localNaturalCodexReadingPackage,') <
      packageLedger.indexOf('localLiveWorkspacePhoneNotificationsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localNaturalCodexReadingPackage,') <
      existingLedgerUpgrade.indexOf('localLiveWorkspacePhoneNotificationsPackage,'),
  );
  assert.match(speech, /condenseNaturalTechnicalLists/);
  assert.match(speech, /→➜➝➞➡⇒⟶/);
});

test('registers focused Codex settings above immutable v21.0', async () => {
  const [migration, repository, component] = await Promise.all([
    readFile(focusedCodexSettingsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.1/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.0'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(repository, /version: 21\.1,/);
  assert.match(repository, /basePackageId: localNaturalCodexReadingPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localFocusedCodexSettingsPackage,') <
      packageLedger.indexOf('localNaturalCodexReadingPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localFocusedCodexSettingsPackage,') <
      existingLedgerUpgrade.indexOf('localNaturalCodexReadingPackage,'),
  );
  assert.match(component, /label="Run setup"/);
  assert.match(component, /label="Chat settings"/);
  assert.match(component, /Close chat settings/);
});

test('registers concise Codex reading above immutable v21.1', async () => {
  const [migration, repository, app, speech] = await Promise.all([
    readFile(conciseCodexReadingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(new URL('../../src/lib/codex-speech.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.2/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.1'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(repository, /version: 21\.2,/);
  assert.match(repository, /basePackageId: localFocusedCodexSettingsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localConciseCodexReadingPackage,') <
      packageLedger.indexOf('localFocusedCodexSettingsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localConciseCodexReadingPackage,') <
      existingLedgerUpgrade.indexOf('localFocusedCodexSettingsPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /Send control becomes a Stop Codex control/);
  assert.match(speech, /condenseNaturalTechnicalHandoff/);
});

test('registers development release URLs above immutable v21.2', async () => {
  const [migration, repository, app, developmentPage, previewHost] = await Promise.all([
    readFile(developmentReleaseUrlsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(new URL('../../src/components/DevelopmentPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../preview-host/server.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.3/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.2'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(repository, /version: 21\.3,/);
  assert.match(repository, /basePackageId: localConciseCodexReadingPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDevelopmentReleaseUrlsPackage,') <
      packageLedger.indexOf('localConciseCodexReadingPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localDevelopmentReleaseUrlsPackage,') <
      existingLedgerUpgrade.indexOf('localConciseCodexReadingPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localDevelopmentReleaseUrlsPackage,') <
      fallbackLedger.indexOf('localConciseCodexReadingPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /Send control becomes a Stop Codex control/);
  assert.match(developmentPage, /Unreleased changes/);
  assert.match(developmentPage, /Saved feature versions/);
  assert.match(developmentPage, /Promote exact version/);
  assert.match(previewHost, /'\/test\/'/);
  assert.match(previewHost, /'\/build\/'/);
});

test('registers resilient live Codex branching above immutable v21.3', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(resilientLiveCodexBranchingMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.4/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.3'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /Resilient live Codex branching test package:/);
  assert.match(migration, /Never claim success without a returned branch result/);
  assert.match(migration, /Check Conversations for the new branch, then retry if it is not listed/);
  assert.match(repository, /version: 21\.4,/);
  assert.match(repository, /basePackageId: localDevelopmentReleaseUrlsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localResilientLiveCodexBranchingPackage,') <
      packageLedger.indexOf('localDevelopmentReleaseUrlsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localResilientLiveCodexBranchingPackage,') <
      existingLedgerUpgrade.indexOf('localDevelopmentReleaseUrlsPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localResilientLiveCodexBranchingPackage,') <
      fallbackLedger.indexOf('localDevelopmentReleaseUrlsPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /Send control becomes a Stop Codex control/);
  assert.match(app, /active attached agents/);
});

test('registers stoppable Codex turns above immutable v21.4', async () => {
  const [migration, repository, app, component, bridge, service] = await Promise.all([
    readFile(stoppableCodexTurnsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.5/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.4'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(migration, /Stoppable Codex turns test package:/);
  assert.match(repository, /version: 21\.5,/);
  assert.match(repository, /basePackageId: localResilientLiveCodexBranchingPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localStoppableCodexTurnsPackage,') <
      packageLedger.indexOf('localResilientLiveCodexBranchingPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localStoppableCodexTurnsPackage,') <
      existingLedgerUpgrade.indexOf('localResilientLiveCodexBranchingPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localStoppableCodexTurnsPackage,') <
      fallbackLedger.indexOf('localResilientLiveCodexBranchingPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /Send control becomes a Stop Codex control/);
  assert.match(component, /action: 'stop-active-turn'/);
  assert.match(component, /label=.*[\s\S]*'Stop Codex'/);
  assert.match(bridge, /async stopActiveTurn/);
  assert.match(bridge, /manuallyStopped: true/);
  assert.match(service, /case 'stop-active-turn':/);
});

test('registers the client URL release contract above immutable v21.5', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(clientUrlReleaseContractMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.6/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.5'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"client-url-release-contract"/);
  assert.match(migration, /Client URL release contract test package:/);
  assert.match(repository, /version: 21\.6,/);
  assert.match(repository, /basePackageId: localStoppableCodexTurnsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localClientUrlReleaseContractPackage,') <
      packageLedger.indexOf('localStoppableCodexTurnsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localClientUrlReleaseContractPackage,') <
      existingLedgerUpgrade.indexOf('localStoppableCodexTurnsPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localClientUrlReleaseContractPackage,') <
      fallbackLedger.indexOf('localStoppableCodexTurnsPackage,'),
  );
  assert.match(app, /id: 'client-url-release-contract'/);
  assert.match(repository, /expire them after seven days/);
});

test('registers revocable ready client reviews above immutable v21.6', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(revocableReadyClientReviewsMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(migration, /base\.organization_id,\s*21\.7,/);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.7/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.6'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"client-url-release-contract"/);
  assert.match(migration, /Revocable ready client reviews test package:/);
  assert.match(repository, /version: 21\.7,/);
  assert.match(repository, /basePackageId: localClientUrlReleaseContractPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localRevocableReadyClientReviewsPackage,') <
      packageLedger.indexOf('localClientUrlReleaseContractPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localRevocableReadyClientReviewsPackage,') <
      existingLedgerUpgrade.indexOf('localClientUrlReleaseContractPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localRevocableReadyClientReviewsPackage,') <
      fallbackLedger.indexOf('localClientUrlReleaseContractPackage,'),
  );
  assert.match(app, /id: 'client-url-release-contract'/);
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.2`/);
  assert.match(app, /already-ready private client review can now be revoked immediately/);
});

test('registers reliable Codex Stop state above immutable v21.7', async () => {
  const [migration, repository, app, component, bridge, service] = await Promise.all([
    readFile(reliableCodexStopStateMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(componentUrl, 'utf8'),
    readFile(new URL('../../scripts/codex-feedback-bridge.mjs', import.meta.url), 'utf8'),
    readFile(localServiceUrl, 'utf8'),
  ]);
  assert.match(migration, /base\.organization_id,\s*21\.8,/);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.8/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.7'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.match(repository, /version: 21\.8,/);
  assert.match(repository, /basePackageId: localRevocableReadyClientReviewsPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localReliableCodexStopStatePackage,') <
      packageLedger.indexOf('localRevocableReadyClientReviewsPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localReliableCodexStopStatePackage,') <
      existingLedgerUpgrade.indexOf('localRevocableReadyClientReviewsPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localReliableCodexStopStatePackage,') <
      fallbackLedger.indexOf('localRevocableReadyClientReviewsPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /build checks can no longer erase the live development module cache/);
  assert.match(component, /statusRequestSequenceRef/);
  assert.match(component, /key="stop-codex"/);
  assert.match(component, /key="send-codex"/);
  assert.match(component, /action: 'enqueue'/);
  assert.match(component, /status\?\.threadIssue/);
  assert.match(bridge, /const working = Boolean\(turn\)/);
  assert.match(bridge, /readThreadForStatus/);
  assert.match(service, /capabilities: \{ stopActiveTurn: true \}/);
  assert.match(service, /default:[\s\S]*Choose a valid Codex chat action/);
});

test('registers the dedicated client website editor above immutable v21.8', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(dedicatedClientWebsiteEditorMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(migration, /base\.organization_id,\s*21\.9,/);
  assert.match(migration, /made-solid-studio-builder-agent-v21\.9/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.8'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.doesNotMatch(migration, /"visual-codex-feedback",/);
  assert.match(migration, /Dedicated client website editor test package:/);
  assert.match(repository, /version: 21\.9,/);
  assert.match(repository, /basePackageId: localReliableCodexStopStatePackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localDedicatedClientWebsiteEditorPackage,') <
      packageLedger.indexOf('localReliableCodexStopStatePackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localDedicatedClientWebsiteEditorPackage,') <
      existingLedgerUpgrade.indexOf('localReliableCodexStopStatePackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localDedicatedClientWebsiteEditorPackage,') <
      fallbackLedger.indexOf('localReliableCodexStopStatePackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(repository, /dedicated new-tab client editor/);
  assert.match(repository, /canonical editable checkout/);
});

test('registers the resilient development Studio runtime above immutable v21.9', async () => {
  const [migration, repository, app] = await Promise.all([
    readFile(resilientDevelopmentStudioRuntimeMigrationUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
  ]);
  assert.match(migration, /base\.organization_id,\s*22\.0,/);
  assert.match(migration, /made-solid-studio-builder-agent-v22\.0/);
  assert.match(
    migration,
    /candidate\.builder_contract_version = 'made-solid-studio-builder-agent-v21\.9'/,
  );
  assert.match(migration, /'test_ready'/);
  assert.match(migration, /not exists/i);
  assert.match(migration, /"visual-codex-feedback"/);
  assert.doesNotMatch(migration, /"visual-codex-feedback",/);
  assert.match(migration, /Resilient development Studio runtime test package:/);
  assert.match(repository, /version: 22,/);
  assert.match(repository, /basePackageId: localDedicatedClientWebsiteEditorPackage\.id/);
  const packageLedger = repository.slice(repository.indexOf('value: JSON.stringify(['));
  assert.ok(
    packageLedger.indexOf('localResilientDevelopmentStudioRuntimePackage,') <
      packageLedger.indexOf('localDedicatedClientWebsiteEditorPackage,'),
  );
  const existingLedgerUpgrade = repository.slice(repository.indexOf('const missingPackages = ['));
  assert.ok(
    existingLedgerUpgrade.indexOf('localResilientDevelopmentStudioRuntimePackage,') <
      existingLedgerUpgrade.indexOf('localDedicatedClientWebsiteEditorPackage,'),
  );
  const fallbackLedger = repository.slice(repository.indexOf('} catch {'));
  assert.ok(
    fallbackLedger.indexOf('localResilientDevelopmentStudioRuntimePackage,') <
      fallbackLedger.indexOf('localDedicatedClientWebsiteEditorPackage,'),
  );
  assert.match(app, /revision: `v\$\{selectedAgentPackage\.version\}\.91`/);
  assert.match(app, /build checks can no longer erase the live development module cache/);
  assert.match(app, /shows a safe reload screen instead of a white page/);
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

test('keeps the shared Codex panel in the Studio-owned preview shell', async () => {
  const [layout, service, previewFrame] = await Promise.all([
    readFile(foundationLayoutUrl, 'utf8'),
    readFile(localServiceUrl, 'utf8'),
    readFile(new URL('../../src/PreviewFrame.tsx', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(layout, /WorkspaceCodexPanel/);
  assert.doesNotMatch(layout, /made-solid-codex-bridge\.js/);
  assert.match(service, /ownedWebsiteDevelopmentEnvironment/);
  assert.match(service, /MADE_SOLID_STUDIO_ORIGIN=/);
  assert.match(previewFrame, /Back to Studio/);
  assert.match(previewFrame, /window\.top\.location\.href/);
});
