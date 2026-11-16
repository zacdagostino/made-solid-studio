import type {
  Activity,
  AgentPackage,
  AgentPackageProposal,
  AssetAnnotation,
  AssetAnalysisJob,
  AssetRefreshJob,
  VisualContentCandidate,
  VisualContentJob,
  BrandKit,
  Audit,
  AuditFinding,
  AuditObservation,
  AuditSpecialistTask,
  BuildManifest,
  BuilderPreferences,
  BuilderPreviewMode,
  BuilderRunEvidence,
  BuilderRunMode,
  BuilderRun,
  ClientPreviewPublication,
  ClientPreviewPublicationInput,
  MadeSolidHandoff,
  MadeSolidHandoffInput,
  OutreachCompliance,
  OutreachComplianceInput,
  GithubWorkspacePublication,
  GithubWorkspacePublicationInput,
  CapturedPage,
  Business,
  Contact,
  DecisionReport,
  ReportPreviewJob,
  EvidenceFact,
  ProspectWorkspace,
  ResearchArtifact,
  ResearchCapture,
  RedesignBrief,
  RedesignConcept,
  SourceReleaseAttestation,
  Task,
  TaxExpense,
  TaxExpenseInput,
  Website,
} from './domain';
import {
  buildManifestSchemaVersion,
  codexBuilderContractVersion,
  createBuildManifestData,
  unresolvedPageDispositions,
  currentManifestContentMatchesBrief,
  manifestSourceMatchesBrief,
} from './build-manifest';
import { createBriefDraft, visualContentMatchesBrief } from './redesign-brief';
import { defaultBuilderPreferences, normalizeBuilderPreferences } from './builder-preferences';

export type WorkspaceRepository = {
  bootstrap(): Promise<void>;
  getBuilderPreferences(): Promise<BuilderPreferences>;
  saveBuilderPreferences(preferences: BuilderPreferences): Promise<BuilderPreferences>;
  listTaxExpenses(): Promise<TaxExpense[]>;
  createTaxExpense(input: TaxExpenseInput): Promise<TaxExpense>;
  updateTaxExpense(id: string, input: TaxExpenseInput): Promise<TaxExpense>;
  deleteTaxExpense(id: string): Promise<void>;
  listAgentPackages(): Promise<AgentPackage[]>;
  listAgentPackageProposals(): Promise<AgentPackageProposal[]>;
  requestAgentPackageProposal(
    basePackageId: string,
    direction: string,
  ): Promise<AgentPackageProposal | undefined>;
  approveAgentPackageForTesting(packageId: string): Promise<AgentPackage | undefined>;
  stageAgentPackageBehaviours(
    packageId: string,
    behaviourIds: string[],
  ): Promise<AgentPackage | undefined>;
  approveAgentPackageForProduction(packageId: string): Promise<AgentPackage | undefined>;
  promoteAgentPackage(packageId: string): Promise<AgentPackage | undefined>;
  listBusinesses(): Promise<Business[]>;
  getWorkspace(businessId: string): Promise<ProspectWorkspace | undefined>;
  listWorkspaces(): Promise<ProspectWorkspace[]>;
  getBuilderRunEvidence(builderRunId: string): Promise<BuilderRunEvidence>;
  createProspect(rawUrl: string, providedName?: string): Promise<ProspectWorkspace | undefined>;
  requestResearchCapture(businessId: string): Promise<ResearchCapture | undefined>;
  continueResearchCapture(businessId: string): Promise<ResearchCapture | undefined>;
  cancelResearchCapture(businessId: string): Promise<void>;
  requestWebsiteAudit(businessId: string): Promise<Audit | undefined>;
  retryAuditSpecialist(taskId: string): Promise<void>;
  cancelWebsiteAudit(businessId: string): Promise<void>;
  updateAuditFinding(
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ): Promise<void>;
  updateAuditObservation(
    observationId: string,
    reviewState: AuditObservation['reviewState'],
  ): Promise<void>;
  createDecisionReport(businessId: string, auditId: string): Promise<void>;
  cancelReportGeneration(jobId: string): Promise<void>;
  requestReportPreview(reportVersionId: string): Promise<ReportPreviewJob | undefined>;
  cancelReportPreview(jobId: string): Promise<void>;
  requestAssetAnalysis(businessId: string): Promise<AssetAnalysisJob | undefined>;
  requestBrandColourRefresh(businessId: string): Promise<AssetAnalysisJob | undefined>;
  requestEditableLogoRetry(
    asset: ResearchArtifact,
    options?: {
      createEditableSvg?: boolean;
      simplifyGeometry?: boolean;
      vectorizerProvider?: 'vtracer' | 'vectorizer_ai';
    },
  ): Promise<AssetAnalysisJob | undefined>;
  cancelAssetAnalysis(businessId: string): Promise<void>;
  requestAssetRefresh(businessId: string): Promise<AssetRefreshJob | undefined>;
  cancelAssetRefresh(businessId: string): Promise<void>;
  setAssetAnalysisSelected(asset: ResearchArtifact, selected: boolean): Promise<void>;
  updateAssetAnnotation(
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ): Promise<void>;
  requestVisualContentExtraction(businessId: string): Promise<VisualContentJob | undefined>;
  cancelVisualContentExtraction(businessId: string): Promise<void>;
  updateVisualContentCandidate(
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ): Promise<void>;
  saveDerivedSvgLogo(asset: ResearchArtifact, svg: string): Promise<void>;
  deleteDerivedSvgLogo(asset: ResearchArtifact): Promise<void>;
  deleteLogoAsset(asset: ResearchArtifact): Promise<void>;
  saveBrandKit(
    businessId: string,
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve?: boolean,
    recordActivity?: boolean,
  ): Promise<BrandKit | undefined>;
  createBrandAwareBriefRevision(businessId: string): Promise<RedesignBrief | undefined>;
  createRedesignBrief(businessId: string): Promise<RedesignBrief | undefined>;
  refreshRedesignBriefArchitecture(brief: RedesignBrief): Promise<RedesignBrief | undefined>;
  updateRedesignBrief(
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ): Promise<void>;
  approveRedesignBrief(brief: RedesignBrief): Promise<void>;
  createBuildManifest(businessId: string): Promise<BuildManifest | undefined>;
  requestWebsiteBuild(
    businessId: string,
    mode?: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
    sourceBuilderRunId?: string,
    targetSourceUrls?: string[],
  ): Promise<BuilderRun | undefined>;
  requestBuilderQualityRecheck(
    builderRunId: string,
    agentPackageId: string,
  ): Promise<BuilderRun | undefined>;
  moveBuilderRunToAgentStudio(builderRunId: string): Promise<BuilderRun | undefined>;
  requestAgentStudioSiteTest(
    sourceBuilderRunId: string,
    buildInstruction: string,
    agentPackageId: string,
    featureId: string,
  ): Promise<BuilderRun | undefined>;
  resumeWebsiteBuild(builderRunId: string): Promise<BuilderRun | undefined>;
  cancelWebsiteBuild(businessId: string): Promise<void>;
  deleteWebsiteBuild(builderRunId: string): Promise<void>;
  deleteWebsiteBuildHistory(businessId: string): Promise<void>;
  deleteManagedRecord(
    kind: 'capture' | 'asset_analysis' | 'brief' | 'manifest' | 'build',
    id: string,
  ): Promise<void>;
  deleteBuildPackage(businessId: string, redesignBriefId: string): Promise<void>;
  createBuilderPreviewUrl(builderRunId: string, mode?: BuilderPreviewMode): Promise<string>;
  requestClientPreviewPublication(
    builderRunId: string,
    input: ClientPreviewPublicationInput,
  ): Promise<ClientPreviewPublication | undefined>;
  cancelClientPreviewPublication(publicationId: string): Promise<void>;
  requestMadeSolidHandoff(
    builderRunId: string,
    input: MadeSolidHandoffInput,
  ): Promise<MadeSolidHandoff | undefined>;
  cancelMadeSolidHandoff(handoffId: string): Promise<void>;
  requestGithubWorkspacePublication(
    builderRunId: string,
    input: GithubWorkspacePublicationInput,
  ): Promise<GithubWorkspacePublication | undefined>;
  cancelGithubWorkspacePublication(publicationId: string): Promise<void>;
  setTaskState(task: Task, state: Task['state']): Promise<void>;
  approveForOutreach(businessId: string): Promise<boolean>;
  saveOutreachCompliance(
    businessId: string,
    input: OutreachComplianceInput,
  ): Promise<OutreachCompliance>;
  deleteProspect(businessId: string): Promise<boolean>;
};

const databaseName = 'siteforge-os';
const databaseVersion = 9;
const legacyStorageKey = 'siteforge-os.records.v2';
const localAgentPackageKey = 'agent-package-v6';
const localBuilderPreferencesKey = 'website-builder-preferences-v1';
const localCreativePackageId = 'agent-package-local-v6-1-creative-composition';
const localExpressivePackageId = 'agent-package-local-v6-2-expressive-craft';
const localResilientQualityPackageId = 'agent-package-local-v6-3-resilient-quality';
const localImmersiveMotionPackageId = 'agent-package-local-v6-4-immersive-motion';
const localResilientResumePackageId = 'agent-package-local-v6-5-resilient-resume';
const localMeaningfulPageNamesPackageId = 'agent-package-local-v6-6-meaningful-page-names';
const localCleanTestStartPackageId = 'agent-package-local-v6-7-clean-test-start';
const localPreciseLogoHandoffPackageId = 'agent-package-local-v6-8-precise-logo-handoff';
const localValidPreviewEntryPackageId = 'agent-package-local-v6-9-valid-preview-entry';
const localResponsiveIntroCraftPackageId = 'agent-package-local-v7-responsive-intro-craft';
const localImmediateBrandIntroductionPackageId =
  'agent-package-local-v7-1-immediate-brand-introduction';
const localEfficientBuilderExecutionPackageId = 'agent-package-local-v7-2-efficient-execution';
const localDecodedNavigationLogoPackageId = 'agent-package-local-v7-3-decoded-navigation-logo';
const localCreativeAutonomyPackageId = 'agent-package-local-v7-4-creative-autonomy';
const localSelectedRouteCompilePackageId = 'agent-package-local-v7-5-selected-route-compile';
const localCompleteCheckpointRestorePackageId =
  'agent-package-local-v7-6-complete-checkpoint-restore';
const localReliableCompactNavigationPackageId =
  'agent-package-local-v7-7-reliable-compact-navigation';
const localCheckpointQualityRecheckPackageId =
  'agent-package-local-v7-8-checkpoint-quality-recheck';
const localStableNavigationVisibilityPackageId =
  'agent-package-local-v7-9-stable-navigation-visibility';
const localSettledAccessibilityPackageId = 'agent-package-local-v8-settled-accessibility';
const localDeterministicEvidencePackageId = 'agent-package-local-v8-1-deterministic-final-evidence';
const localReusableSectionRhythmPackageId = 'agent-package-local-v8-2-reusable-section-rhythm';
const localForcedFinalStatePackageId = 'agent-package-local-v8-3-forced-final-state';
const localSettledFactualEvidencePackageId = 'agent-package-local-v8-4-settled-factual-evidence';
const localImmediateNavigationSequencePackageId =
  'agent-package-local-v8-5-immediate-navigation-sequence';
const localMobileViewportIntegrityPackageId = 'agent-package-local-v8-6-mobile-viewport-integrity';
const localActionableBuilderFailurePackageId =
  'agent-package-local-v8-7-actionable-builder-failures';
const localBoundedBuilderRequestsPackageId = 'agent-package-local-v8-8-bounded-builder-requests';
const localViewportChecksOnlyPackageId = 'agent-package-local-v8-9-viewport-checks-only';
const localRefinementHandoffPackageId = 'agent-package-local-v9-refinement-handoff';
const localAccentOnlyBrandPackageId = 'agent-package-local-v9-1-accent-only-brand';
const localCodespaceWorkspacePackageId = 'agent-package-local-v9-2-codespace-workspace';
const localLogoAccentRegionsPackageId = 'agent-package-local-v9-3-logo-accent-regions';
const localCodespaceStartupReliabilityPackageId =
  'agent-package-local-v9-4-codespace-startup-reliability';
const localCodespaceSetupOrderingPackageId = 'agent-package-local-v9-5-codespace-setup-ordering';
const localBuilderDerivedColoursPackageId = 'agent-package-local-v9-6-builder-derived-colours';
const localPersistentCodespaceTmuxPackageId = 'agent-package-local-v9-7-persistent-codespace-tmux';
const localOptionalSvgGenerationPackageId = 'agent-package-local-v9-8-optional-svg-generation';
const localCodespaceResumeStartupPackageId = 'agent-package-local-v9-9-codespace-resume-startup';
const localVisibleCodespaceSetupPackageId = 'agent-package-local-v10-visible-codespace-setup';
const localWebsiteToneDirectionPackageId = 'agent-package-local-v10-1-website-tone-direction';
const localNoninteractiveCodexInstallPackageId =
  'agent-package-local-v10-2-noninteractive-codex-install';
const localEmbeddedProspectWorkspacePackageId =
  'agent-package-local-v10-3-embedded-prospect-workspace';
const localOneClickProspectWorkspacePackageId =
  'agent-package-local-v10-4-one-click-prospect-workspace';
const localImmediateSourceWorkspacePackageId =
  'agent-package-local-v10-5-immediate-source-workspace';
const localAutomaticWebsiteLaunchPackageId = 'agent-package-local-v10-6-automatic-website-launch';
const localCodespacesPreviewUrlPackageId = 'agent-package-local-v10-7-codespaces-preview-url';
const localLiveRefinementLedgerPackageId = 'agent-package-local-v10-8-live-refinement-ledger';
const localResilientRefinementLedgerPackageId =
  'agent-package-local-v10-9-resilient-refinement-ledger';
const localEditingHandoffPagesPackageId = 'agent-package-local-v11-editing-handoff-pages';
const localResilientFinalEditPackageId = 'agent-package-local-v11-1-resilient-final-edit';
const localEditVersionHistoryPackageId = 'agent-package-local-v11-2-edit-version-history';
const localAgentLearningInboxPackageId = 'agent-package-local-v11-3-agent-learning-inbox';
const localAgentStudioTonePackageId = 'agent-package-local-v11-4-agent-studio-tone';
const localMadeSolidHandoffPackageId = 'agent-package-local-v11-5-made-solid-handoff';
const localOptionalHandoffSchemaPackageId = 'agent-package-local-v11-6-optional-handoff-schema';
const localHandoffWorkerLivenessPackageId = 'agent-package-local-v11-7-handoff-worker-liveness';
const localCleanAlternateTestPackageId = 'agent-package-local-v11-8-clean-alternate-test';
const localCanonicalAssetHandoffPackageId = 'agent-package-local-v11-9-canonical-asset-handoff';
const localCapturedHandoffEmailPackageId = 'agent-package-local-v12-captured-handoff-email';
const localAutomaticClientspacePreviewPackageId =
  'agent-package-local-v12-1-automatic-clientspace-preview';
const localAutomaticProspectDomainPackageId = 'agent-package-local-v12-2-automatic-prospect-domain';
const localEditableHandoffRecoveryPackageId = 'agent-package-local-v12-3-editable-handoff-recovery';
const localReviewedPageDispositionsPackageId =
  'agent-package-local-v12-4-reviewed-page-dispositions';
const localVisualCodexFeedbackPackageId = 'agent-package-local-v12-5-visual-codex-feedback';
const localCodexChatPackageId = 'agent-package-local-v12-6-codex-chat';
const localCodexConversationCapturePackageId =
  'agent-package-local-v12-7-codex-conversation-capture';
const localCodexIdeChatPackageId = 'agent-package-local-v12-8-codex-ide-chat';
const localCodexCapturePreferencesPackageId = 'agent-package-local-v12-9-codex-capture-preferences';
const localCodespaceWorkspaceSuitePackageId = 'agent-package-local-v13-codespace-workspace-suite';
const localReliableCodexNewChatPackageId = 'agent-package-local-v13-1-reliable-codex-new-chat';
const localExactStudioCapturePackageId = 'agent-package-local-v13-2-exact-studio-capture';
const localMobileStudioCapturePackageId = 'agent-package-local-v13-3-mobile-studio-capture';
const localExactVisualChatPackageId = 'agent-package-local-v13-4-exact-visual-chat';
const localReliableLongPageCapturePackageId =
  'agent-package-local-v13-5-reliable-long-page-capture';
const localConcurrentCodexChatsPackageId = 'agent-package-local-v13-6-concurrent-codex-chats';
const localPublicCodespacePortsPackageId = 'agent-package-local-v13-7-public-codespace-ports';
const localCodexTranscriptPositionPackageId = 'agent-package-local-v13-8-codex-transcript-position';
const localConcurrentCodexActivityPackageId = 'agent-package-local-v13-9-concurrent-codex-activity';
const localMarkdownCodexChatPackageId = 'agent-package-local-v14-markdown-codex-chat';
const localCompactCodexComposerPackageId = 'agent-package-local-v14-1-compact-codex-composer';
const localSubscriptionBuilderPackageId = 'agent-package-local-v14-2-subscription-builder-runtime';
const localCameraRollPhotoUploadPackageId = 'agent-package-local-v14-3-camera-roll-photo-upload';
const localRecentPromptChatTitlesPackageId = 'agent-package-local-v14-4-recent-prompt-chat-titles';
const localCodespaceInterruptedChatRecoveryPackageId =
  'agent-package-local-v14-5-codespace-interrupted-chat-recovery';
const localDualRepositoryCodexWorkspacePackageId =
  'agent-package-local-v14-6-dual-repository-codex-workspace';
const localCodexExperimentalWorkspaceCapabilityPackageId =
  'agent-package-local-v14-7-codex-experimental-workspace-capability';
const localReliableUnmaterializedChatCleanupPackageId =
  'agent-package-local-v14-8-reliable-unmaterialized-chat-cleanup';
const localDurableCodexTurnRecoveryPackageId =
  'agent-package-local-v14-9-durable-codex-turn-recovery';
const localAgentTeamChatPackageId = 'agent-package-local-v15-agent-team-chat';
const localColdProspectOffersPackageId = 'agent-package-local-v15-1-cold-prospect-offers';
const localInboundClientEmailReviewPackageId =
  'agent-package-local-v15-2-inbound-client-email-review';
const localClientspaceAdminEmailReviewPackageId =
  'agent-package-local-v15-3-clientspace-admin-email-review';
const localResumableAgentTeamPackageId = 'agent-package-local-v15-4-resumable-agent-team';
const localSpaciousCodexChatPackageId = 'agent-package-local-v15-5-spacious-codex-chat';
const localTurnScopedAgentTeamsPackageId = 'agent-package-local-v15-6-turn-scoped-agent-teams';
const localUninterruptedCodexRecoveryPackageId =
  'agent-package-local-v15-7-uninterrupted-codex-recovery';
const localSubscriptionSafeCodexRuntimePackageId =
  'agent-package-local-v15-8-subscription-safe-codex-runtime';
const localPermanentRailwayRuntimePackageId = 'agent-package-local-v15-9-permanent-railway-runtime';
const localRailwayWorkspaceWritePackageId = 'agent-package-local-v16-0-railway-workspace-write';
const localRailwayPersistentCheckoutPackageId =
  'agent-package-local-v16-1-railway-persistent-checkout';
const localRailwayContainerAccessPackageId = 'agent-package-local-v16-2-railway-container-access';
const localFastCodexChatPackageId = 'agent-package-local-v16-3-fast-codex-chat';
const localAnimatedCodexChatPackageId = 'agent-package-local-v16-4-animated-codex-chat';
const localInlineMultiImageCodexChatPackageId =
  'agent-package-local-v16-5-inline-multi-image-codex-chat';
const localContextualCodexChatPackageId = 'agent-package-local-v16-6-contextual-codex-chat';
const localPrivateWorkspacePreviewAccessPackageId =
  'agent-package-local-v16-7-private-workspace-preview-access';
const localMessageMotionCodexChatPackageId = 'agent-package-local-v16-8-message-motion-codex-chat';
const localAgentTeamClarityPackageId = 'agent-package-local-v16-9-agent-team-clarity';
const localStableWorkspacePreviewPackageId = 'agent-package-local-v17-stable-workspace-preview';
const localRestartableWorkspacePreviewPackageId =
  'agent-package-local-v17-1-restartable-workspace-preview';
const localRenderableWorkspacePreviewPackageId =
  'agent-package-local-v17-2-renderable-workspace-preview';
const localAuthenticatedStudioControlsPackageId =
  'agent-package-local-v17-3-authenticated-studio-controls';
const localObservableCodexActivityPackageId = 'agent-package-local-v17-4-observable-codex-activity';
const localDeviceVoiceReadAloudPackageId = 'agent-package-local-v17-5-device-voice-read-aloud';
const localCodexConversationLoadingPackageId =
  'agent-package-local-v17-6-codex-conversation-loading';
const localCodexSubscriptionUsagePackageId = 'agent-package-local-v17-7-codex-subscription-usage';
const localEvidenceLinkedCodexActivityPackageId =
  'agent-package-local-v17-8-evidence-linked-codex-activity';
const localReliableFullReplyReadingPackageId =
  'agent-package-local-v17-9-reliable-full-reply-reading';
const localSeamlessStudioHydrationPackageId = 'agent-package-local-v18-0-seamless-studio-hydration';
const localDeletableQueuedCodexMessagesPackageId =
  'agent-package-local-v18-1-deletable-queued-codex-messages';
const localSelectableGoogleCodexVoicesPackageId =
  'agent-package-local-v18-2-selectable-google-codex-voices';
const localDurableCodexChatSessionPackageId =
  'agent-package-local-v18-3-durable-codex-chat-session';
const localImageOnlyCodexMessagePackageId = 'agent-package-local-v18-4-image-only-codex-message';
const localLiveEditableStudioRuntimePackageId =
  'agent-package-local-v18-5-live-editable-studio-runtime';
const localGlobalGoogleVoiceCataloguePackageId =
  'agent-package-local-v18-6-global-google-voice-catalogue';
const localAuthenticatedGoogleVoiceCataloguePackageId =
  'agent-package-local-v18-7-authenticated-google-voice-catalogue';
const localResilientStudioSessionRecoveryPackageId =
  'agent-package-local-v18-8-resilient-studio-session-recovery';
const localRenderableRailwayStudioPackageId = 'agent-package-local-v18-9-renderable-railway-studio';
const localStudioOwnedWorkspaceShellPackageId =
  'agent-package-local-v19-0-studio-owned-workspace-shell';
const localClientScopedCodexChatsPackageId = 'agent-package-local-v19-1-client-scoped-codex-chats';
const localWorkspaceHostedEditorShellPackageId =
  'agent-package-local-v19-2-workspace-hosted-editor-shell';
const localLiveCodexLauncherRecoveryPackageId =
  'agent-package-local-v19-3-live-codex-launcher-recovery';
const localLockedWorkspaceDevDependenciesPackageId =
  'agent-package-local-v19-4-locked-workspace-dev-dependencies';
const localReliableWorkspaceDevelopmentSurfacesPackageId =
  'agent-package-local-v19-5-reliable-workspace-development-surfaces';
const localOpaqueWorkspaceFrameCapabilityPackageId =
  'agent-package-local-v19-6-opaque-workspace-frame-capability';
const localNextCompatibleWorkspaceRuntimePackageId =
  'agent-package-local-v19-7-next-compatible-workspace-runtime';
const localExecutableNextWorkspaceRuntimePackageId =
  'agent-package-local-v19-8-executable-next-workspace-runtime';
const localOwnerApiCreditsSwitchPackageId = 'agent-package-local-v19-9-owner-api-credits-switch';
const localDeployedStudioShellPackageId = 'agent-package-local-v20-0-deployed-studio-shell';
const localCanonicalWorkspaceEntryPackageId = 'agent-package-local-v20-1-canonical-workspace-entry';
const localWorkspaceDevelopmentStudioPackageId =
  'agent-package-local-v20-2-workspace-development-studio';
const localRestoredCodexVoiceExperiencePackageId =
  'agent-package-local-v20-3-restored-codex-voice-experience';
const localPersistentCodexChatSurfacesPackageId =
  'agent-package-local-v20-4-persistent-codex-chat-surfaces';
const localSelectedCodexExcerptActionsPackageId =
  'agent-package-local-v20-5-selected-codex-excerpt-actions';
const localCodexPhoneNotificationsPackageId = 'agent-package-local-v20-6-codex-phone-notifications';
const localBranchableCodexConversationsPackageId =
  'agent-package-local-v20-7-branchable-codex-conversations';
const localLiveWorkspaceCodexBranchingPackageId =
  'agent-package-local-v20-8-live-workspace-codex-branching';
const localLiveWorkspacePhoneNotificationsPackageId =
  'agent-package-local-v20-9-live-workspace-phone-notifications';
const localNaturalCodexReadingPackageId = 'agent-package-local-v21-0-natural-codex-reading';
const localFocusedCodexSettingsPackageId = 'agent-package-local-v21-1-focused-codex-settings';
const localConciseCodexReadingPackageId = 'agent-package-local-v21-2-concise-codex-reading';
const localDevelopmentReleaseUrlsPackageId = 'agent-package-local-v21-3-development-release-urls';
const localResilientLiveCodexBranchingPackageId =
  'agent-package-local-v21-4-resilient-live-codex-branching';
const localStoppableCodexTurnsPackageId = 'agent-package-local-v21-5-stoppable-codex-turns';
const localClientUrlReleaseContractPackageId =
  'agent-package-local-v21-6-client-url-release-contract';
const localRevocableReadyClientReviewsPackageId =
  'agent-package-local-v21-7-revocable-ready-client-reviews';
const localReliableCodexStopStatePackageId = 'agent-package-local-v21-8-reliable-codex-stop-state';
const localDedicatedClientWebsiteEditorPackageId =
  'agent-package-local-v21-9-dedicated-client-website-editor';
const localResilientDevelopmentStudioRuntimePackageId =
  'agent-package-local-v22-0-resilient-development-studio-runtime';
const localFocusedProspectPreviewModesPackageId =
  'agent-package-local-v22-1-focused-prospect-preview-modes';
const localReliableCodexEphemeralThreadsPackageId =
  'agent-package-local-v22-2-reliable-codex-ephemeral-threads';
const localResumeAwareCodexProgressPackageId =
  'agent-package-local-v22-3-resume-aware-codex-progress';
const localQueueableWorkingCodexMessagesPackageId =
  'agent-package-local-v22-4-queueable-working-codex-messages';
const localResponsiveDevelopmentRuntimePackageId =
  'agent-package-local-v22-5-responsive-development-runtime';
const localExactEditedSiteReleasePackageId = 'agent-package-local-v22-6-exact-edited-site-release';
const localUnambiguousWebsiteEditingPackageId =
  'agent-package-local-v22-7-unambiguous-website-editing';
const localEditorOnlyClientChatScopePackageId =
  'agent-package-local-v22-8-editor-only-client-chat-scope';
const localCodexConversationStatusIndicatorsPackageId =
  'agent-package-local-v22-9-codex-conversation-status-indicators';
const localContextualQuickQuestionsPackageId =
  'agent-package-local-v23-0-contextual-auto-read-quick-questions';
const localSeamlessStudioResumePackageId = 'agent-package-local-v23-1-seamless-studio-resume';
const localConfiguredFinalEditUpstreamPackageId =
  'agent-package-local-v23-2-configured-final-edit-upstream';
const localGeneratedNextEnvironmentHygienePackageId =
  'agent-package-local-v23-3-generated-next-environment-hygiene';
const localPersistentCodexPreferencesPackageId =
  'agent-package-local-v23-4-persistent-codex-preferences';
const localReliableNextWebsitePreviewPackageId =
  'agent-package-local-v23-5-reliable-next-website-preview';
const localAutomaticCodexUpdatesPackageId = 'agent-package-local-v23-6-automatic-codex-updates';
const localCodexUpdateCheckerPackageId = 'agent-package-local-v23-7-codex-update-checker';
const localOwnerOnlyWebsiteCodexPackageId = 'agent-package-local-v23-8-owner-only-website-codex';
const localAuthenticatedWebsiteCodexEmbedPackageId =
  'agent-package-local-v23-9-authenticated-website-codex-embed';
const localAstraReadyCodexRuntimePackageId = 'agent-package-local-v24-0-astra-ready-codex-runtime';
const localReliableNewCodexChatPackageId = 'agent-package-local-v24-1-reliable-new-codex-chat';
const localRestorableManagedCodexChatsPackageId =
  'agent-package-local-v24-2-restorable-managed-codex-chats';
const localDurableNewCodexChatPackageId = 'agent-package-local-v24-3-durable-new-codex-chat';
const localConciseCurrentWorkChatTitlesPackageId =
  'agent-package-local-v24-4-concise-current-work-chat-titles';
const localExplicitWebsiteEditVersionStatusPackageId =
  'agent-package-local-v24-5-explicit-website-edit-version-status';
const localRecoverStaleEmptyCodexChatPackageId =
  'agent-package-local-v24-6-recover-stale-empty-codex-chat';
const localRecentRequestChatContextPackageId =
  'agent-package-local-v24-7-recent-request-chat-context';
const localResilientWebsiteCodexResumePackageId =
  'agent-package-local-v24-8-resilient-website-codex-resume';
const localClientPreviewCodexIsolationPackageId =
  'agent-package-local-v25-0-client-preview-codex-isolation';
const localImmediateWebsiteCodexOpenPackageId =
  'agent-package-local-v25-1-immediate-website-codex-open';
const localAutomaticClientEmailHandoffPackageId =
  'agent-package-local-v24-9-automatic-client-email-handoff';
const localVisibleChatGptCreditsPackageId = 'agent-package-local-v29-1-visible-chatgpt-credits';
const localPurposeAwareCodexBranchingPackageId =
  'agent-package-local-v29-2-purpose-aware-codex-branching';
const localContextAwareChatTitlesAndStatesPackageId =
  'agent-package-local-v29-3-context-aware-chat-titles-and-states';
const localRetrospectiveChatContextPackageId =
  'agent-package-local-v29-4-retrospective-chat-context';
const localValidatedCodexBranchActionsPackageId =
  'agent-package-local-v29-5-validated-codex-branch-actions';
const localExpandedChatDropdownTitlesPackageId =
  'agent-package-local-v29-6-expanded-chat-dropdown-titles';
const localRecoverableQuoteExpiryPackageId = 'agent-package-local-v29-7-recoverable-quote-expiry';
const localInterpretedChatDropdownTitlesPackageId =
  'agent-package-local-v29-8-interpreted-chat-dropdown-titles';
const localPolishedDevicePreviewToolbarPackageId =
  'agent-package-local-v29-9-polished-device-preview-toolbar';
const localPinnedTaggedCodexChatsPackageId = 'agent-package-local-v30-0-pinned-tagged-codex-chats';
const localFeatureReleaseManagementPackageId =
  'agent-package-local-v30-1-feature-release-management';
const localManualCodexUpdateRecoveryPackageId =
  'agent-package-local-v30-2-manual-codex-update-recovery';
const localCompactCodexChatChromePackageId = 'agent-package-local-v30-3-compact-codex-chat-chrome';
const localAiInterpretedChatTitlesPackageId =
  'agent-package-local-v30-4-ai-interpreted-chat-titles';
const localManagedFeatureWordingPackageId = 'agent-package-local-v30-5-managed-feature-wording';
const localVisibleFeatureReleaseStatusPackageId =
  'agent-package-local-v30-6-visible-feature-release-status';
const localDurableAiChatTitlesPackageId = 'agent-package-local-v30-7-durable-ai-chat-titles';
const localProductReleaseOverviewPackageId = 'agent-package-local-v30-8-product-release-overview';
const localLeceEmailAndQuoteRecoveryPackageId =
  'agent-package-local-v30-9-lece-email-and-quote-recovery';
const localReliableFeatureLedgerPackageId = 'agent-package-local-v31-0-reliable-feature-ledger';
const localChatFeatureHistoryPackageId = 'agent-package-local-v31-1-chat-feature-history';
const localMultiFeatureChatLineagePackageId =
  'agent-package-local-v31-2-multi-feature-chat-lineage';
const localActionableReleasePipelinePackageId =
  'agent-package-local-v31-3-actionable-release-pipeline';
const localAutomaticFeatureDevelopmentReleasePackageId =
  'agent-package-local-v31-4-automatic-feature-development-release';
const localUninterruptedStudioChatPackageId = 'agent-package-local-v31-5-uninterrupted-studio-chat';
const localAccurateFeatureTitlesPackageId =
  'agent-package-local-v31-6-accurate-feature-and-chat-titles';
const localClientspaceQuoteReconfirmationPackageId =
  'agent-package-local-v31-7-clientspace-quote-reconfirmation';
const localClientspaceDevelopmentQuoteReconfirmationPackageId =
  'agent-package-local-v31-8-clientspace-development-quote-reconfirmation';
const localAutomaticClientspaceHomepageCapturePackageId =
  'agent-package-local-v31-9-automatic-clientspace-homepage-capture';
const localAnimatedClientspaceHomepagePreviewPackageId =
  'agent-package-local-v32-0-animated-clientspace-homepage-preview';
const localPersistedAnimatedHomepagePreviewPackageId =
  'agent-package-local-v32-1-persisted-animated-homepage-preview';
const localSmoothHomepagePreviewLoopPackageId =
  'agent-package-local-v32-2-smooth-homepage-preview-loop';
const localReliableSmoothHomepageCapturePackageId =
  'agent-package-local-v32-3-reliable-smooth-homepage-capture';
const localLiveAnimatedHomepageCapturePackageId =
  'agent-package-local-v32-4-live-animated-homepage-capture';
const localHeroAnimatedHomepageCapturePackageId =
  'agent-package-local-v32-5-hero-animated-homepage-capture';
const localRehearsalIntroductionResetPackageId =
  'agent-package-local-v32-6-rehearsal-introduction-reset';
const localReconciledIntroductionReceiptPackageId =
  'agent-package-local-v32-7-reconciled-introduction-receipt';
const localPrioritisedIntroductionStatusPackageId =
  'agent-package-local-v32-8-prioritised-introduction-status';
const localDirectReplyComparisonIntroductionPackageId =
  'agent-package-local-v32-9-direct-reply-comparison-introduction';
const localTruthfulLiveCodexProgressPackageId =
  'agent-package-local-v33-0-truthful-live-codex-progress';
const localInstantCachedCodexAccessPackageId =
  'agent-package-local-v33-1-instant-cached-codex-access';
const localPairedDeviceComparisonEmailPackageId =
  'agent-package-local-v33-2-paired-device-comparison-email';
const localEmailSafePairedComparisonPackageId =
  'agent-package-local-v33-3-email-safe-paired-comparison';
const localPasswordlessClientspaceAccessPackageId =
  'agent-package-local-v33-4-passwordless-clientspace-access';
const localDesktopOnlyComparisonEmailPackageId =
  'agent-package-local-v33-5-desktop-only-comparison-email';
const localResponsiveSplitComparisonEmailPackageId =
  'agent-package-local-v33-6-responsive-split-comparison-email';
const localCompatibleIntroductionLedgerPackageId =
  'agent-package-local-v33-7-compatible-introduction-ledger';
const localRecoverableWebsiteCodexAccessPackageId =
  'agent-package-local-v33-8-recoverable-website-codex-access';
const localContinuousFeatureReleaseReconciliationPackageId =
  'agent-package-local-v33-9-continuous-feature-release-reconciliation';
const localPersistentWebsiteCodexPanelPackageId =
  'agent-package-local-v34-0-persistent-website-codex-panel';
const localResponsiveComparisonReviewPackageId =
  'agent-package-local-v34-1-responsive-comparison-review';
const localConciseClientspaceAccessPackageId =
  'agent-package-local-v34-2-concise-clientspace-access';
const localReliableComparisonReviewEmailPackageId =
  'agent-package-local-v34-3-reliable-comparison-review-email';
const localLiveSynchronizedComparisonPackageId =
  'agent-package-local-v34-4-live-synchronized-comparison';
const localInteractiveDeviceComparisonPackageId =
  'agent-package-local-v34-5-interactive-device-comparison';
const localPolishedWebsiteCodexRecoveryPackageId =
  'agent-package-local-v34-6-polished-website-codex-recovery';
const localProxySafeLiveComparisonPackageId =
  'agent-package-local-v34-7-proxy-safe-live-comparison';
const localCompactChatFeatureHistoryPackageId =
  'agent-package-local-v34-8-compact-chat-feature-history';
const localExactRedesignComparisonPackageId = 'agent-package-local-v34-9-exact-redesign-comparison';
const localSimplifiedWebsiteReviewPackageId = 'agent-package-local-v35-0-simplified-website-review';
const localResponsivePreviewLaunchPackageId = 'agent-package-local-v35-1-responsive-preview-launch';
const localEvidenceLedHomepagePackageId =
  'agent-package-local-v35-2-evidence-led-homepage-art-direction';
const localInspectEmailReplyCtaPackageId = 'agent-package-local-v35-3-inspect-email-reply-cta';
const localRailwayOnlyProductReleasesPackageId =
  'agent-package-local-v35-4-railway-only-product-releases';
const localReliableCodexQueueHandoffPackageId =
  'agent-package-local-v35-8-reliable-codex-queue-handoff';

type StoreName =
  | 'activities'
  | 'audits'
  | 'auditObservations'
  | 'auditSpecialistTasks'
  | 'artifacts'
  | 'businesses'
  | 'buildManifests'
  | 'builderRuns'
  | 'briefs'
  | 'concepts'
  | 'contacts'
  | 'crawlPages'
  | 'crawlRuns'
  | 'facts'
  | 'meta'
  | 'outreachCompliance'
  | 'reports'
  | 'reportVersions'
  | 'sourceReleaseAttestations'
  | 'tasks'
  | 'taxExpenses'
  | 'websites';

type MetaRecord = { id: string; value: string };

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionResult(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      const upgradeTransaction = request.transaction;
      if (!upgradeTransaction) throw new Error('Unable to initialise Made Solid Studio storage.');
      (
        [
          'businesses',
          'buildManifests',
          'builderRuns',
          'briefs',
          'websites',
          'contacts',
          'crawlRuns',
          'crawlPages',
          'artifacts',
          'facts',
          'audits',
          'auditObservations',
          'auditSpecialistTasks',
          'concepts',
          'reports',
          'reportVersions',
          'sourceReleaseAttestations',
          'tasks',
          'taxExpenses',
          'activities',
          'meta',
          'outreachCompliance',
        ] as StoreName[]
      ).forEach((name) => {
        const store = database.objectStoreNames.contains(name)
          ? upgradeTransaction.objectStore(name)
          : database.createObjectStore(name, { keyPath: 'id' });
        if (
          name !== 'businesses' &&
          name !== 'meta' &&
          name !== 'taxExpenses' &&
          !store.indexNames.contains('businessId')
        ) {
          store.createIndex('businessId', 'businessId');
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open Made Solid Studio storage.'));
  });
}

function domainFromUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).hostname.replace(/^www\./, '');
}

export function canonicalWebsiteUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.host.toLowerCase()}${path}`;
}

function displayName(domain: string) {
  return domain
    .split('.')[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export class SiteforgeRepository {
  private databasePromise?: Promise<IDBDatabase>;
  private bootstrapPromise?: Promise<void>;

  private database() {
    this.databasePromise ??= openDatabase();
    return this.databasePromise;
  }

  private async get<T>(storeName: StoreName, key: string) {
    const database = await this.database();
    const transaction = database.transaction(storeName, 'readonly');
    const record = await requestResult(transaction.objectStore(storeName).get(key));
    return record as T | undefined;
  }

  private async getAll<T>(storeName: StoreName) {
    const database = await this.database();
    const transaction = database.transaction(storeName, 'readonly');
    const records = await requestResult(transaction.objectStore(storeName).getAll());
    return records as T[];
  }

  async getBuilderPreferences(): Promise<BuilderPreferences> {
    const record = await this.get<MetaRecord>('meta', localBuilderPreferencesKey);
    if (!record) return defaultBuilderPreferences();
    try {
      return normalizeBuilderPreferences(JSON.parse(record.value));
    } catch {
      return defaultBuilderPreferences();
    }
  }

  async saveBuilderPreferences(preferences: BuilderPreferences): Promise<BuilderPreferences> {
    const saved = {
      ...normalizeBuilderPreferences(preferences),
      updatedAt: new Date().toISOString(),
    };
    await this.put('meta', {
      id: localBuilderPreferencesKey,
      value: JSON.stringify(saved),
    } satisfies MetaRecord);
    return saved;
  }

  private async getAllForBusiness<T>(
    storeName: Exclude<StoreName, 'businesses' | 'meta'>,
    businessId: string,
  ) {
    const database = await this.database();
    const transaction = database.transaction(storeName, 'readonly');
    const records = await requestResult(
      transaction.objectStore(storeName).index('businessId').getAll(businessId),
    );
    return records as T[];
  }

  private async put<T>(storeName: StoreName, record: T) {
    const database = await this.database();
    const transaction = database.transaction(storeName, 'readwrite');
    const completed = transactionResult(transaction);
    transaction.objectStore(storeName).put(record);
    await completed;
  }

  private async putMany(entries: Array<[StoreName, object]>) {
    const database = await this.database();
    const transaction = database.transaction(
      [...new Set(entries.map(([storeName]) => storeName))],
      'readwrite',
    );
    const completed = transactionResult(transaction);
    entries.forEach(([storeName, record]) => transaction.objectStore(storeName).put(record));
    await completed;
  }

  private async deleteRecord(storeName: StoreName, id: string) {
    const database = await this.database();
    const transaction = database.transaction(storeName, 'readwrite');
    const completed = transactionResult(transaction);
    transaction.objectStore(storeName).delete(id);
    await completed;
  }

  async bootstrap() {
    this.bootstrapPromise ??= this.bootstrapStorage();
    return this.bootstrapPromise;
  }

  async listTaxExpenses() {
    return (await this.getAll<TaxExpense>('taxExpenses')).sort(
      (left, right) =>
        right.incurredOn.localeCompare(left.incurredOn) ||
        right.createdAt.localeCompare(left.createdAt),
    );
  }

  async createTaxExpense(input: TaxExpenseInput) {
    const timestamp = new Date().toISOString();
    const expense: TaxExpense = {
      ...input,
      id: id('tax-expense'),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.put('taxExpenses', expense);
    return expense;
  }

  async updateTaxExpense(expenseId: string, input: TaxExpenseInput) {
    const existing = await this.get<TaxExpense>('taxExpenses', expenseId);
    if (!existing) throw new Error('The expense no longer exists.');
    const expense: TaxExpense = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await this.put('taxExpenses', expense);
    return expense;
  }

  async deleteTaxExpense(expenseId: string) {
    await this.deleteRecord('taxExpenses', expenseId);
  }

  private async bootstrapStorage() {
    const migrated = await this.get<MetaRecord>('meta', 'legacy-local-storage-v2');
    if (!migrated) {
      await this.migrateLegacyRecords();
      await this.put('meta', {
        id: 'legacy-local-storage-v2',
        value: 'complete',
      } satisfies MetaRecord);
    }

    if ((await this.listBusinesses()).length === 0) {
      await this.seedDemoWorkspace();
    }
    const localPackageRecord = await this.get<MetaRecord>('meta', localAgentPackageKey);
    const packageCreatedAt = new Date().toISOString();
    const localPublishedPackage: AgentPackage = {
      id: 'agent-package-local-v6',
      version: 6,
      status: 'published',
      builderContractVersion: 'made-solid-studio-builder-agent-v6.0',
      foundationVersion: 'made-solid-studio-next-builder-v2',
      foundationChecksum: 'local-source-controlled-foundation',
      contractAddendum: '',
      instructionsAddendum: '',
      summary:
        'Next.js App Router production builder with generated design systems, typed components, runtime profiles, and enforced framework quality gates.',
      capabilityAssessment: 'foundation_change_required',
      stagedBehaviourIds: [
        'motion-runtime',
        'scoped-revision',
        'brand-introduction',
        'hero-handoff',
        'responsive-sidebar',
        'contextual-logo-selection',
        'visual-content-recovery',
        'site-navigation-architecture',
        'next-component-architecture',
        'runtime-profiles',
        'framework-quality-gates',
      ],
      createdAt: packageCreatedAt,
      updatedAt: packageCreatedAt,
      publishedAt: packageCreatedAt,
    };
    const localCreativePackage: AgentPackage = {
      ...localPublishedPackage,
      id: localCreativePackageId,
      version: 6.1,
      status: 'test_ready',
      basePackageId: localPublishedPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.1',
      contractAddendum:
        'Use content-led responsive composition for prominent repeated groups. Number only genuine sequences, and treat editorial layouts, grids, horizontal rails, accessible non-rotating carousels, disclosure, and expressive typography as choices driven by the content and approved brand.',
      instructionsAddendum:
        'Before implementing a prominent repeated group, distinguish real order, item count and length, comparison needs, and browsing needs. Do not default to numbered cards or mobile vertical stacks. Use the locked word, stagger, directional, scale, fade, and factual-counter motion vocabulary where it supports the chosen composition.',
      summary:
        'Creative composition test package: content-led responsive layouts, intentional motion, page-based navigation, and accessible browsing treatments without testimonial-specific templates.',
      capabilityAssessment: 'policy_only',
      stagedBehaviourIds: [
        'next-component-architecture',
        'motion-runtime',
        'site-navigation-architecture',
      ],
      createdAt: packageCreatedAt,
      updatedAt: packageCreatedAt,
      publishedAt: undefined,
    };
    const localExpressivePackage: AgentPackage = {
      ...localCreativePackage,
      id: localExpressivePackageId,
      version: 6.2,
      basePackageId: localCreativePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.2',
      contractAddendum:
        'Choreograph readable enter and exit motion for compact navigation, sequence its approved logo, routes, and actions, and compose heroes and later sections from multiple related motion beats. Establish deliberate display/body typography and consistent relationship spacing. Use only suitably resolved approved images with stable responsive dimensions and correct eager or lazy loading.',
      instructionsAddendum:
        'Animate the compact surface fully out and in with smooth decelerating easing and sequential navigation items. Do not animate only the hero title: stage its supporting copy, actions, media, later section content, and a related group. Give service routes a page-specific composition, document typography and spacing choices, never upscale low-resolution assets, and implement stable responsive image loading.',
      summary:
        'Expressive craft test package: readable navigation choreography, multi-element page motion, deliberate typography and spacing rhythm, distinctive service routes, and quality-aware responsive imagery.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Turns the Test 25 review into enforceable motion, typography, route-composition, and image-loading evidence while preserving accessibility and reduced-motion behaviour.',
      stagedBehaviourIds: [
        'responsive-sidebar',
        'motion-runtime',
        'next-component-architecture',
        'framework-quality-gates',
      ],
    };
    const localResilientQualityPackage: AgentPackage = {
      ...localExpressivePackage,
      id: localResilientQualityPackageId,
      version: 6.3,
      basePackageId: localExpressivePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.3',
      contractAddendum:
        'Treat a transient compact-navigation pointer timeout as a quality-verification retry, not an immediate build failure. Retry the real pointer interaction once after restoring stable viewport geometry; if it still cannot be activated, retain the generated preview and record a quality-review finding.',
      instructionsAddendum:
        'Responsive verification must distinguish a broken generated interaction from a transient browser actionability timeout. Preserve mouse-based coverage, retry once without bypassing hit testing, and continue the remaining evidence capture when the interaction becomes a review finding.',
      summary:
        'Resilient quality test package: retries transient mobile-navigation pointer checks and preserves valid generated previews as reviewable output instead of misclassifying them as failed builds.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Corrects the browser-quality failure boundary while retaining genuine pointer interaction coverage and all existing responsive checks.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localImmersiveMotionPackage: AgentPackage = {
      ...localResilientQualityPackage,
      id: localImmersiveMotionPackageId,
      version: 6.4,
      basePackageId: localResilientQualityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.4',
      contractAddendum:
        'Use slower smooth decelerating motion, sequentially reveal meaningful stacked text, and add reversible scroll-responsive depth where a bounded container supports it. On every route, introduce the approved logo on the loading surface, transfer its clone to the measured header-logo position, remove the loading surface, and only then release the first page reveal.',
      instructionsAddendum:
        'Build text stacks with stable semantic gap tokens and data-reveal="sequence" in reading order. Use data-scroll-zoom on at least one bounded container per route so the surface expands in view, shrinks away from view, and its direct children counter-scale. Keep the locked route transition as the only loader and never animate page content behind it.',
      summary:
        'Immersive motion test package: slower sequential reveals, reversible container depth, consistent stack spacing, and an every-route approved-logo loading handoff into the navigation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Coordinates route loading, logo transfer, page-reveal timing, sequential text rhythm, and reversible scroll depth while preserving reduced-motion behaviour.',
      stagedBehaviourIds: [
        'brand-introduction',
        'motion-runtime',
        'next-component-architecture',
        'framework-quality-gates',
      ],
    };
    const localResilientResumePackage: AgentPackage = {
      ...localImmersiveMotionPackage,
      id: localResilientResumePackageId,
      version: 6.5,
      basePackageId: localImmersiveMotionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.5',
      contractAddendum:
        'Treat saved checkpoints as generated source only. On every resumed test, reapply the current protected foundation before verification. A stopped test keeps its frozen diagnostic draft openable and must not prevent the tester from starting a different package or page test.',
      instructionsAddendum:
        'Resume useful generated components and pages, but never restore a checkpoint copy over the locked foundation. Preserve failed and cancelled output as private diagnostic history while allowing independent tests to continue.',
      summary:
        'Resilient resume test package: refreshes the protected foundation before resumed verification and keeps stopped drafts available without blocking other tests.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Separates recoverable generated source from the current locked runtime and makes failure recovery non-blocking in Agent Studio Testing.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localMeaningfulPageNamesPackage: AgentPackage = {
      ...localResilientResumePackage,
      id: localMeaningfulPageNamesPackageId,
      version: 6.6,
      basePackageId: localResilientResumePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.6',
      contractAddendum:
        'Give every generated route and internal link a concise visitor-facing name derived from approved page content. Replace placeholders such as Blank, Unnamed page, Untitled, New page, Placeholder, and raw path labels such as /blank without changing assigned route or evidence paths.',
      instructionsAddendum:
        'Use the page dossier to name metadata, the H1, navigation links, breadcrumbs, cards, and contextual links consistently. A weak source label may be rewritten, but the new name cannot invent a service, location, qualification, or promise.',
      summary:
        'Meaningful page names test package: replaces unnamed, blank, placeholder, and raw-path visitor labels with supported content-derived page and link names.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Makes generated information architecture readable even when captured CMS page names are missing or malformed, while preserving immutable route evidence.',
      stagedBehaviourIds: ['site-navigation-architecture', 'framework-quality-gates'],
    };
    const localCleanTestStartPackage: AgentPackage = {
      ...localMeaningfulPageNamesPackage,
      id: localCleanTestStartPackageId,
      version: 6.7,
      basePackageId: localMeaningfulPageNamesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.7',
      contractAddendum:
        'Starting a test from the package and page chooser always creates a clean new worker run. A failed or cancelled run may be resumed only through its explicit Continue this test action.',
      instructionsAddendum:
        'Do not infer resume intent from matching package, page, direction, or manifest values. Preserve the stopped run and frozen draft as history while the newly requested test receives its own run identifier.',
      summary:
        'Clean test start package: Test something else always creates a new run, while only Continue this test resumes stopped source.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Separates explicit continuation from new-test intent so a failed run cannot silently capture the next test request.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localPreciseLogoHandoffPackage: AgentPackage = {
      ...localCleanTestStartPackage,
      id: localPreciseLogoHandoffPackageId,
      version: 6.8,
      basePackageId: localCleanTestStartPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.8',
      contractAddendum:
        'Every route loading transition must stabilise the destination header at the top of the incoming page before measuring its approved logo. Animate the cloned loading mark from a top-left transform origin to that exact measured box, then reveal the real navigation logo without a visible jump.',
      instructionsAddendum:
        'Reset retained route scroll before the handoff, allow header scroll state to settle for two animation frames, and keep the destination header visible and undisplaced during measurement. Restore normal scrolling only after the loading mark has landed and the transition is complete.',
      summary:
        'Precise logo handoff test package: resets retained route scroll, exposes the final navigation position before measurement, and lands the loading logo exactly on its real navigation mark.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Corrects route-loading logo geometry so the mark cannot shoot toward a scroll-hidden header or finish offset from the navigation logo.',
      stagedBehaviourIds: ['brand-introduction', 'framework-quality-gates'],
    };
    const localValidPreviewEntryPackage: AgentPackage = {
      ...localPreciseLogoHandoffPackage,
      id: localValidPreviewEntryPackageId,
      version: 6.9,
      basePackageId: localPreciseLogoHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v6.9',
      contractAddendum:
        'Opening a completed page or page-set test must enter through the first selected generated route. Do not assume that index.html is a valid landing page when the homepage was outside the test scope.',
      instructionsAddendum:
        'Resolve the first target source URL through the immutable Build Manifest publicPath and append that route to both deployed-host and edge-function preview capabilities. Retain the capability root for assets and internal navigation.',
      summary:
        'Valid preview entry test package: opens non-homepage tests on their first generated page instead of an unrelated framework not-found document at the capability root.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Makes every completed test directly viewable even when its selected page set intentionally excludes the homepage.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localResponsiveIntroCraftPackage: AgentPackage = {
      ...localValidPreviewEntryPackage,
      id: localResponsiveIntroCraftPackageId,
      version: 7,
      basePackageId: localValidPreviewEntryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.0',
      contractAddendum:
        'Treat compact-logo alignment as an explicit composition choice: flow alignment is valid, while a declared centred logo must be geometrically centred to the viewport independent of unequal side controls. Fit concise two-to-four-item mobile groups when swiping adds no value, while retaining horizontal browsing for genuinely dense, numerous, media-led, or comparison content. Style every visible scrollbar with accessible brand-connected track and thumb states. Use the logo’s exact contrasting header surface for the server-rendered loading cover, and release hero motion only after the slow eased logo handoff completes.',
      instructionsAddendum:
        'Annotate the marked header logo with data-siteforge-compact-logo-alignment="center" or "flow" and data-siteforge-intro-surface. If centred, verify its box centre against the viewport at 320, 375, and 768 pixels. Review every mobile horizontal rail against item count, density, and readable fitted width; keep a rail only when browsing materially helps. Define scrollbar-color, scrollbar-width, and matching WebKit track/thumb hover and active styles from semantic tokens. Do not add another loader or animate the hero behind the protected loading cover.',
      summary:
        'Responsive intro craft test package: honest compact-logo alignment, content-led mobile fitting, polished accessible scrollbars, contrasting server-rendered brand loading, and a visible post-handoff hero entrance.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents offset “centred” mobile logos, unnecessary swipe rails for concise content, unstyled scrollbars, white-on-white loading marks, pre-loader page flashes, and hero reveals that finish behind the introduction.',
      stagedBehaviourIds: [
        'brand-introduction',
        'motion-runtime',
        'responsive-sidebar',
        'next-component-architecture',
        'framework-quality-gates',
      ],
    };
    const localImmediateBrandIntroductionPackage: AgentPackage = {
      ...localResponsiveIntroCraftPackage,
      id: localImmediateBrandIntroductionPackageId,
      version: 7.1,
      basePackageId: localResponsiveIntroCraftPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.1',
      contractAddendum:
        'Let the builder choose concise, brand-appropriate introduction copy instead of inheriting a generic loading sentence. Declare accessible message ink against the exact intro surface. Treat header and compact-navigation logos as immediate interface assets that are decoded before their first visible state.',
      instructionsAddendum:
        'Set data-siteforge-intro-copy, data-siteforge-intro-ink, and data-siteforge-intro-surface on the marked header logo. Prefer an approved slogan, otherwise use restrained evidence-grounded copy without inventing a claim. Load the intrinsically sized header logo eagerly with high fetch priority. Mark the drawer logo data-siteforge-navigation-logo and preload any distinct local drawer-logo source in the initial document through data-siteforge-navigation-logo-src. Verify refresh and first drawer open with an already decoded logo.',
      summary:
        'Immediate brand introduction test package: builder-chosen loading copy, guaranteed readable intro text, and preloaded header and drawer logos without first-open delay.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the fixed preparation sentence, safeguards message contrast, and prevents the approved logo appearing late on refresh or the first compact-navigation open.',
      stagedBehaviourIds: [
        'brand-introduction',
        'responsive-sidebar',
        'contextual-logo-selection',
        'framework-quality-gates',
      ],
    };
    const localEfficientBuilderExecutionPackage: AgentPackage = {
      ...localImmediateBrandIntroductionPackage,
      id: localEfficientBuilderExecutionPackageId,
      version: 7.2,
      basePackageId: localImmediateBrandIntroductionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.2',
      contractAddendum:
        'Keep private tests economical without weakening complete-build quality. Use the balanced GPT-5.6 Terra medium-reasoning profile for homepage and page-set tests, while retaining GPT-5.6 Sol high reasoning for whole-site revisions and full builds. Record the exact profile and official token-credit estimate with every Codex usage record.',
      instructionsAddendum:
        'Read each applicable contract once. Use Node.js, rg, sed, and sharp for bounded inspection; jq and ImageMagick are unavailable. Use no more than ten inspection commands before editing and never print a whole manifest, asset inventory, or unchanged tree. Format once before full verification. Run full verification at most twice and never repeat a passing run without source changes.',
      summary:
        'Efficient builder execution test package: balanced test-model routing, explicit credit attribution, bounded inspection, and no redundant full verification cycles.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Reduces avoidable test credits caused by unsupported tool probes, broad context dumps, excessive reasoning, and repeated unchanged verification while preserving stronger execution for complete builds.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localDecodedNavigationLogoPackage: AgentPackage = {
      ...localEfficientBuilderExecutionPackage,
      id: localDecodedNavigationLogoPackageId,
      version: 7.3,
      basePackageId: localEfficientBuilderExecutionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.3',
      contractAddendum:
        'Decode the real compact-navigation logo before releasing the drawer item choreography. The approved logo must lead the sequence, and route links must never animate while its image is still unavailable.',
      instructionsAddendum:
        'Mark the drawer logo with both data-siteforge-navigation-logo and the first data-sf-navigation-item. Preload any distinct local drawer source from the initial document through data-siteforge-navigation-logo-src. Keep the locked readiness choreography intact so the surface may enter immediately but its logo and routes wait for the mounted image to decode together.',
      summary:
        'Decoded navigation logo test package: prewarmed drawer assets and readiness-gated logo-first route choreography without late image pop-in.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents the compact-navigation links animating before the approved logo and removes the delayed logo pop-in on first menu open.',
      stagedBehaviourIds: ['responsive-sidebar', 'framework-quality-gates'],
    };
    const localCreativeAutonomyPackage: AgentPackage = {
      ...localDecodedNavigationLogoPackage,
      id: localCreativeAutonomyPackageId,
      version: 7.4,
      basePackageId: localDecodedNavigationLogoPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.4',
      contractAddendum:
        'Treat short subjective directions as outcome-level creative briefs. Independently create a coherent, page-specific art direction and execute it through expressive typography, distinctive composition, responsive depth, high-quality motion, and purposeful interaction rather than waiting for the member to enumerate techniques.',
      instructionsAddendum:
        'Infer the strongest fitting visual concept from the approved brand, page purpose, content, and assets. Required runtime hooks are the baseline, not the creative ceiling. Use custom page-owned React and CSS for coherent parallax, sticky narrative, scroll-linked transforms, layered or masked media, pointer-responsive ambient light, or other effects when they strengthen the concept. Select rather than stack effects, avoid conventional interchangeable sections, and provide performant reduced-motion fallbacks without adding dependencies.',
      summary:
        'Creative autonomy test package: decisive page-specific art direction, expressive typography, distinctive responsive composition, and custom high-quality motion from simple workspace prompts.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Lets a workspace member describe the desired outcome in one sentence while the builder independently supplies the design system, composition, typography, effects, and motion craft.',
      stagedBehaviourIds: [
        'motion-runtime',
        'next-component-architecture',
        'framework-quality-gates',
      ],
    };
    const localSelectedRouteCompilePackage: AgentPackage = {
      ...localCreativeAutonomyPackage,
      id: localSelectedRouteCompilePackageId,
      version: 7.5,
      basePackageId: localCreativeAutonomyPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.5',
      contractAddendum:
        'A page or page-set test compiles successfully when every selected manifest output path exists. The worker must not require a root index.html when the selected test scope intentionally excludes the homepage.',
      instructionsAddendum:
        'After production compilation, validate the exact outputPath for every staged source page and publish the first selected output as the private draft entry. Report a missing selected route by its path; never relabel a valid non-homepage export as a missing homepage.',
      summary:
        'Selected-route compile test package: accepts valid non-homepage page sets and validates every selected exported route instead of requiring an unrelated root homepage.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents successfully compiled page and page-set tests from failing merely because their selected scope did not include the homepage.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCompleteCheckpointRestorePackage: AgentPackage = {
      ...localSelectedRouteCompilePackage,
      id: localCompleteCheckpointRestorePackageId,
      version: 7.6,
      basePackageId: localSelectedRouteCompilePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.6',
      contractAddendum:
        'A resumable post-Codex checkpoint must restore every recorded source file at its recorded hash, including files inherited from the foundation when the current clean template no longer contains the same path or body.',
      instructionsAddendum:
        'Verify every template-inherited checkpoint entry against the prepared workspace. Recover a missing or changed entry from its immutable hash-addressed private source object before compilation, and save exact objects for every source entry when producing future validated checkpoints.',
      summary:
        'Complete checkpoint restore test package: recovers missing foundation-inherited source modules before compiling a saved post-Codex continuation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets a stopped test continue from its complete validated source without rerunning Codex or losing generated modules that originally matched its foundation.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localReliableCompactNavigationPackage: AgentPackage = {
      ...localCompleteCheckpointRestorePackage,
      id: localReliableCompactNavigationPackageId,
      version: 7.7,
      basePackageId: localCompleteCheckpointRestorePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.7',
      contractAddendum:
        'Compact navigation is inclusive through 768 CSS pixels and desktop navigation begins at 769 CSS pixels. Every dismissal path shares state closure and restores focus after the close commits. The locked runtime guarantees the breakpoint, full-height surface, Escape recovery, and navigation motion state.',
      instructionsAddendum:
        'Mark the desktop route list, backdrop, trigger, dialog, close control, logo, and sequenced items with their Siteforge hooks. Use one close function for Escape, backdrop, close-control, and route dismissal. Do not author locked navigation state classes. Browser evidence must wait for the brand-introduction handoff before capturing or exercising the page.',
      summary:
        'Reliable compact navigation test package: fixes the 768px tablet boundary, full-height side panels, Escape focus restoration, and intro-obscured browser evidence.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Moves the repeated v7.4 navigation failures into the protected foundation so generated sites cannot silently drop tablet navigation, strand keyboard focus, or capture the loading surface instead of the page.',
      stagedBehaviourIds: ['responsive-sidebar', 'framework-quality-gates'],
    };
    const localCheckpointQualityRecheckPackage: AgentPackage = {
      ...localReliableCompactNavigationPackage,
      id: localCheckpointQualityRecheckPackageId,
      version: 7.8,
      basePackageId: localReliableCompactNavigationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.8',
      contractAddendum:
        'A saved post-Codex checkpoint can be recompiled and browser-checked against the current protected foundation without generating the page again. The worker deterministically applies the reviewed primary and accent values to the shared brand tokens. Approved asset descriptors retain their reviewed role and reuse guidance, and page-matched approved worksite or project photography is a quality requirement.',
      instructionsAddendum:
        'Use the Siteforge navigation hooks and reviewed assets as before. For a content build, use at least one approved page-matched worksite or project photograph when one is staged and permitted. A quality recheck restores immutable source, reapplies locked runtime and reviewed palette tokens, compiles, captures all responsive evidence, and runs quality gates without invoking Codex.',
      summary:
        'Checkpoint repair and brand enforcement test package: rechecks saved generated source without Codex, guarantees compact navigation focus, readiness, and centring, applies reviewed palette tokens, and carries approved photo guidance.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Repairs and verifies an existing private page from its saved checkpoint in minutes, while preventing the generator from silently replacing reviewed colours or discarding approved worksite imagery.',
      stagedBehaviourIds: [
        'responsive-sidebar',
        'contextual-logo-selection',
        'framework-quality-gates',
      ],
    };
    const localStableNavigationVisibilityPackage: AgentPackage = {
      ...localCheckpointQualityRecheckPackage,
      id: localStableNavigationVisibilityPackageId,
      version: 7.9,
      basePackageId: localCheckpointQualityRecheckPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v7.9',
      contractAddendum:
        'Compact-navigation readiness remains stable across unrelated DOM updates while the drawer is open. Browser quality checks wait for every sequenced navigation item to become visibly rendered before accepting or capturing the open state.',
      instructionsAddendum:
        'Keep every compact-navigation route and action marked with data-sf-navigation-item. The protected runtime owns durable readiness; generated components must not reset or override its open and ready classes.',
      summary:
        'Stable navigation visibility test package: keeps animated drawer routes visible after live page updates and rejects open-state captures until every route is visibly rendered.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a drawer from passing structural checks while its route list is transparent, mid-animation, or repeatedly hidden by unrelated page updates.',
      stagedBehaviourIds: ['responsive-sidebar', 'framework-quality-gates'],
    };
    const localSettledAccessibilityPackage: AgentPackage = {
      ...localStableNavigationVisibilityPackage,
      id: localSettledAccessibilityPackageId,
      version: 8,
      basePackageId: localStableNavigationVisibilityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.0',
      contractAddendum:
        'Accessibility checks run against the settled visitor-visible page state after lazy sections and reveal motion have completed, preventing transient animation colours from being reported as final contrast failures.',
      instructionsAddendum:
        'Keep final-state colours conformant to WCAG 2.2 AA. The protected browser runner owns reveal settlement before axe analysis; generated code must still provide reduced-motion styles and accessible final colours.',
      summary:
        'Settled accessibility test package: evaluates final rendered colours after reveal motion while retaining responsive drawer visibility checks and saved-source repair.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Stops a valid repaired preview being held in review because axe sampled a partially transparent reveal frame instead of the final visitor-visible colours.',
      stagedBehaviourIds: ['responsive-sidebar', 'framework-quality-gates'],
    };
    const localDeterministicEvidencePackage: AgentPackage = {
      ...localSettledAccessibilityPackage,
      id: localDeterministicEvidencePackageId,
      version: 8.1,
      basePackageId: localSettledAccessibilityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.1',
      contractAddendum:
        'Responsive screenshots and accessibility analysis use the deterministic reduced-motion final state after lazy sections are revealed. Open-navigation interaction evidence returns to normal motion and still waits for every route to become visibly rendered.',
      instructionsAddendum:
        'Provide complete reduced-motion styles that expose the same content, layout, colour, and controls as the final motion-enabled state. Never use reduced motion to omit content or bypass interaction checks.',
      summary:
        'Deterministic final evidence test package: captures fully revealed page content, tests final-state contrast, and separately verifies normal and reduced-motion drawer interaction.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents full-page evidence from containing half-transparent sections and prevents axe from sampling an arbitrary transition frame.',
      stagedBehaviourIds: ['responsive-sidebar', 'framework-quality-gates'],
    };
    const localReusableSectionRhythmPackage: AgentPackage = {
      ...localDeterministicEvidencePackage,
      id: localReusableSectionRhythmPackageId,
      version: 8.2,
      basePackageId: localDeterministicEvidencePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.2',
      contractAddendum:
        'Generated pages define semantic section, heading, and copy relationship tokens and reuse SectionShell and SectionHeading components with observable rhythm hooks. Browser quality compares eyebrow-to-title gaps and section-end padding at every viewport. Scrollbar chrome uses neutral tokens rather than reviewed brand colours, and two distinct approved page photographs are required when two are available.',
      instructionsAddendum:
        'Define --space-section-block, --space-heading, --space-copy, --scrollbar-track, and --scrollbar-thumb. Use shared SectionShell and SectionHeading components with the required Siteforge hooks throughout the selected page. Keep equal relationships equal, retain at least 24px section-end clearance, use quiet neutral scrollbar colours, and place two distinct approved worksite or project photographs when available.',
      summary:
        'Reusable section rhythm test package: enforces shared spacing tokens and section components, consistent heading and section-end rhythm, neutral scrollbars, and meaningful use of approved photography.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Stops generated pages from hand-tuning repeated section spacing, crowding final copy against the next surface, using brand-red/blue scrollbars, or silently omitting available approved photography.',
      stagedBehaviourIds: ['next-component-architecture', 'framework-quality-gates'],
    };
    const localForcedFinalStatePackage: AgentPackage = {
      ...localReusableSectionRhythmPackage,
      id: localForcedFinalStatePackageId,
      version: 8.3,
      basePackageId: localReusableSectionRhythmPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.3',
      contractAddendum:
        'Responsive screenshots and accessibility analysis apply a protected final-state evidence class after reveal traversal. It forces generated reveal and scroll-depth elements to their fully visible settled geometry before evidence is sampled, then removes the class before normal-motion interaction checks.',
      instructionsAddendum:
        'Keep final-state colours and layout WCAG 2.2 AA conformant. Do not override the protected sf-quality-final-state visibility rules or depend on transition timing for factual content to become readable.',
      summary:
        'Forced final-state evidence test package: captures fully opaque settled sections for screenshots and accessibility while preserving separate normal-motion interaction checks.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents browser evidence from blending below-fold section colours with the page background while reveal transitions are resetting after the full-page traversal.',
      stagedBehaviourIds: ['motion-runtime', 'framework-quality-gates'],
    };
    const localSettledFactualEvidencePackage: AgentPackage = {
      ...localForcedFinalStatePackage,
      id: localSettledFactualEvidencePackageId,
      version: 8.4,
      basePackageId: localForcedFinalStatePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.4',
      contractAddendum:
        'Final-state evidence waits for any factual counter animation triggered during full-page traversal to reach its defined endpoint before applying the protected opaque evidence state, running accessibility analysis, or capturing screenshots.',
      instructionsAddendum:
        'Use data-counter only for supported factual metrics and keep its visible endpoint accurate. Browser evidence owns the bounded completion wait; do not lengthen factual counter animations or make their endpoint depend on viewport timing.',
      summary:
        'Settled factual evidence test package: captures the same completed metric values at mobile, tablet, and desktop instead of saving transition frames.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents responsive screenshots from showing different intermediate values for the same approved factual counter.',
      stagedBehaviourIds: ['motion-runtime', 'framework-quality-gates'],
    };
    const localImmediateNavigationSequencePackage: AgentPackage = {
      ...localSettledFactualEvidencePackage,
      id: localImmediateNavigationSequencePackageId,
      version: 8.5,
      basePackageId: localSettledFactualEvidencePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.5',
      contractAddendum:
        'Compact navigation begins its decoded logo reveal with the entering surface, starts the first route within 60ms, and bounds the remaining reading-order stagger. Protected browser checks reject delayed logo, route, or item sequences.',
      instructionsAddendum:
        'Use the locked compact-navigation choreography without adding independent delays. Keep the approved logo first, let it begin immediately, and follow with a short route and secondary-control sequence.',
      summary:
        'Immediate compact navigation test package: removes the empty-drawer pause while retaining decoded-logo ordering, responsive motion, and reduced-motion behaviour.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the mobile and tablet drawer respond immediately instead of showing its surface before the logo and links begin animating.',
      stagedBehaviourIds: ['responsive-sidebar'],
    };
    const localMobileViewportIntegrityPackage: AgentPackage = {
      ...localImmediateNavigationSequencePackage,
      id: localMobileViewportIntegrityPackageId,
      version: 8.6,
      basePackageId: localImmediateNavigationSequencePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.6',
      contractAddendum:
        'Compact navigation is locked to the logical leading edge without generated keyframe overrides or nested scrollbar chrome, and its decoded items become visible together with zero delay. Mobile browser checks require the complete hero proposition and primary action in the first viewport, reject clipped heading words, and verify every traversed image has positive intrinsic dimensions.',
      instructionsAddendum:
        'Mark hero, heading, primary action, and media with the required Siteforge hero hooks. At 320×568 and 375×812 place the proposition and primary action before supporting media, size display type against the longest word, keep the complete heading and action in the first viewport, and do not add navigation item animations, right anchoring, or drawer scrollbar styling.',
      summary:
        'Mobile viewport integrity test package: fixes left-edge drawer motion, removes nested navigation scrollbar chrome and delayed items, verifies loaded images, and keeps the mobile hero proposition and action above the fold.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents compact navigation entering from the wrong side or appearing empty, and stops oversized mobile hero media or type from clipping the proposition and hiding its primary action.',
      stagedBehaviourIds: [
        'responsive-sidebar',
        'next-component-architecture',
        'framework-quality-gates',
      ],
    };
    const localActionableBuilderFailurePackage: AgentPackage = {
      ...localMobileViewportIntegrityPackage,
      id: localActionableBuilderFailurePackageId,
      version: 8.7,
      basePackageId: localMobileViewportIntegrityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.7',
      contractAddendum:
        'The protected builder preserves the final structured Codex failure reason, classifies exhausted API credits separately from source or quality failures, and retains the complete private source checkpoint for an explicit resume after billing is restored.',
      instructionsAddendum:
        'Do not discard generated source when the model provider stops a run. Persist the structured provider failure, provide a specific recovery action, and resume from the saved checkpoint only after the external account condition has been corrected.',
      summary:
        'Actionable builder failure test package: exposes the real Codex provider failure and preserves generated source for a safe checkpoint resume.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a provider billing failure from appearing as an unexplained permanent website-generation failure or forcing completed route work to be discarded.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localBoundedBuilderRequestsPackage: AgentPackage = {
      ...localActionableBuilderFailurePackage,
      id: localBoundedBuilderRequestsPackageId,
      version: 8.8,
      basePackageId: localActionableBuilderFailurePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.8',
      contractAddendum:
        'Every protected builder storage and lifecycle request has a bounded deadline. A stalled artifact upload enters the existing retry and checkpoint recovery lifecycle instead of blocking worker heartbeats indefinitely. Checkpoint manifests use immutable content-hashed storage and a recorded file-count mismatch restores from immutable per-file source records rather than compiling a partial draft.',
      instructionsAddendum:
        'Bound protected storage requests, classify timeout and input-staging failures as temporary, verify checkpoint manifest file counts, and continue from the validated post-Codex source without another model pass after storage recovery.',
      summary:
        'Bounded builder request test package: prevents stalled protected requests from wedging a build and rejects stale partial checkpoint manifests.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a single unresponsive storage request from leaving a website build running without a heartbeat or terminal result.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localViewportChecksOnlyPackage: AgentPackage = {
      ...localBoundedBuilderRequestsPackage,
      id: localViewportChecksOnlyPackageId,
      version: 8.9,
      basePackageId: localBoundedBuilderRequestsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v8.9',
      contractAddendum:
        'Responsive quality verification runs each selected page in isolated mobile, tablet, and desktop browser contexts without generating, uploading, or retaining final viewport screenshots. The worker still checks rendered content, accessibility, console errors, navigation, overflow, touch targets, image readiness, first-viewport hero fit, focus restoration, and reduced motion.',
      instructionsAddendum:
        'Keep the required responsive hooks and accessible behaviour. Treat viewport execution as transient verification only: persist structured check results and diagnostics, but do not create screenshot artifacts or open-navigation image evidence.',
      summary:
        'Viewport checks only test package: retains responsive browser verification while removing final screenshot generation and storage.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Avoids generating hundreds of unnecessary final viewport images while retaining deterministic responsive and accessibility checks.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localRefinementHandoffPackage: AgentPackage = {
      ...localViewportChecksOnlyPackage,
      id: localRefinementHandoffPackageId,
      version: 9,
      basePackageId: localViewportChecksOnlyPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.0',
      contractAddendum:
        'Every completed source export is a complete local-development workspace containing the generated source, approved local assets, immutable Studio origin metadata, local-agent instructions, an append-only structured refinement ledger, and a private learning-bundle generator. Local refinements remain separate from production agent changes until an explicit reviewed distillation step.',
      instructionsAddendum:
        'Preserve a clean generated baseline, record meaningful verified corrections by root cause and enforcement strength, group repeated instances, and create a private learning bundle only at a reviewed milestone. Treat the finished local source as reference evidence; replay the immutable original manifest without copying the final site when evaluating an agent change.',
      summary:
        'Local refinement handoff test package: exports a complete editable workspace with approved assets and a structured, reviewable agent-learning ledger.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets completed websites move into local Git development while preserving a private, auditable path for strict regressions and flexible lessons to improve a later agent package without automatic production mutation.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAccentOnlyBrandPackage: AgentPackage = {
      ...localRefinementHandoffPackage,
      id: localAccentOnlyBrandPackageId,
      version: 9.1,
      basePackageId: localRefinementHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.1',
      contractAddendum:
        'A reviewed Brand Kit may explicitly be accent-only. Apply every available reviewed colour to its matching semantic token, never invent a missing primary brand colour, and derive accessible neutral, ink, surface, background, border, and state tokens.',
      instructionsAddendum:
        'Read the Brand Kit palette mode before creating tokens. When it is accent-only, preserve the reviewed accent exactly and build the remaining accessible colour system from derived neutrals rather than treating the accent as a fabricated primary.',
      summary:
        'Accent-only brand test package: preserves a sole reviewed accent colour without inventing a primary brand colour.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Supports brands whose only verified chromatic identity is an accent while retaining deterministic token enforcement and accessible derived neutrals.',
      stagedBehaviourIds: ['contextual-logo-selection'],
    };
    const localCodespaceWorkspacePackage: AgentPackage = {
      ...localAccentOnlyBrandPackage,
      id: localCodespaceWorkspacePackageId,
      version: 9.2,
      basePackageId: localAccentOnlyBrandPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.2',
      contractAddendum:
        'Every completed editable-source handoff includes a checked-in Codespace definition that installs locked dependencies and the official Codex tools, forwards the preview port, starts the website, and opens Codex without storing authentication credentials in source.',
      instructionsAddendum:
        'Keep Codespace startup reproducible and repository-owned. Authenticate Codex only through its supported cached browser login, CODEX_ACCESS_TOKEN, or OPENAI_API_KEY supplied as a Codespaces secret; never write a token or cached login into the generated repository.',
      summary:
        'Codespace editing workspace test package: opens a complete website-development environment with the site and Codex ready to use.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes manual workspace setup while preserving private credentials and the separation between Studio and the generated client repository.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localLogoAccentRegionsPackage: AgentPackage = {
      ...localCodespaceWorkspacePackage,
      id: localLogoAccentRegionsPackageId,
      version: 9.3,
      basePackageId: localCodespaceWorkspacePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.3',
      contractAddendum:
        "Generated black-with-accent and white-with-accent logo appearances preserve the source logo's distinct accent regions. A dominant connected primary shape must never recolour a smaller verified accent letter, word, or electrical symbol.",
      instructionsAddendum:
        'Use the approved accent logo appearances exactly as staged. Keep the non-accent portion black or white for its direct surface, and retain the source-owned accent only in the verified accent regions.',
      summary:
        'Logo accent-region test package: keeps only verified accent parts coloured in black-with-accent and white-with-accent logo versions.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a dominant connected logo shape from turning the whole generated logo into the accent colour while retaining clean soft edges.',
      stagedBehaviourIds: ['contextual-logo-selection'],
    };
    const localCodespaceStartupReliabilityPackage: AgentPackage = {
      ...localLogoAccentRegionsPackage,
      id: localCodespaceStartupReliabilityPackageId,
      version: 9.4,
      basePackageId: localLogoAccentRegionsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.4',
      contractAddendum:
        'Every generated Next.js editing workspace has an explicit npm development command before publication. Codespace setup exposes the official Codex installer location on PATH before startup tasks launch the website and Codex terminal.',
      instructionsAddendum:
        'Do not rely on the locked builder package to provide a development script. Add the deterministic Next.js dev command during the editable handoff, verify the checked-in Codespace and task files, and keep the Codex install directory on PATH.',
      summary:
        'Codespace startup reliability test package: guarantees the exported website and Codex terminal can launch in the editing workspace.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a published editing repository from opening without a runnable website command or discoverable Codex executable.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCodespaceSetupOrderingPackage: AgentPackage = {
      ...localCodespaceStartupReliabilityPackage,
      id: localCodespaceSetupOrderingPackageId,
      version: 9.5,
      basePackageId: localCodespaceStartupReliabilityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.5',
      contractAddendum:
        'Folder-open website and Codex tasks invoke one concurrency-safe, idempotent setup gate before either process starts. Setup completion is verified from the installed Next.js executable and Codex command rather than assumed from Codespaces lifecycle timing.',
      instructionsAddendum:
        'Do not assume postCreateCommand finishes before VS Code folder-open tasks. Serialize setup with a workspace cache lock, make both startup tasks call it, and launch the website or Codex only after their required executables are present.',
      summary:
        'Codespace setup-ordering test package: prevents website and Codex tasks from racing dependency installation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes automatic startup deterministic even when Codespaces attaches VS Code before post-create dependency installation completes.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localBuilderDerivedColoursPackage: AgentPackage = {
      ...localCodespaceSetupOrderingPackage,
      id: localBuilderDerivedColoursPackageId,
      version: 9.6,
      basePackageId: localCodespaceSetupOrderingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.6',
      contractAddendum:
        'Primary and accent Brand Kit roles are independently review-controlled. Apply every enabled reviewed role exactly; for each deliberately disabled role, choose a coherent accessible design token without presenting it as a verified brand fact.',
      instructionsAddendum:
        'Read brandKit.palette.mode before creating tokens. primary_and_accent locks both roles, accent_only derives primary, primary_only derives accent, and builder_derived derives both. Never restore a disabled stale value from evidence or an earlier manifest.',
      summary:
        'Builder-derived colour roles test package: lets a reviewer delegate primary, accent, or both colour choices to Codex.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Supports deliberate design autonomy per colour role while preserving exact enforcement for every colour the reviewer keeps enabled.',
      stagedBehaviourIds: ['contextual-logo-selection'],
    };
    const localPersistentCodespaceTmuxPackage: AgentPackage = {
      ...localBuilderDerivedColoursPackage,
      id: localPersistentCodespaceTmuxPackageId,
      version: 9.7,
      basePackageId: localBuilderDerivedColoursPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.7',
      contractAddendum:
        'Every generated editing workspace starts the website and Codex in one repository-owned persistent tmux session. The same idempotent launcher runs from the Codespace container start lifecycle and the editor folder-open task, so opening the repository directly from GitHub does not bypass startup.',
      instructionsAddendum:
        'Create the tmux session behind a workspace lock, keep Codex and the website in named windows, attach the editor terminal to the existing session, and use the dev container postStartCommand to launch it independently of editor task timing.',
      summary:
        'Persistent Codespace tmux test package: keeps Codex and the website running for build-created and direct GitHub Codespace openings.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the editable workspace durable across terminal attachment and guarantees the repository-owned startup path runs when a Codespace is opened directly from GitHub.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localOptionalSvgGenerationPackage: AgentPackage = {
      ...localPersistentCodespaceTmuxPackage,
      id: localOptionalSvgGenerationPackageId,
      version: 9.8,
      basePackageId: localPersistentCodespaceTmuxPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.8',
      contractAddendum:
        'Editable SVG generation is optional and defaults off. A normal logo-version refresh preserves an existing editable SVG and does not create, trace, or stage a new SVG unless the reviewer explicitly enables the control in the collapsed SVG section.',
      instructionsAddendum:
        'Use only editable SVGs explicitly present in the current approved manifest. When SVG generation is disabled, use the approved source and transparent PNG logo family without assuming a fresh vector exists.',
      summary:
        'Optional SVG generation test package: makes editable vector creation an explicit default-off logo-run choice.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents repeated SVG work during ordinary logo remasters while retaining an opt-in editable-vector workflow.',
      stagedBehaviourIds: ['contextual-logo-selection'],
    };
    const localCodespaceResumeStartupPackage: AgentPackage = {
      ...localOptionalSvgGenerationPackage,
      id: localCodespaceResumeStartupPackageId,
      version: 9.9,
      basePackageId: localOptionalSvgGenerationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v9.9',
      contractAddendum:
        'Every GitHub workspace publication refreshes the current repository-owned Codespace startup handoff after loading source, including archived source bundles. On each container resume, the launcher restarts stopped website or Codex panes in the persistent tmux session before the editor attaches.',
      instructionsAddendum:
        'Apply the current local-development handoff to both reconstructed and archive-based workspaces immediately before publication. Keep named tmux windows restartable with remain-on-exit and respawn a dead pane during the postStartCommand lifecycle.',
      summary:
        'Codespace resume startup test package: refreshes archived handoffs and automatically restarts stopped website and Codex panes.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents old archived startup files from reaching new repositories and restores both development processes whenever a Codespace resumes.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localVisibleCodespaceSetupPackage: AgentPackage = {
      ...localCodespaceResumeStartupPackage,
      id: localVisibleCodespaceSetupPackageId,
      version: 10,
      basePackageId: localCodespaceResumeStartupPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.0',
      contractAddendum:
        'Codespace dependency and Codex setup runs in one repository-owned background startup job instead of blocking the container creation terminal. The editor task streams named persisted checkpoints and real failure output, then attaches to the persistent tmux session as soon as it exists.',
      instructionsAddendum:
        'Use an idempotent background launcher from postStartCommand, persist its PID and log, and make the folder-open task follow that log while waiting for tmux. Bound network installation attempts and report lock waits, dependency installation, Codex installation, tmux checks, readiness, and failure without fabricated percentages.',
      summary:
        'Visible Codespace setup test package: removes the silent post-create wait and streams real startup checkpoints before tmux attachment.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps low-core Codespaces responsive during first setup and makes any dependency or Codex installation failure visible and actionable.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localWebsiteToneDirectionPackage: AgentPackage = {
      ...localVisibleCodespaceSetupPackage,
      id: localWebsiteToneDirectionPackageId,
      version: 10.1,
      basePackageId: localVisibleCodespaceSetupPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.1',
      contractAddendum:
        'A private build may carry an explicit light-led or dark-led website tone, or omit tonal direction so Codex decides. Light and dark describe the overall visual character rather than requiring pure white or pure black backgrounds.',
      instructionsAddendum:
        'Respect the saved per-run website-tone direction while retaining ownership of the exact accessible palette. A light-led build may use warm neutrals or pale brand tints; a dark-led build may use deep brand-compatible colours such as green, blue, brown, or black. When no tone is selected, choose the most fitting direction from the approved evidence.',
      summary:
        'Website tone direction test package: adds Light, Dark, and Agent decides choices without forcing white or black backgrounds.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Lets a reviewer guide the overall tonal character of a private build while preserving Codex ownership of the exact accessible brand-aware palette.',
      stagedBehaviourIds: ['website-tone-direction'],
    };
    const localNoninteractiveCodexInstallPackage: AgentPackage = {
      ...localWebsiteToneDirectionPackage,
      id: localNoninteractiveCodexInstallPackageId,
      version: 10.2,
      basePackageId: localWebsiteToneDirectionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.2',
      contractAddendum:
        'Codex CLI installation in an automatic editing workspace must set the installer-supported CODEX_NON_INTERACTIVE flag so the background startup can never wait on the Start Codex now terminal prompt.',
      instructionsAddendum:
        'Pipe the official installer into CODEX_NON_INTERACTIVE=1 sh, retain bounded download retries, and start Codex only inside the named tmux window after setup completes.',
      summary:
        'Non-interactive Codex install test package: prevents first-run Codespace setup from waiting at the installer launch prompt.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes automatic startup deterministic after dependency installation while preserving the official Codex installer and normal tmux login flow.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localEmbeddedProspectWorkspacePackage: AgentPackage = {
      ...localNoninteractiveCodexInstallPackage,
      id: localEmbeddedProspectWorkspacePackageId,
      version: 10.3,
      basePackageId: localNoninteractiveCodexInstallPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.3',
      contractAddendum:
        'Editable prospect repositories may live under the Studio-owned prospect-workspaces directory, which is excluded from Studio version control. The local workspace command clones or fast-forwards the private repository, preserves local changes, verifies the Made Solid refinement ledger, and installs locked dependencies.',
      instructionsAddendum:
        'Present the repository-relative prospect-workspaces path and the npm workspace:open command instead of a Codespaces link. Authenticate private clone and pull operations through the configured GitHub CLI without exposing credentials or embedding them in repository URLs.',
      summary:
        'Embedded prospect workspace test package: keeps editable prospect repositories inside the current Studio workspace with refinement logging intact.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the separate Codespace dependency while retaining private GitHub history, safe updates, installed dependencies, and auditable refinement logging.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localOneClickProspectWorkspacePackage: AgentPackage = {
      ...localEmbeddedProspectWorkspacePackage,
      id: localOneClickProspectWorkspacePackageId,
      version: 10.4,
      basePackageId: localEmbeddedProspectWorkspacePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.4',
      contractAddendum:
        'The Studio development server exposes a same-origin, validated local action that invokes the embedded prospect workspace preparation script and streams concrete setup phases back to the authenticated workspace UI.',
      instructionsAddendum:
        'Use one labelled Open local workspace action for the normal path. Report GitHub authorization, clone or safe update, refinement-ledger verification, dependency preparation, completion, and failure without fabricated percentages; retain the shell command only as an explicitly collapsed fallback.',
      summary:
        'One-click prospect workspace test package: prepares the embedded private repository from the Prospect Build panel with staged, accessible status.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes command copying from the normal workflow while keeping repository validation, safe Git updates, auditable logging, and a manual recovery path.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localImmediateSourceWorkspacePackage: AgentPackage = {
      ...localOneClickProspectWorkspacePackage,
      id: localImmediateSourceWorkspacePackageId,
      version: 10.5,
      basePackageId: localOneClickProspectWorkspacePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.5',
      contractAddendum:
        'A completed build with safe editable-source evidence can be opened directly from its Editable source is ready section. The same local action exports source when no repository exists or safely updates the private repository when it does.',
      instructionsAddendum:
        'Place the labelled Open local workspace action beside the ready source evidence instead of gating it on repository publication. Use a deterministic ignored prospect-workspaces destination, prepare dependencies, and keep the exact command in a collapsed manual fallback.',
      summary:
        'Immediate source workspace test package: makes one-click local setup visible as soon as editable build source is ready.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets development begin from completed source without first creating or locating a separate GitHub repository while retaining the repository-backed path when available.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAutomaticWebsiteLaunchPackage: AgentPackage = {
      ...localImmediateSourceWorkspacePackage,
      id: localAutomaticWebsiteLaunchPackageId,
      version: 10.6,
      basePackageId: localImmediateSourceWorkspacePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.6',
      contractAddendum:
        'After one-click local workspace preparation, Studio launches the generated website in a named persistent tmux terminal session, waits for an actual HTTP response, and returns the correct local or Codespaces-forwarded preview URL.',
      instructionsAddendum:
        'Report website launch and readiness as observable phases. Open the preview from the original click context and retain a labelled preview link when automatic navigation is blocked. Never claim readiness before the server responds.',
      summary:
        'Automatic website launch test package: starts the prepared prospect site persistently and opens its live preview.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Completes the local handoff in one action while keeping the development server inspectable, restartable, and truthfully readiness-checked.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCodespacesPreviewUrlPackage: AgentPackage = {
      ...localAutomaticWebsiteLaunchPackage,
      id: localCodespacesPreviewUrlPackageId,
      version: 10.7,
      basePackageId: localAutomaticWebsiteLaunchPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.7',
      contractAddendum:
        'Website preview links use the explicit Codespaces name and port-forwarding domain when running in GitHub Codespaces, regardless of proxy Host rewriting. Ordinary local development retains localhost URLs.',
      instructionsAddendum:
        'Build the Codespaces preview URL from CODESPACE_NAME, the selected server port, and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN. Fall back to the request host or localhost only outside Codespaces.',
      summary:
        'Codespaces preview URL test package: opens the forwarded prospect-site port instead of localhost while preserving local-PC behavior.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes automatic preview opening reach the actual Codespaces tunnel without changing how local developers access localhost.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localLiveRefinementLedgerPackage: AgentPackage = {
      ...localCodespacesPreviewUrlPackage,
      id: localLiveRefinementLedgerPackageId,
      version: 10.8,
      basePackageId: localCodespacesPreviewUrlPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.8',
      contractAddendum:
        'The Editable source is ready section includes a live, read-only view of the local prospect workspace refinement ledger. It reads the append-only workspace record through a validated same-origin endpoint and shows verified entries as they are recorded without copying them into Studio state.',
      instructionsAddendum:
        'Keep refinement history private and workspace-scoped. Show truthful loading, unavailable, empty, ready, and error states; refresh the visual ledger while the panel is open and present each verified problem, fix, classification, page, and checked viewport without exposing unrelated files.',
      summary:
        'Live refinement ledger test package: shows verified local website changes inside the editable-workspace launcher as they are recorded.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes local Codex refinements visible in Studio immediately while retaining the append-only repository ledger as the source of truth.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localResilientRefinementLedgerPackage: AgentPackage = {
      ...localLiveRefinementLedgerPackage,
      id: localResilientRefinementLedgerPackageId,
      version: 10.9,
      basePackageId: localLiveRefinementLedgerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v10.9',
      contractAddendum:
        'Local Studio startup loads the Vite workspace-service configuration explicitly. The live refinement-ledger client verifies that its same-origin endpoint returned JSON before parsing it, so an HTML application fallback or malformed response becomes a clear reconnect state and never exposes a raw parser exception.',
      instructionsAddendum:
        'Pass the Studio Vite config explicitly from the local service launcher, keep the ledger endpoint registered there, and validate its response content type in the client. If the local middleware is not connected, tell the operator to restart Made Solid Studio while preserving the workspace ledger as the source of truth.',
      summary:
        'Resilient refinement ledger test package: turns missing local middleware into an actionable reconnection state.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the live handoff understandable when Studio is running an outdated local server process without weakening workspace isolation or ledger validation.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localEditingHandoffPagesPackage: AgentPackage = {
      ...localResilientRefinementLedgerPackage,
      id: localEditingHandoffPagesPackageId,
      version: 11,
      basePackageId: localResilientRefinementLedgerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.0',
      contractAddendum:
        'Prospect editing and Made Solid handoff are dedicated routed workspace sections. The final-edit action runs the complete website verification, refreshes the refinement bundle, creates an explicit final checkpoint commit, and pushes the current prospect branch before handoff can become ready.',
      instructionsAddendum:
        'Keep generation, local editing, and client-workspace handoff as separate URL-backed stages. Stream verified finalisation phases without fabricated percentages, require confirmation before committing and pushing, and block Made Solid transfer until the final commit is synced and the website-admin connection is configured.',
      summary:
        'Editing and handoff pages test package: separates local refinement from generation and adds a verified final-source checkpoint before client transfer.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes final source ownership visible and prevents the earlier generated artifact set from being submitted as though it contained later local edits.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localResilientFinalEditPackage: AgentPackage = {
      ...localEditingHandoffPagesPackage,
      id: localResilientFinalEditPackageId,
      version: 11.1,
      basePackageId: localEditingHandoffPagesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.1',
      contractAddendum:
        'Final-edit verification captures meaningful command output instead of returning only a framework worker footer. A transient Next.js export-worker or global-error failure receives one bounded complete-verification retry before the checkpoint fails. The push uses the stored write-capable GitHub CLI credential instead of a read-only Codespaces token.',
      instructionsAddendum:
        'Retain enough redacted verification output to explain a final-edit failure. Retry the complete verification once only when Next reports an export-worker or global-error termination, then continue bundling, committing, and pushing only after the retry passes. Remove GITHUB_TOKEN from the push environment after configuring the stored GitHub CLI credential.',
      summary:
        'Resilient final edit test package: retries transient Next export-worker failures once and returns the useful build context when verification still fails.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a temporary static-export worker stop or read-only Codespaces token from abandoning an otherwise valid final edit while keeping deterministic verification failures visible and uncommitted.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localEditVersionHistoryPackage: AgentPackage = {
      ...localResilientFinalEditPackage,
      id: localEditVersionHistoryPackageId,
      version: 11.2,
      basePackageId: localResilientFinalEditPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.2',
      contractAddendum:
        'Every verified website edit is an ordered immutable Git checkpoint tied to the originating Studio build. Website editing shows the next working version and current committed version, while editing, prospect overview, and Made Solid handoff can open any retained committed website from a detached snapshot.',
      instructionsAddendum:
        'Derive edit versions from validated repository commit history and .made-solid/origin.json. Increment the version only when a new verified commit is created. Serve committed previews from detached Git worktrees so uncommitted or later working changes cannot alter an earlier version.',
      summary:
        'Edit version history test package: identifies the working edit, originating build, current checkpoint, and immutable committed website previews.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes repeated post-build editing explicit and reviewable without duplicating source records or confusing the live working tree with the version selected for handoff.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAgentLearningInboxPackage: AgentPackage = {
      ...localEditVersionHistoryPackage,
      id: localAgentLearningInboxPackageId,
      version: 11.3,
      basePackageId: localEditVersionHistoryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.3',
      contractAddendum:
        'A committed prospect learning bundle enters production-agent refinement only through an explicit human review. Strict safeguards and reusable principles may be selected; project-specific decisions and unclassified observations remain excluded by default. Approved evidence creates a private proposal in Agent Studio Learning inbox and never mutates the published package directly.',
      instructionsAddendum:
        'Read learning bundles from the validated local workspace service, keep every selected lesson tied to its committed source and original build, and fit the protected proposal size boundary without silently dropping selections. Distil only approved evidence into the appropriate policy, feature contract, foundation source, and regression tests. Replay the immutable original manifest for testing and require the normal test-package, production-draft, and explicit publish gates.',
      summary:
        'Agent learning inbox test package: reviews committed refinement evidence and sends only approved reusable lessons into the protected package lifecycle.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the gap between a prospect learning bundle and a reviewable Agent Studio proposal without allowing client-specific taste or final website source to leak into future builds.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAgentStudioTonePackage: AgentPackage = {
      ...localAgentLearningInboxPackage,
      id: localAgentStudioTonePackageId,
      version: 11.4,
      basePackageId: localAgentLearningInboxPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.4',
      contractAddendum:
        'Agent Studio private page tests and whole-site revisions expose the same per-run website-tone direction as complete prospect builds. Agent decides remains the default; Light and Dark remain guidance for overall visual character rather than fixed white or black palettes.',
      instructionsAddendum:
        'Apply the selected Agent Studio website tone to both clean page tests and linked whole-site feature revisions. Save the direction in the scoped build instruction while retaining Codex ownership of the exact accessible, brand-aware palette.',
      summary:
        'Agent Studio website tone test package: brings Agent decides, Light, and Dark direction into page tests and whole-site revisions.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Keeps tonal comparisons explicit and consistent between Agent Studio tests and complete prospect builds without changing the approved brand evidence.',
      stagedBehaviourIds: ['website-tone-direction'],
    };
    const localMadeSolidHandoffPackage: AgentPackage = {
      ...localAgentStudioTonePackage,
      id: localMadeSolidHandoffPackageId,
      version: 11.5,
      basePackageId: localAgentStudioTonePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.5',
      contractAddendum:
        'A completed prospect edit enters Made Solid admin only as an exact, immutable Git revision. The protected handoff lifecycle records its repository, branch, full commit SHA, edit version, manifest and agent-package lineage; it never substitutes earlier generated artifacts and never publishes or contacts the client.',
      instructionsAddendum:
        'Require a synced final-edit checkpoint and verified private editable-source publication before queueing a Made Solid handoff. Persist queued, running, concrete phase detail, completed checkpoints, cancellation, stable failure context and the returned private admin URL. Append later commits as ordered revisions while preserving earlier handoffs.',
      summary:
        'Made Solid source handoff test package: moves exact committed edit revisions into the private admin workspace with live, cancellable progress.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Connects post-build editing to client operations without confusing a builder artifact, private admin record, Clientspace account or public release.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localOptionalHandoffSchemaPackage: AgentPackage = {
      ...localMadeSolidHandoffPackage,
      id: localOptionalHandoffSchemaPackageId,
      version: 11.6,
      basePackageId: localMadeSolidHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.6',
      contractAddendum:
        'Made Solid handoff history is an optional integration during core workspace loading. A missing handoff table or stale schema cache cannot block prospect workspaces, Agent Studio tests, or builder runs; only an explicit handoff or cancellation request may require that migration.',
      instructionsAddendum:
        'Load Made Solid handoff history independently from required prospect and builder data. Continue with an empty handoff history when its schema is unavailable, log the integration failure privately, and show migration-specific guidance only when a user invokes the affected handoff action.',
      summary:
        'Optional handoff schema test package: keeps prospect and Agent Studio builds available when the Made Solid handoff migration is not installed.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Prevents an optional delivery integration from taking down unrelated build workflows during staged database rollouts.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localHandoffWorkerLivenessPackage: AgentPackage = {
      ...localOptionalHandoffSchemaPackage,
      id: localHandoffWorkerLivenessPackageId,
      version: 11.7,
      basePackageId: localOptionalHandoffSchemaPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.7',
      contractAddendum:
        'An exact-edit handoff can be queued only while the protected Made Solid worker has a fresh persisted heartbeat. The UI reports unavailable delivery before submission, and a database liveness guard prevents unattended jobs from accumulating if the worker stops.',
      instructionsAddendum:
        'Heartbeat the Made Solid handoff worker independently of item processing, release its heartbeat on an orderly stop, require a heartbeat no older than 45 seconds when queueing, and keep the integration availability read optional during workspace loading.',
      summary:
        'Made Solid handoff worker liveness test package: blocks unattended queues and shows when protected delivery is not connected.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the handoff button honest about worker availability while retaining the durable exact-commit lifecycle.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCleanAlternateTestPackage: AgentPackage = {
      ...localHandoffWorkerLivenessPackage,
      id: localCleanAlternateTestPackageId,
      version: 11.8,
      basePackageId: localHandoffWorkerLivenessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.8',
      contractAddendum:
        'After a failed Agent Studio build, Test something else prepares a clean alternative-test draft instead of retaining the failed package, approach, page selection, tone, or directions. The request client must load the exact run identifier returned by the protected queue function; only Continue this test may reuse failed source.',
      instructionsAddendum:
        'Keep stopped output as immutable history. Reset the alternate-test chooser to a clean create flow, prefer another eligible package when available, and bind a successful queue response to its returned run ID so a stale latest-run read cannot redisplay the failed run as the active request.',
      summary:
        'Clean alternate-test package: resets failed-build choices and follows the exact newly queued run instead of redisplaying the stopped build.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Makes failure recovery unambiguous while preserving explicit checkpoint continuation as a separate action.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCanonicalAssetHandoffPackage: AgentPackage = {
      ...localCleanAlternateTestPackage,
      id: localCanonicalAssetHandoffPackageId,
      version: 11.9,
      basePackageId: localCleanAlternateTestPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v11.9',
      contractAddendum:
        'Exact duplicate visual assets are represented once in Build Manifest and staged builder input. The canonical record retains every captured source page and image URL plus duplicate artifact IDs as provenance.',
      instructionsAddendum:
        'Use each canonical approved image once. Treat sourcePageUrls and sourceUrls as provenance showing every discovery location, not as additional image files or instructions to repeat the image.',
      summary:
        'Canonical asset handoff test package: combines byte-identical images while retaining every discovery location for Codex.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Reduces redundant builder context without losing page-level provenance or human-approved asset boundaries.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCapturedHandoffEmailPackage: AgentPackage = {
      ...localCanonicalAssetHandoffPackage,
      id: localCapturedHandoffEmailPackageId,
      version: 12,
      basePackageId: localCanonicalAssetHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12',
      contractAddendum:
        'The Made Solid handoff form prefills the first valid public email from the immutable Research Packet when no reviewed prospect contact email exists. Staff must review the value before Clientspace creation; recording a handoff never sends email.',
      instructionsAddendum:
        'Keep captured contact provenance visible, prefer a reviewed prospect contact over captured public evidence, and retain separate explicit controls for saving contact data, creating a Clientspace, and sending outreach.',
      summary:
        'Captured handoff email test package: prefills researched public contact evidence while preserving human review and no-contact boundaries.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Removes repetitive contact entry without treating a scraped public address as verified or contacting the prospect.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAutomaticClientspacePreviewPackage: AgentPackage = {
      ...localCapturedHandoffEmailPackage,
      id: localAutomaticClientspacePreviewPackageId,
      version: 12.1,
      basePackageId: localCapturedHandoffEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.1',
      contractAddendum:
        'A Made Solid source handoff verifies the clean local repository against its exact commit, deploys and checks that commit on Vercel, then records the preview with the immutable source lineage. Clientspace creation remains locked until the verified preview and reviewed client email are both available.',
      instructionsAddendum:
        'Never deploy a dirty, mismatched, or different repository. Persist observable verification, deployment, transfer, and admin checkpoints; attach a later completed preview to an existing Clientspace without sending outreach.',
      summary:
        'Automatic Clientspace preview test package: deploys the exact committed edit and attaches it before client setup unlocks.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the hosted client preview part of the durable handoff lifecycle instead of a separate manual deployment step.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAutomaticProspectDomainPackage: AgentPackage = {
      ...localAutomaticClientspacePreviewPackage,
      id: localAutomaticProspectDomainPackageId,
      version: 12.2,
      basePackageId: localAutomaticClientspacePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.2',
      contractAddendum:
        'Every exact-edit handoff derives a safe first-level hostname from the source repository, assigns that hostname to the matching Vercel project, and verifies the public HTTPS response before recording the preview or unlocking Clientspace creation.',
      instructionsAddendum:
        'Use the configured Made Solid apex domain only after its Vercel DNS zone is authoritative. Persist deployment and domain-verification checkpoints separately; never substitute a provider URL when the branded hostname fails.',
      summary:
        'Automatic prospect-domain test package: assigns and verifies each prospect’s madesolid.com.au website during handoff.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes branded prospect hosting deterministic and removes per-prospect DNS work from Clientspace setup.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localEditableHandoffRecoveryPackage: AgentPackage = {
      ...localAutomaticProspectDomainPackage,
      id: localEditableHandoffRecoveryPackageId,
      version: 12.3,
      basePackageId: localAutomaticProspectDomainPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.3',
      contractAddendum:
        'A completed generated source handoff converts the protected builder copy into an owner-writable local workspace before adding refinement metadata. Approved transparent logo-family variants remain available together so Codex can select the correct contrast-safe mark for each direct surface.',
      instructionsAddendum:
        'Keep the protected generation workspace immutable while Codex runs, then explicitly restore owner-write permission only in the disposable local-development copy before extending package.json. Stage every human-approved appearance variant derived from the approved primary logo and exclude unapproved mattes, suggestions, and unrelated marks.',
      summary:
        'Editable handoff recovery test package: completes source export after browser checks and preserves the approved contextual logo family.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a passing generated site from failing while its editable source is packaged and keeps approved logo variants available for contrast-aware placement.',
      stagedBehaviourIds: ['contextual-logo-selection', 'framework-quality-gates'],
    };
    const localReviewedPageDispositionsPackage: AgentPackage = {
      ...localEditableHandoffRecoveryPackage,
      id: localReviewedPageDispositionsPackageId,
      version: 12.4,
      basePackageId: localEditableHandoffRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.4',
      contractAddendum:
        'Every selected source page receives a reviewed coverage outcome: standalone build, merge, redirect, workflow state, contextual route, or exclusion. Source selection preserves evidence but no longer automatically creates a public route or footer link.',
      instructionsAddendum:
        'Flag suspicious CMS slugs and canonical duplicates for review. Require a canonical destination for merges and redirects. Build only outputRequired routes, preserve merged material at its target, keep redirects and workflow states out of global navigation, noindex workflow states, and omit reviewed CMS residue.',
      summary:
        'Reviewed page-disposition test package: preserves source coverage without reproducing legacy CMS architecture.',
      capabilityAssessment: 'policy_only',
      capabilityProposal:
        'Prevents duplicate home slugs, confirmation states, author archives, and CMS residue from being promoted merely because capture discovered them.',
      stagedBehaviourIds: ['site-navigation-architecture'],
    };
    const localVisualCodexFeedbackPackage: AgentPackage = {
      ...localReviewedPageDispositionsPackage,
      id: localVisualCodexFeedbackPackageId,
      version: 12.5,
      basePackageId: localReviewedPageDispositionsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.5',
      contractAddendum:
        'Local Studio build, test, private-preview, and editing surfaces expose one visual-feedback control that captures a deliberately selected screen region, reviews the exact image and prompt, and queues both to the active local Codex thread without exposing the app-server publicly.',
      instructionsAddendum:
        'Discover available Codex models and reasoning levels from app-server instead of hard-coding the picker. Store screenshots in a private ignored workspace directory, validate image and prompt limits, preserve queued feedback while Codex is busy, and never simulate terminal keystrokes or interrupt an active turn.',
      summary:
        'Visual Codex feedback test package: sends reviewed screenshot regions and prompts from Studio to the shared tmux conversation with live model selection.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds a local rich-client bridge so visual website refinements can enter the real Codex thread with their exact image evidence and chosen model.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexChatPackage: AgentPackage = {
      ...localVisualCodexFeedbackPackage,
      id: localCodexChatPackageId,
      version: 12.6,
      basePackageId: localVisualCodexFeedbackPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.6',
      contractAddendum:
        'The local Codex control is a complete chat composer as well as a visual-feedback tool. Reviewers can send a text-only message immediately or attach a deliberately selected screenshot region before sending to the same active tmux conversation.',
      instructionsAddendum:
        'Expose every live text-capable Codex model for chat, label image support clearly, and disable screenshot capture for text-only models. Queue text-only and image-assisted turns through the same private bridge without requiring an image or interrupting an active turn.',
      summary:
        'Codex chat test package: adds direct text messaging while preserving optional reviewed screenshot attachments and live model selection.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Turns the visual-feedback launcher into a reusable local Codex chat composer for build, test, preview, and editing workflows.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexConversationCapturePackage: AgentPackage = {
      ...localCodexChatPackage,
      id: localCodexConversationCapturePackageId,
      version: 12.7,
      basePackageId: localCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.7',
      contractAddendum:
        'The compact local Codex chat renders the selected tmux-backed conversation log, allows switching among saved Studio threads, and routes new text or image-assisted turns to the selected history entry. A local Chrome and Brave helper can capture the exact visible Studio tab without the desktop-sharing chooser; external tabs and windows retain the secure browser chooser.',
      instructionsAddendum:
        'Keep thread history and message reads bounded, expose only user and assistant text, and never render tool payloads or hidden reasoning. Scope the Manifest V3 content script to local Studio and Codespaces port 5173 URLs, validate requests again in the service worker, and keep the chooser-based capture fallback. Codespace startup must recover missing app-server, Codex, or Studio tmux processes through explicit health checks.',
      summary:
        'Codex conversation capture test package: adds tmux chat history, selectable threads, chooser-free current-tab capture for Chrome and Brave, and recoverable Codespace startup.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the Studio control a durable local Codex client with bounded conversation history and exact Chromium tab evidence while retaining secure external-screen capture.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexIdeChatPackage: AgentPackage = {
      ...localCodexConversationCapturePackage,
      id: localCodexIdeChatPackageId,
      version: 12.8,
      basePackageId: localCodexConversationCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.8',
      contractAddendum:
        'The compact local Codex client follows an IDE chat hierarchy with a quiet conversation header, a primary scrolling transcript, and one bordered composer that groups message input, screenshot attachments, model and reasoning controls, and send state without obscuring the Studio workspace. Observable active-thread and queue state appears in the transcript with a live elapsed timer and no fabricated progress percentage. When closed, the launcher shows real working state and changes to an unseen-completion bell only after an observed active turn finishes. Saved previews retain the panel in the Studio shell, and generated development workspaces mount the same Studio-hosted panel above their raw website server through a validated, development-only frame.',
      instructionsAddendum:
        'Preserve Made Solid tokens, shared controls, keyboard operation, visible focus, accessible names, and responsive reflow while using the established Codex IDE interaction hierarchy. Do not copy proprietary extension assets or source. Keep the transcript readable and the composer available at compact mobile, tablet, and desktop viewports. Accepted text chat clears the composer and appears inline as a queued transcript entry; do not interrupt chat with a second confirmation dialog. Stage the development-only workspace panel in the locked Next foundation, validate postMessage source and origin, and expose the Studio origin only through the local launch environment so production exports render no control.',
      summary:
        'Codex IDE chat-surface test package: keeps the same local client available in Studio previews and directly on raw prospect development websites.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Aligns the Studio chat with the familiar Codex IDE workflow while retaining the local bridge, history, model selection, and visual evidence controls.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexCapturePreferencesPackage: AgentPackage = {
      ...localCodexIdeChatPackage,
      id: localCodexCapturePreferencesPackageId,
      version: 12.9,
      basePackageId: localCodexIdeChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v12.9',
      contractAddendum:
        'The embedded Codex capture surface expands to the full development-preview viewport while a region is selected, automatically advances a valid drag to visual-feedback review, and gives explicit selection guidance. Current-tab capture waits until the composer is hidden and the browser has repainted, so the captured image cannot contain a frozen copy of its own camera control. When the optional browser helper is unavailable, the private Studio service captures only the validated current local workspace URL at its reported viewport and scroll position, hides the Codex control, and returns the image without invoking the Chrome or Brave sharing popup. The conversation header can create a new persistent Codex thread with the currently selected model and reasoning and immediately select it. One unsent composer draft is shared across Studio, preview, build, test, and raw development-workspace routes. Codex model and per-model reasoning choices persist locally across panel closure and browser reload. Messages sent during an active turn stack as compact queued transcript cards that can be expanded, edited, or individually promoted with an Interrupt action. Compact lifecycle UI measures the current active turn only and distinguishes working, approval/input waits, queued work, interruption, completion, and failure without fabricated progress. Icon-only control hover states retain neutral, legible foreground and background contrast instead of combining white glyphs with the accent surface.',
      instructionsAddendum:
        'Persist only the local unsent draft, model identifier, and per-model reasoning preference map; validate model preferences against currently discovered capabilities and clear the shared draft only after accepted delivery. Hide the composer, wait for two animation frames and a bounded compositor-settle interval, and only then request chooser-free current-tab capture. When browser-helper permission is absent, keep the camera enabled and capture through a same-origin private endpoint instead of getDisplayMedia. Accept only localhost or the current Codespaces ports 3000, 5173, and 8788, translate them to loopback server targets, bound viewport and scroll inputs, hide the Codex UI from the captured page, and close every isolated capture page. Reserve getDisplayMedia and its mandatory chooser for the separately labelled another-tab/window action. Create new conversations through app-server thread/start with the selected discovered model, a validated reasoning configuration, the current workspace directory, persistent history, and the existing full-access/no-approval local profile. Expand the validated development iframe only for active region selection, restore compact panel geometry for review, and preserve origin and contentWindow checks. Messages always queue safely during an active turn. A queued card may be edited before delivery, and its Interrupt action must call the app-server turn/interrupt method with the exact active thread and turn and promote that selected record to the front of the queue. Derive elapsed working time only from the active turn startedAt value; when it is unavailable, show Working now instead of reusing an old thread timestamp. Keep icon hover, focus, active, and disabled states neutral and contrast-safe across chat, capture, review, and completion surfaces.',
      summary:
        'Codex capture preferences test package: adds popup-free workspace capture, new chats, shared drafts, durable model choices, editable queue interruption, accurate active-turn timing, and neutral icon hovers.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes screenshot feedback and active-turn steering dependable across every Studio workspace while retaining drafts, reviewer configuration, and consistent IDE control styling.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodespaceWorkspaceSuitePackage: AgentPackage = {
      ...localCodexCapturePreferencesPackage,
      id: localCodespaceWorkspaceSuitePackageId,
      version: 13,
      basePackageId: localCodexCapturePreferencesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.0',
      contractAddendum:
        'The persistent Codespace session starts the Made Solid website beside Studio, the private preview host, Codex app-server, and active prospect preview without port collisions. The website mounts the same development-only Studio-hosted Codex panel, including persistent conversation history and New chat. Forwarded services use stable labelled ports, internal and automated-test ports are ignored, and stale port forwarding is not restored after reload.',
      instructionsAddendum:
        'Reserve port 3000 for the active prospect website, 3001 for the Made Solid website, 5173 for Studio, 8788 for the private preview and API host, and loopback-only 4500 for Codex app-server. Launch the Made Solid website with MADE_SOLID_STUDIO_ORIGIN pointing to the current private Studio origin, wait for readiness, and open it once per Codespace start. Render the Codex iframe only when that development origin exists, validate bridge messages by origin and contentWindow, and allow popup-free local capture from port 3001. Do not restore stale test ports or expose the app-server as a browser-facing service.',
      summary:
        'Codespace workspace suite test package: adds the Made Solid website to automatic startup, shares persistent Codex chats and New chat there, and keeps every active port stable and clearly labelled.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the complete Made Solid development workspace open together with one consistent Codex conversation surface and a predictable, uncluttered Ports panel.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableCodexNewChatPackage: AgentPackage = {
      ...localCodespaceWorkspaceSuitePackage,
      id: localReliableCodexNewChatPackageId,
      version: 13.1,
      basePackageId: localCodespaceWorkspaceSuitePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.1',
      contractAddendum:
        'New Codex conversations are immediately selectable before their first user message materializes the app-server thread. An empty newly started thread remains represented in conversation history, and a delayed status response for a previously selected thread cannot replace the current conversation.',
      instructionsAddendum:
        'Cache newly started app-server threads until thread/read succeeds, return their empty conversation state while materialization is pending, and merge them with thread/list without duplication. Track the selected conversation synchronously on the client and discard any status response whose requested thread no longer matches it. Keep the empty conversation selected through polling until its first accepted message.',
      summary:
        'Reliable Codex new-chat test package: keeps a newly created empty conversation selected and prevents stale status polling from reverting it.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes New chat deterministic across the Studio, Made Solid website, and prospect workspace chat surfaces even before the first message is sent.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExactStudioCapturePackage: AgentPackage = {
      ...localReliableCodexNewChatPackage,
      id: localExactStudioCapturePackageId,
      version: 13.2,
      basePackageId: localReliableCodexNewChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.2',
      contractAddendum:
        'The primary camera action captures the visible Studio tab rather than reopening an unauthenticated copy of Studio. The browser helper remains the chooser-free path when installed; without it, Studio requests the browser current-tab surface directly. Embedded local website workspaces may continue using the private server renderer because their page does not depend on the Studio authentication session. Every capture path exposes an immediate persisted UI phase while work is pending.',
      instructionsAddendum:
        'Never use the server-side page renderer for a top-level Studio route because it cannot inherit the user browser authentication session or exact visible state. Prefer the installed capture helper, otherwise request getDisplayMedia synchronously from the camera activation with preferCurrentTab and browser-surface constraints. Use server rendering only when a validated embedded workspace context names the actual local website. Hide the composer and show an accessible capture-status message until area selection or a clear error is ready.',
      summary:
        'Exact Studio capture test package: captures the real active Studio tab, avoids unauthenticated login screenshots, and adds immediate capture progress.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes visual feedback accurate and responsive in authenticated Studio prospect workspaces while preserving fast chooser-free capture where the helper is available.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localMobileStudioCapturePackage: AgentPackage = {
      ...localExactStudioCapturePackage,
      id: localMobileStudioCapturePackageId,
      version: 13.3,
      basePackageId: localExactStudioCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.3',
      contractAddendum:
        'When mobile Chrome does not expose getDisplayMedia and cannot run the desktop capture helper, the Studio camera renders the current authenticated viewport directly from the live DOM. The capture preserves internal workspace scroll and current form values, excludes Codex controls, embeds local fonts and visible images, and produces a bounded crisp PNG without sending authentication state to a separate browser.',
      instructionsAddendum:
        'Warm the mobile DOM capture engine after startup when screen capture is unavailable. Capture only the stable viewport root after the Codex composer has painted hidden, preserve and restore the internal main-scroll offset, cap output at two device pixels per CSS pixel, reuse cached font and image requests, and stop with a specific error on timeout, invalid PNG output, or a failed image decode. Never substitute an unauthenticated server-rendered Studio page or silently accept an incomplete screenshot.',
      summary:
        'Mobile Studio capture test package: adds fast authenticated in-page screenshots for mobile Chrome with exact pixel, scroll, and failure safeguards.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes visual Codex feedback dependable on phones without weakening Studio authentication or returning a screenshot of the wrong page.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExactVisualChatPackage: AgentPackage = {
      ...localMobileStudioCapturePackage,
      id: localExactVisualChatPackageId,
      version: 13.4,
      basePackageId: localMobileStudioCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.4',
      contractAddendum:
        'Visible logos and other public images are embedded before an authenticated mobile DOM capture, using a bounded same-origin public-image relay only when browser CORS prevents reuse. A visual message returns directly to the existing chat, clears the accepted draft, and renders its screenshot inline while queued and after delivery. Area selection and whole-screenshot delivery are equally available.',
      instructionsAddendum:
        'Never replace a failed capture image with a placeholder. Await document fonts, retry failed font preparation, inline visible images, restore the live DOM after capture, and fail clearly when an image cannot be represented. Keep the chat open after accepting visual feedback, clear only an accepted draft, show the attachment inside the corresponding queued or delivered user message, and provide a direct whole-screenshot action beside region selection.',
      summary:
        'Exact visual chat test package: preserves visible branding and fonts in mobile capture, adds whole-screenshot delivery, and keeps sent images inline in chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes screenshot feedback visually faithful and keeps the complete send result visible in the conversation without a disruptive confirmation dialog.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableLongPageCapturePackage: AgentPackage = {
      ...localExactVisualChatPackage,
      id: localReliableLongPageCapturePackageId,
      version: 13.5,
      basePackageId: localExactVisualChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.5',
      contractAddendum:
        'Authenticated mobile DOM capture requires every image intersecting the captured viewport to be embedded before rendering. Image requests belonging entirely to off-screen content may fall back to a genuinely transparent pixel so an unrelated asset lower in a long Agent Studio page cannot abort the visible screenshot.',
      instructionsAddendum:
        'Pre-embed and decode all visible image elements, failing clearly if any visible image cannot be represented. After that visible-image gate succeeds, provide the DOM renderer with a verified transparent fallback for unreachable off-screen images. Never use that fallback in place of visible content, and never allow an off-screen asset failure to reject the viewport capture.',
      summary:
        'Reliable long-page capture test package: prevents off-screen refinement assets from aborting an otherwise exact mobile viewport screenshot.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps exact mobile capture reliable on long Agent Studio refinement pages without hiding failures in content the user can actually see.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localConcurrentCodexChatsPackage: AgentPackage = {
      ...localReliableLongPageCapturePackage,
      id: localConcurrentCodexChatsPackageId,
      version: 13.6,
      basePackageId: localReliableLongPageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.6',
      contractAddendum:
        'Codex conversations are independent execution lanes. A busy thread defers only its own queued messages while idle threads start immediately. New conversations use the app-server automatic name after their first prompt, display a temporary New chat label beforehand, and are deleted through the supported app-server lifecycle when abandoned without any conversation content.',
      instructionsAddendum:
        'Dispatch queued records by their exact thread ID and continue scanning after a busy or temporarily unavailable thread; never fall back to another conversation when a target ID was supplied. Preserve app-server-provided thread names and previews instead of assigning a Studio title. Mark truly empty threads as discardable, validate they contain no turns or queued work on the server, and call thread/delete when the user leaves them.',
      summary:
        'Concurrent Codex chats test package: runs independent conversations together, preserves automatic Codex titles, and removes abandoned empty chats.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the Studio conversation model behave like the Codex extension instead of treating all chats as one global queue.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPublicCodespacePortsPackage: AgentPackage = {
      ...localConcurrentCodexChatsPackage,
      id: localPublicCodespacePortsPackageId,
      version: 13.7,
      basePackageId: localConcurrentCodexChatsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.7',
      contractAddendum:
        'Every browser-facing Studio, Made Solid website, prospect preview, Storybook, and preview-host port is restored to public visibility after a Codespace restart or service rebind. A persistent workspace watcher applies visibility only when an approved service is listening; the loopback Codex app-server is never published.',
      instructionsAddendum:
        'Run the public-port watcher in its own persistent tmux window for both Studio and generated editable website workspaces. Reapply GitHub Codespaces public visibility whenever an approved listening port appears because Codespaces resets public ports to private after restart or re-forwarding. Keep port 4500 and unapproved transient test ports private.',
      summary:
        'Public Codespace ports test package: automatically restores public browser access after every restart while keeping the Codex control port internal.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents working Studio and prospect URLs from unexpectedly requiring private Codespaces authentication after restart.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexTranscriptPositionPackage: AgentPackage = {
      ...localPublicCodespacePortsPackage,
      id: localCodexTranscriptPositionPackageId,
      version: 13.8,
      basePackageId: localPublicCodespacePortsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.8',
      contractAddendum:
        'The Studio Codex transcript follows incremental output only while the reviewer remains at its latest edge. A manual upward scroll disables following across idle polling and active output updates until the reviewer activates the visible Back to latest control or returns to the bottom.',
      instructionsAddendum:
        'Derive transcript-follow state from the real scroll position. Never force scrollTop during status polling or message rendering after the reviewer has moved away from the latest edge. Keep new messages live-announced, expose a keyboard-accessible Back to latest action, and reset following deliberately when opening or switching conversations.',
      summary:
        'Codex transcript position test package: preserves manual chat reading position and provides an explicit return-to-latest control.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers read earlier Codex messages without idle refreshes or active output pulling the transcript away from them.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localConcurrentCodexActivityPackage: AgentPackage = {
      ...localCodexTranscriptPositionPackage,
      id: localConcurrentCodexActivityPackageId,
      version: 13.9,
      basePackageId: localCodexTranscriptPositionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v13.9',
      contractAddendum:
        'Each Codex conversation owns its delivery and activity state. A request for an idle conversation starts independently while another conversation is active; only work blocked behind an active turn in the same conversation is labelled queued. The conversation chooser exposes per-thread working state and last-used time.',
      instructionsAddendum:
        'Drain newly submitted Codex work even when another delivery pass is already running, retry only genuinely blocked records, and reconcile newly created threads with current server state. Render the conversation chooser as a compact accessible menu with a working spinner, selected state, automatic Codex title, and persisted updated-at time for every thread.',
      summary:
        'Concurrent Codex activity test package: prevents independent working chats from appearing queued and adds a clear activity-aware conversation chooser.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps simultaneous Codex conversations trustworthy and makes their working and recent-use state easy to scan.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localMarkdownCodexChatPackage: AgentPackage = {
      ...localConcurrentCodexActivityPackage,
      id: localMarkdownCodexChatPackageId,
      version: 14,
      basePackageId: localConcurrentCodexActivityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.0',
      contractAddendum:
        'Saved, queued, optimistic, and visual Codex chat messages render safe structured Markdown. Supported presentation includes headings, emphasis, lists, blockquotes, links, inline and fenced code, rules, and tabular content without executing embedded HTML or allowing wide content to overflow the chat surface.',
      instructionsAddendum:
        'Render Markdown as escaped React elements rather than raw HTML. Restrict link protocols, identify external links, preserve keyboard access for horizontally scrollable code and tables, and contain long code, URLs, and table rows within the message at every required viewport.',
      summary:
        'Markdown Codex chat test package: renders structured responses safely with readable code, links, lists, quotes, and tables.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes technical Codex responses readable in Studio while retaining safe content handling and responsive chat geometry.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCompactCodexComposerPackage: AgentPackage = {
      ...localMarkdownCodexChatPackage,
      id: localCompactCodexComposerPackageId,
      version: 14.1,
      basePackageId: localMarkdownCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.1',
      contractAddendum:
        'Optimistic Codex messages reconcile against the exact persisted feedback record in the same render that the delivered user message appears. Text-only records retain their request identity after capture context is removed. The message textarea is compact while empty or while the reviewer scrolls upward and expands only through deliberate focus.',
      instructionsAddendum:
        'Attach each delivered browser request ID to its matching Codex user message, suppress the optimistic card immediately when that ID is queued or delivered, and never leave a stale Sending summary beside real work. Preserve draft text while compacting the textarea on upward transcript movement; restore the expanded editor on focus and provide reduced-motion behavior.',
      summary:
        'Compact Codex composer test package: removes duplicate Sending messages and collapses the draft editor while idle or reviewing earlier chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the active chat trustworthy while giving more transcript space to reviewers without losing an unsent draft.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSubscriptionBuilderPackage: AgentPackage = {
      ...localCompactCodexComposerPackage,
      id: localSubscriptionBuilderPackageId,
      version: 14.2,
      basePackageId: localCompactCodexComposerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.2',
      contractAddendum:
        'Every Agent Studio test build and complete prospect build uses the same persistent named tmux builder runtime. Trusted local workers default to the cached ChatGPT sign-in for subscription access; API-key billing requires an explicit opt-in. User-visible Codex messages remain persisted with their builder run and are not inserted into the general Studio conversation list.',
      instructionsAddendum:
        'Verify ChatGPT authentication before invoking Codex, strip API credentials from subscription-backed child processes, preserve token usage without estimating API spend, and keep the safe user/assistant build transcript scoped to the immutable run. Retain API-key mode only as an explicit protected deployment option.',
      summary:
        'Subscription builder runtime test package: moves test and proper builds onto the persistent tmux worker with build-scoped conversations.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Uses the reviewer’s Codex subscription for trusted local builds while keeping each saved build conversation in its own test or prospect record.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCameraRollPhotoUploadPackage: AgentPackage = {
      ...localSubscriptionBuilderPackage,
      id: localCameraRollPhotoUploadPackageId,
      version: 14.3,
      basePackageId: localSubscriptionBuilderPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.3',
      contractAddendum:
        'The shared Studio Codex composer accepts a JPEG, PNG, or WebP photo from the device photo library as visual context. The selected photo passes through the existing private visual review and attachment pipeline, with explicit type, size, loading, and failure states.',
      instructionsAddendum:
        'Expose a keyboard-labelled photo-library action only for image-capable models. Accept one supported photo smaller than 15 MB, preserve the unsent prompt, require visual review before sending, and never request direct camera capture when the reviewer chooses the photo-library action.',
      summary:
        'Camera-roll photo upload test package: adds reviewed device photo attachments to the shared Codex chat composer.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers provide existing phone photos as private visual context without routing them through screen capture.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRecentPromptChatTitlesPackage: AgentPackage = {
      ...localCameraRollPhotoUploadPackage,
      id: localRecentPromptChatTitlesPackageId,
      version: 14.4,
      basePackageId: localCameraRollPhotoUploadPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.4',
      contractAddendum:
        'Every Studio Codex conversation is labelled with a concise, readable title derived from that thread’s most recent user prompt. Capture provenance is excluded, and an older automatic thread name is used only when no prompt preview exists.',
      instructionsAddendum:
        'Prefer the current thread preview over its static name, remove appended Captured from provenance, normalize whitespace, and shorten only at a word boundary. Keep New chat for conversations without either source.',
      summary:
        'Recent-prompt chat titles test package: keeps the conversation chooser aligned with the latest request in every chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes concurrent chats recognizable by their current task instead of a stale title created earlier in the conversation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodespaceInterruptedChatRecoveryPackage: AgentPackage = {
      ...localRecentPromptChatTitlesPackage,
      id: localCodespaceInterruptedChatRecoveryPackageId,
      version: 14.5,
      basePackageId: localRecentPromptChatTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.5',
      contractAddendum:
        'A Codespace suspension is represented as an interrupted Codex turn rather than completed or indefinitely working. Studio preserves the saved transcript and workspace edits, explains that tmux cannot execute while the Codespace VM is paused, and offers a deliberate continuation action for the exact conversation.',
      instructionsAddendum:
        'Read the selected thread with turns before offering recovery. Continue only when its latest turn is interrupted and the thread is not active, resume a not-loaded thread through the app server, and start one explicit continuation turn that inspects and preserves the shared workspace before finishing the original request. Never automatically replay an original prompt or classify a completed turn as interrupted.',
      summary:
        'Codespace interrupted-chat recovery test package: identifies suspended turns and resumes them safely from saved work.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes unfinished parallel chat work understandable and recoverable after GitHub suspends and later restarts a Codespace.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDualRepositoryCodexWorkspacePackage: AgentPackage = {
      ...localCodespaceInterruptedChatRecoveryPackage,
      id: localDualRepositoryCodexWorkspacePackageId,
      version: 14.6,
      basePackageId: localCodespaceInterruptedChatRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.6',
      contractAddendum:
        'Every Codex conversation launched from the persistent Codespace terminal or the embedded Studio chat receives both Made Solid Git repositories as explicit runtime workspace roots: Studio at /workspaces/siteforge-os and the Made Solid website and Clientspace at /workspaces/made-solid-website.',
      instructionsAddendum:
        'Keep the repositories as siblings with separate Git histories and commits. Pass the website repository through the Codex CLI additional-directory option for terminal sessions and through app-server runtimeWorkspaceRoots for new, resumed, and continued embedded conversations. Never treat /workspaces as one Git repository.',
      summary:
        'Dual-repository Codex workspace test package: gives every local Studio chat explicit write access to both sibling repositories while preserving separate commits.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets one Codex conversation complete coordinated Studio and Clientspace work without losing the repositories’ independent histories.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexExperimentalWorkspaceCapabilityPackage: AgentPackage = {
      ...localDualRepositoryCodexWorkspacePackage,
      id: localCodexExperimentalWorkspaceCapabilityPackageId,
      version: 14.7,
      basePackageId: localDualRepositoryCodexWorkspacePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.7',
      contractAddendum:
        'The embedded Studio Codex client negotiates the app-server experimental API capability before it sends explicit runtime workspace roots. New conversations and queued or immediate messages can therefore start normally with both sibling Made Solid repositories available.',
      instructionsAddendum:
        'Send capabilities.experimentalApi=true in the one initialize request for every app-server transport connection before initialized or any thread method. Retain runtimeWorkspaceRoots on thread/start, thread/resume, and turn/start, and cover the capability handshake plus successful new-chat and delivery paths with focused tests.',
      summary:
        'Codex experimental workspace capability test package: restores new-chat creation and message delivery while retaining both repository roots.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Completes the dual-repository chat integration by negotiating the protocol capability required by its workspace-root field.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableUnmaterializedChatCleanupPackage: AgentPackage = {
      ...localCodexExperimentalWorkspaceCapabilityPackage,
      id: localReliableUnmaterializedChatCleanupPackageId,
      version: 14.8,
      basePackageId: localCodexExperimentalWorkspaceCapabilityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.8',
      contractAddendum:
        'A newly created Codex conversation can be abandoned and deleted before app-server materializes its rollout. Studio recognizes that narrow not-yet-materialized read response only for a thread it created locally, verifies that no queued work exists, and removes the unused conversation.',
      instructionsAddendum:
        'When deleting an empty chat, retain the normal server-side turn read for every materialized or externally discovered thread. If includeTurns reports not materialized for an id still held in the local started-thread cache, treat the cached zero-turn thread as empty and call thread/delete. Never generalize the fallback to unknown ids or active and queued conversations.',
      summary:
        'Reliable unmaterialized-chat cleanup test package: removes abandoned New chats cleanly before their first prompt.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps New chat cleanup consistent with the app-server lifecycle without risking conversations that contain work.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDurableCodexTurnRecoveryPackage: AgentPackage = {
      ...localReliableUnmaterializedChatCleanupPackage,
      id: localDurableCodexTurnRecoveryPackageId,
      version: 14.9,
      basePackageId: localReliableUnmaterializedChatCleanupPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v14.9',
      contractAddendum:
        'Every prompt accepted by the embedded Studio Codex bridge is persisted as an app-owned running turn with its app-server turn id. The server reconciles completion independently of the browser, and after a Codespace pause it resumes one interrupted app-owned turn from the saved transcript without replaying the original prompt.',
      instructionsAddendum:
        'Keep unfinished turn leases in private local storage until the app server reports a terminal state. On restart, recover an interrupted leased turn at most once, preserve both repository roots, and do not auto-recover when a queued interrupt or replacement message exists. Expose the packaged bubblewrap helper on PATH without root access, disable invalid shell snapshots in the Codespace launcher, and enable the Codex idle-sleep inhibitor.',
      summary:
        'Durable Codex turn recovery test package: keeps app-owned chats running independently of the panel and safely resumes work after a Codespace pause.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the browser-lifecycle dependency from embedded chats and makes Codespace suspension a recoverable server-side lifecycle event.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAgentTeamChatPackage: AgentPackage = {
      ...localDurableCodexTurnRecoveryPackage,
      id: localAgentTeamChatPackageId,
      version: 15,
      basePackageId: localDurableCodexTurnRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.0',
      contractAddendum:
        'The embedded Studio Codex composer offers an explicit Agent team work mode. An enabled request authorizes the parent Codex thread to supervise useful parallel sub-agents while the private bridge returns the real spawned-thread hierarchy, task, status, timing, and bounded sub-chat transcript.',
      instructionsAddendum:
        'Persist Direct or Agent team as a local reviewer preference and with each queued request. In Agent team mode, delegate only useful independent workstreams, keep final ownership in the parent thread, and never fabricate workers or progress. Discover descendants through the app-server ancestor-thread filter, preserve parent relationships, bound thread and transcript reads, and render live starting, working, completed, interrupted, and error states with accessible expandable sub-chats.',
      summary:
        'Agent team chat test package: adds explicit supervisor delegation and a live, inspectable hierarchy of attached Codex sub-chats.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Turns the Studio Codex modal into a transparent multi-agent workspace where reviewers can see delegated work happen and inspect each real sub-chat.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localColdProspectOffersPackage: AgentPackage = {
      ...localAgentTeamChatPackage,
      id: localColdProspectOffersPackageId,
      version: 15.1,
      basePackageId: localAgentTeamChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.1',
      contractAddendum:
        'Every approved prospect build produces an immutable scope-derived offer menu with a recommended milestone option, outright payment, an optional fixed-term managed plan, and a focused essentials launch. Repeated routes use capped volume pricing, the automatic cold-prospect offer ceiling is explicit, and company size never changes the price.',
      instructionsAddendum:
        'Calculate from the newest working source, show full-scope value internally, keep automatic first-engagement pricing within the reviewed ceiling, and require human review for complex application capability or unusually large value. Preserve every client choice and its total commitment through Clientspace acceptance. Require recorded channel compliance before human-controlled outreach.',
      summary:
        'Cold prospect offer test package: adds scale-aware automatic pricing, fixed client choices, managed-plan handoff, outreach safeguards and funnel visibility.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Standardises commercially clear cold-prospect offers without net-worth pricing and preserves the selected commitment through acceptance and billing.',
      stagedBehaviourIds: ['commercial-offer-strategy'],
    };
    const localInboundClientEmailReviewPackage: AgentPackage = {
      ...localColdProspectOffersPackage,
      id: localInboundClientEmailReviewPackageId,
      version: 15.2,
      basePackageId: localColdProspectOffersPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.2',
      contractAddendum:
        'A prospect workspace includes a context-aware email desk for inbound client messages. Every suggested reply stays review-only, names the saved business context used, preserves direct human edits, supports instruction-led draft revision, and never sends automatically.',
      instructionsAddendum:
        'Keep inbound messages and reply drafts attached to the exact prospect. Surface business stage, matched contact, verified research, open work, outreach safeguards, and explicit uncertainties. Alert a human when a draft needs review, preserve direct editing and revision history, and keep test fixtures visibly isolated from real delivery. Do not add or imply automatic sending.',
      summary:
        'Inbound client email review test package: adds a contextual review inbox, editable suggested replies, prompted revisions, and a safe dummy-account test flow.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Demonstrates a human-controlled client email copilot using the prospect workspace as grounded context while keeping delivery outside the test boundary.',
      stagedBehaviourIds: ['inbound-client-email-review'],
    };
    const localClientspaceAdminEmailReviewPackage: AgentPackage = {
      ...localInboundClientEmailReviewPackage,
      id: localClientspaceAdminEmailReviewPackageId,
      version: 15.3,
      basePackageId: localInboundClientEmailReviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.3',
      contractAddendum:
        'The context-aware inbound email review capability is available in both the Studio prospect workspace and the selected project’s Clientspace Admin Emails section. Clientspace keeps its reply inbox separate from the existing outbound composer and grounds every review-only draft in current project, commercial, release, message, document, and assistant state.',
      instructionsAddendum:
        'Default Clientspace Admin Emails to Inbox and replies while preserving Compose outbound as a separate view. Isolate dummy messages and drafts per project, persist the selected admin section in the URL, show the exact project context boundary, reset review after direct or prompted edits, and never route a test inbox reply through outbound delivery.',
      summary:
        'Clientspace Admin email review test package: extends contextual inbound replies into each admin client Email workspace without changing outbound delivery.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Gives Made Solid staff the same human-controlled reply review workflow at the client-administration stage with richer project and commercial context.',
      stagedBehaviourIds: ['inbound-client-email-review'],
    };
    const localResumableAgentTeamPackage: AgentPackage = {
      ...localClientspaceAdminEmailReviewPackage,
      id: localResumableAgentTeamPackageId,
      version: 15.4,
      basePackageId: localClientspaceAdminEmailReviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.4',
      contractAddendum:
        'Resuming an interrupted Agent team conversation restarts the supervising thread and every interrupted attached agent from its own saved sub-chat. Completed agents remain complete, active thread state overrides stale collaboration records, and the response identifies every restarted or failed child thread.',
      instructionsAddendum:
        'Before continuing an interrupted supervisor, discover and read its bounded descendant hierarchy. Start a continuation turn only for descendants whose saved turn is interrupted, preserve both workspace roots, then continue the supervisor with the real restart outcome. Visually mark each accepted descendant as Resuming until live thread state becomes working or complete, and surface partial restart failures as needing attention.',
      summary:
        'Resumable Agent team test package: restarts interrupted attached agents and visibly confirms each resumed assignment.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes recovery truthful for multi-agent work by continuing interrupted child threads as well as the supervisor and exposing that lifecycle in the team UI.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSpaciousCodexChatPackage: AgentPackage = {
      ...localResumableAgentTeamPackage,
      id: localSpaciousCodexChatPackageId,
      version: 15.5,
      basePackageId: localResumableAgentTeamPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.5',
      contractAddendum:
        'The Studio Codex client prioritizes readable prompts and technical output with a wider desktop panel, a compact conversation header, and a two-row composer. Model, reasoning, and Agent team preferences remain keyboard-accessible behind one clearly labelled settings control instead of permanently reducing transcript space.',
      instructionsAddendum:
        'Keep the empty or reviewing composer to a prompt row and a 44-pixel action toolbar. Expand the prompt only on deliberate focus, expose model, reasoning, and work mode in an anchored settings surface, close that surface with Escape, and preserve visible focus, accessible names, touch targets, and overflow-free layouts at every required viewport.',
      summary:
        'Spacious Codex chat test package: gives prompts and code output more room with a compact header, two-row composer, and on-demand settings panel.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes long prompts and technical responses easier to read without removing any capture, model, reasoning, or Agent team controls.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localTurnScopedAgentTeamsPackage: AgentPackage = {
      ...localSpaciousCodexChatPackage,
      id: localTurnScopedAgentTeamsPackageId,
      version: 15.6,
      basePackageId: localSpaciousCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.6',
      contractAddendum:
        'Every visible Agent team is scoped to the exact supervisor turn that spawned its root agents. The team panel follows the final visible output from that turn, remains there when later direct prompts are submitted, and a later delegated turn receives a separate team panel.',
      instructionsAddendum:
        'Return the parent turn identifier with every transcript message and descendant agent. Resolve nested agents through their root child thread, prefer persisted collaboration tool-call state, and use turn timing only as a compatibility fallback. Group agents by supervisor turn and render each group immediately after that turn’s latest visible message rather than in one global transcript footer.',
      summary:
        'Turn-scoped Agent teams test package: keeps every team beside the output that created it instead of following later prompts.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes multi-agent history read like a truthful conversation by preserving which output each team produced across later direct and delegated prompts.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localUninterruptedCodexRecoveryPackage: AgentPackage = {
      ...localTurnScopedAgentTeamsPackage,
      id: localUninterruptedCodexRecoveryPackageId,
      version: 15.7,
      basePackageId: localTurnScopedAgentTeamsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.7',
      contractAddendum:
        'An accepted Studio Codex turn is owned by the server rather than its browser viewer. Closing or suspending Chrome never requests interruption. After any number of Codespace restarts, each newly interrupted continuation is recovered exactly once from its persisted turn. Because App Server prohibits direct input to multi-agent child threads, the recovered supervisor must restart each interrupted descendant through followup_task before synthesis.',
      instructionsAddendum:
        'Run Codex maintenance immediately when the Studio server starts and before returning conversation status. Persist a recovering lease before starting a continuation, rebind a continuation already accepted before a bridge disconnect, and remove the lifetime one-recovery cap. Discover interrupted descendants and inject or steer exact followup_task recovery instructions into the supervisor; never send direct App Server input to a multi-agent child. An explicit queued Interrupt or replacement remains terminal for the superseded turn and must never be auto-recovered.',
      summary:
        'Uninterrupted Codex recovery test package: detaches accepted work from Chrome and repeatedly restores solo and Agent team turns after Codespace restarts.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes embedded Codex work survive phone disconnects and repeated Codespace lifecycle events without duplicate continuations or abandoned child agents.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSubscriptionSafeCodexRuntimePackage: AgentPackage = {
      ...localUninterruptedCodexRecoveryPackage,
      id: localSubscriptionSafeCodexRuntimePackageId,
      version: 15.8,
      basePackageId: localUninterruptedCodexRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.8',
      contractAddendum:
        'The Studio Codex Workspace Agent, Codex Website Builder, Codex Test Builder, and exported prospect workspace accept only ChatGPT subscription authentication. Each runtime enforces the ChatGPT login method, verifies the active session, strips API-key credentials, and stops instead of falling back to usage-based access. Separately billed OpenAI Analysis Workers are disabled by default and require matching protected-worker and visible UI opt-ins.',
      instructionsAddendum:
        'Pass forced_login_method="chatgpt" to every Codex App Server, exec, and editable-workspace invocation. Reject non-chatgpt builder modes, validate codex login status before startup, and never forward OPENAI_API_KEY, SITEFORGE_CODEX_API_KEY, or CODEX_API_KEY into a Codex subscription process. Gate each direct Responses or Images API feature behind SITEFORGE_OPENAI_API_ENABLED=true, disclose its billing boundary before a user-triggered call, and preserve deterministic or human-review fallbacks when the gate is off.',
      summary:
        'Subscription-safe Codex runtime test package: blocks API-key fallback for every Codex coding path and makes separately billed analysis explicit and default-off.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the billing boundary enforceable across Studio chat, test builds, complete builds, exported workspaces, and optional analysis rather than relying on deployment convention.',
      stagedBehaviourIds: ['visual-codex-feedback', 'framework-quality-gates'],
    };
    const localPermanentRailwayRuntimePackage: AgentPackage = {
      ...localSubscriptionSafeCodexRuntimePackage,
      id: localPermanentRailwayRuntimePackageId,
      version: 15.9,
      basePackageId: localSubscriptionSafeCodexRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v15.9',
      contractAddendum:
        'Made Solid Studio has a permanent Railway runtime in Singapore with a production-built authenticated web surface, supervised workers, loopback-only Codex App Server, persisted ChatGPT login and editable repositories, and expiring private build and workspace preview domains.',
      instructionsAddendum:
        'Serve Studio runtime actions only after validating the current Supabase session and organization membership. Persist Codex state, editable repositories, prospect workspaces, and private preview state on the mounted runtime volume. Keep the App Server on loopback, strip OpenAI API keys, force ChatGPT login, preserve dirty repositories during restart, and issue expiring capabilities for every separate preview origin.',
      summary:
        'Permanent Railway Studio runtime test package: keeps Studio, subscription-backed Codex, builds, workers, repositories, and private previews available after the browser closes.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Replaces the disposable Codespace lifecycle with a secured, persistent Studio runtime while retaining Supabase authorization and the existing ChatGPT subscription billing boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRailwayWorkspaceWritePackage: AgentPackage = {
      ...localPermanentRailwayRuntimePackage,
      id: localRailwayWorkspaceWritePackageId,
      version: 16,
      basePackageId: localPermanentRailwayRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.0',
      contractAddendum:
        'Every owner-authorized Railway Studio Codex conversation uses the workspace-write sandbox with only /data/workspaces/siteforge-os and /data/workspaces/made-solid-website as durable writable repository roots. New, resumed, queued, and recovered turns retain the same boundary.',
      instructionsAddendum:
        'Force ChatGPT subscription authentication and fail closed when it is unavailable. Start and resume threads with workspace-write, never danger-full-access, and override every turn with the two exact runtime repository roots, workspace-write policy, and no-approval escape boundary. Permit network access for builds and reviewed Git or deployment workflows without broadening filesystem writes beyond the repositories and standard ephemeral sandbox paths.',
      summary:
        'Railway workspace-write test package: confines every owner Codex chat to both Made Solid repositories while retaining subscription auth, builds, and deployment access.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Replaces the Railway Workspace Agent’s full-filesystem profile with an explicit two-repository write boundary that persists across every chat lifecycle.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRailwayPersistentCheckoutPackage: AgentPackage = {
      ...localRailwayWorkspaceWritePackage,
      id: localRailwayPersistentCheckoutPackageId,
      version: 16.1,
      basePackageId: localRailwayWorkspaceWritePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.1',
      contractAddendum:
        'The permanent Railway runtime verifies both persisted repository origins before launch. When GitHub authentication is temporarily unavailable, it preserves and starts from those existing checkouts instead of replacing them or crash-looping; a missing or mismatched checkout still fails closed.',
      instructionsAddendum:
        'Require GitHub access to both private repositories for initial provisioning and normal refresh. If that access is unavailable after both exact repositories have already been verified on the mounted volume, skip network refresh and preserve their current clean or dirty state. Never create, replace, or accept an unexpected repository while offline.',
      summary:
        'Railway persistent-checkout test package: keeps the private Studio available from verified volume checkouts during a temporary GitHub credential or provider outage.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes permanent Studio startup resilient without weakening the two-repository workspace-write boundary, owner gate, or ChatGPT subscription authentication.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRailwayContainerAccessPackage: AgentPackage = {
      ...localRailwayPersistentCheckoutPackage,
      id: localRailwayContainerAccessPackageId,
      version: 16.2,
      basePackageId: localRailwayPersistentCheckoutPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.2',
      contractAddendum:
        'Every owner-authorized Railway Studio Codex conversation uses danger-full-access inside the isolated Railway service container because that host cannot create Bubblewrap namespaces. New, resumed, queued, and recovered turns retain both configured workspace roots: /data/workspaces/siteforge-os and /data/workspaces/made-solid-website.',
      instructionsAddendum:
        'Force ChatGPT subscription authentication and fail closed when it is unavailable. Validate the exact owner user and organization before any runtime action. Start and resume threads and override every turn with danger-full-access plus no approvals inside the isolated Railway container, while continuing to pass only the two configured Made Solid repository roots as the conversation workspaces.',
      summary:
        'Railway container-access test package: avoids unsupported Bubblewrap namespaces while retaining owner-only access, subscription authentication, and both persistent repository workspaces.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Moves command isolation to the dedicated Railway container so Codex commands can run reliably without changing the application authentication or workspace configuration.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localFastCodexChatPackage: AgentPackage = {
      ...localRailwayContainerAccessPackage,
      id: localFastCodexChatPackageId,
      version: 16.3,
      basePackageId: localRailwayContainerAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.3',
      contractAddendum:
        'The Studio Codex chat settings expose the selected model’s Fast service tier independently from its reasoning level. The preference persists locally and applies consistently to new conversations, queued turns, interrupted continuations, and recovered work.',
      instructionsAddendum:
        'Discover service tiers from the live Codex model catalog. Enable Fast only when the selected model advertises the priority tier, label its increased usage clearly, default safely to Standard, and pass the selected service tier through every app-server thread and turn lifecycle without silently changing reasoning effort.',
      summary:
        'Fast Codex chat test package: adds a persistent, model-aware Fast setting with end-to-end priority-tier delivery.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Gives Studio reviewers the same explicit speed choice as Codex while preserving accurate model capability checks and lifecycle recovery.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAnimatedCodexChatPackage: AgentPackage = {
      ...localFastCodexChatPackage,
      id: localAnimatedCodexChatPackageId,
      version: 16.4,
      basePackageId: localFastCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.4',
      contractAddendum:
        'The Studio Codex chat enters and exits with a restrained, directional panel transition while preserving the dialog lifecycle, focus restoration, and immediate access to the workspace trigger.',
      instructionsAddendum:
        'Animate both the opening and closing dialog states with short opacity, translation, and scale transitions anchored to the launcher edge. Keep the exit state mounted until its animation completes and disable all panel and overlay motion for prefers-reduced-motion.',
      summary:
        'Animated Codex chat test package: adds polished open and close transitions with a reduced-motion fallback.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes opening and dismissing the Studio chat feel spatially connected to its launcher without delaying interaction or overriding accessibility preferences.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localInlineMultiImageCodexChatPackage: AgentPackage = {
      ...localAnimatedCodexChatPackage,
      id: localInlineMultiImageCodexChatPackageId,
      version: 16.5,
      basePackageId: localAnimatedCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.5',
      contractAddendum:
        'The active Studio Codex composer accepts up to five JPEG, PNG, or WebP images in one message. Selected images remain inside the current draft, can be removed individually, and move into the submitted user message without a separate visual-review dialog.',
      instructionsAddendum:
        'Append valid multi-file selections to the active draft, preserve the message and ready images after failures, reject invalid or excess files without discarding valid selections, and deliver every ready image as a localImage input in original selection order. Keep screenshot region selection available, then return the result to the same composer.',
      summary:
        'Inline multi-image Codex chat test package: keeps up to five selected photos and screenshots inside the active message composer and delivers them together.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the detached upload-review workflow and makes visual context behave like a durable, editable part of the current Codex message.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localContextualCodexChatPackage: AgentPackage = {
      ...localInlineMultiImageCodexChatPackage,
      id: localContextualCodexChatPackageId,
      version: 16.6,
      basePackageId: localInlineMultiImageCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.6',
      contractAddendum:
        'Studio chat distinguishes concise Codex progress commentary from final answers, asks for useful context at meaningful transitions, and gives new user, assistant, queued, and working states restrained directional easing with a static reduced-motion fallback.',
      instructionsAddendum:
        'During longer work, provide concise verified commentary before long tool runs and after meaningful findings or changes. Explain what is being checked, what changed, and what remains without exposing hidden reasoning or fabricating progress. Preserve message roles and commentary phases in the transcript, animate newly rendered states with restrained directional easing, and disable non-essential motion for prefers-reduced-motion.',
      summary:
        'Contextual Codex chat test package: adds meaningful progress notes and polished, accessible message motion.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes longer Codex turns feel responsive and understandable while preserving truthful status, transcript semantics, and reduced-motion access.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPrivateWorkspacePreviewAccessPackage: AgentPackage = {
      ...localContextualCodexChatPackage,
      id: localPrivateWorkspacePreviewAccessPackageId,
      version: 16.7,
      basePackageId: localContextualCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.7',
      contractAddendum:
        'The permanent Studio runtime issues working, expiring capabilities for the private editable-workspace preview domain so authenticated reviewers can see the current source immediately without publishing it.',
      instructionsAddendum:
        'Verify private workspace-preview capabilities against the current clock, reject expired or invalid signatures, exchange a valid query capability for the secure preview cookie, and proxy only the active matching workspace. Keep the preview private, expiring, no-index, and separate from production publication.',
      summary:
        'Private workspace preview access test package: restores valid expiring links for immediate review of the active Studio or website source.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the existing private Railway preview lane usable for immediate source review while preserving its signed, expiring access boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localMessageMotionCodexChatPackage: AgentPackage = {
      ...localPrivateWorkspacePreviewAccessPackage,
      id: localMessageMotionCodexChatPackageId,
      version: 16.8,
      basePackageId: localPrivateWorkspacePreviewAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.8',
      contractAddendum:
        'The Studio Codex chat moves an outgoing message from the active composer into the transcript immediately, restores the exact draft after delivery failure, and presents active Codex generation as a restrained animated assistant-side message.',
      instructionsAddendum:
        'Render an optimistic outgoing message synchronously when Send is activated, clear and collapse the submitted composer, reconcile the optimistic record with the accepted turn, and restore its text and images on failure. Keep the generating treatment on the assistant side, announce working state once through status semantics, and disable all decorative message motion for prefers-reduced-motion.',
      summary:
        'Message-motion Codex chat test package: adds immediate composer-to-thread delivery motion and a compact animated assistant response state.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes sending and waiting feel spatially connected to the conversation while retaining failure recovery and reduced-motion access.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAgentTeamClarityPackage: AgentPackage = {
      ...localMessageMotionCodexChatPackage,
      id: localAgentTeamClarityPackageId,
      version: 16.9,
      basePackageId: localMessageMotionCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v16.9',
      contractAddendum:
        'The Studio Codex chat presents only the Agent team that belongs to the current or latest visible supervisor turn, labels each assignment from its actual agent path, and shows only child-owned result updates rather than inherited supervisor history.',
      instructionsAddendum:
        'Map current App Server subAgentActivity records to their exact supervisor turn while retaining legacy compatibility. Exclude inherited parent turns from child status and transcript data, keep historical teams out of unrelated transcript windows, anchor the visible team to its initiating request, and summarize assigned, working, and complete counts once. A completed turn remains completed when a follow-up is queued.',
      summary:
        'Agent-team clarity test package: removes inherited and historical chat noise, fixes exact turn placement, and reports one truthful team status.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes Agent team delegation understandable and trustworthy without exposing copied supervisor prompts or misleading lifecycle state.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localStableWorkspacePreviewPackage: AgentPackage = {
      ...localAgentTeamClarityPackage,
      id: localStableWorkspacePreviewPackageId,
      version: 17,
      basePackageId: localAgentTeamClarityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.0',
      contractAddendum:
        'The stable private workspace domain redirects an expired or missing browser capability through the authenticated owner-only Studio runtime, issues fresh access for the active development directory, and returns to the same workspace path with a clean browser URL.',
      instructionsAddendum:
        'When workspace preview access is missing, expired, or belongs to an earlier active directory, redirect only top-level document navigation to the configured HTTPS Studio origin. Require the existing Supabase owner authorization before issuing a fresh capability, preserve the requested same-origin workspace path, exchange the capability for the secure cookie, and keep assets, non-document requests, indexing, and unauthorized accounts blocked.',
      summary:
        'Stable workspace preview test package: makes the normal private workspace domain recover expired access through the signed-in Studio owner session.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the non-production workspace preview reachable at its normal domain without turning it into a public or permanent bearer link.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRestartableWorkspacePreviewPackage: AgentPackage = {
      ...localStableWorkspacePreviewPackage,
      id: localRestartableWorkspacePreviewPackageId,
      version: 17.1,
      basePackageId: localStableWorkspacePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.1',
      contractAddendum:
        'An authenticated workspace-preview access request verifies the recorded upstream and, after a Railway restart, relaunches the saved active repository from an approved persistent workspace root before issuing fresh private access.',
      instructionsAddendum:
        'Treat an unreachable active-preview port as recoverable only after owner authorization. Resolve the saved directory against the configured Studio, Made Solid website, or prospect workspace roots, require its Git repository and package manifest, share concurrent recovery attempts, launch through the existing persistent terminal contract, wait for a real HTTP response, and reject unknown or missing directories.',
      summary:
        'Restartable workspace preview test package: restores the saved private development server after Railway replaces the application container.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the stable non-production workspace URL usable across deployments without trusting arbitrary paths or weakening private access.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRenderableWorkspacePreviewPackage: AgentPackage = {
      ...localRestartableWorkspacePreviewPackage,
      id: localRenderableWorkspacePreviewPackageId,
      version: 17.2,
      basePackageId: localRestartableWorkspacePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.2',
      contractAddendum:
        'A recovered editable workspace runs its development command with an explicit development environment so Vite and React Fast Refresh install matching browser transforms and the private preview renders instead of returning a blank document.',
      instructionsAddendum:
        'Launch every recovered workspace with NODE_ENV=development even when the permanent Railway parent process runs in production. Keep framework-specific host arguments, wait for the upstream HTTP response, then verify the rendered page in real mobile, tablet, and desktop browsers for console errors, failed resources, and non-empty pixels before reporting the preview ready.',
      summary:
        'Renderable workspace preview test package: prevents the recovered Vite source from loading as a blank page under Railway production settings.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes successful HTTP recovery match actual browser readiness instead of treating an empty React root as a working preview.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAuthenticatedStudioControlsPackage: AgentPackage = {
      ...localRenderableWorkspacePreviewPackage,
      id: localAuthenticatedStudioControlsPackageId,
      version: 17.3,
      basePackageId: localRenderableWorkspacePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.3',
      contractAddendum:
        'Studio-only controls, including the Codex Workspace Agent, mount only after the configured Supabase client confirms an authenticated session. Signed-out, loading, error, preview-access, and embedded-panel entry states expose no chat control and initiate no Codex runtime request.',
      instructionsAddendum:
        'Keep all privileged Studio tools behind the confirmed session boundary. Test every public entry route while signed out at mobile, tablet, and desktop sizes; assert that no Codex launcher, dialog, embedded panel, stored draft, or Codex runtime request is exposed before authentication.',
      summary:
        'Authenticated Studio controls test package: removes private chat controls and internal sign-in details from public workspace entry states.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents anonymous visitors from mounting private Studio tools while retaining server-side authorization on every runtime endpoint.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localObservableCodexActivityPackage: AgentPackage = {
      ...localAuthenticatedStudioControlsPackage,
      id: localObservableCodexActivityPackageId,
      version: 17.4,
      basePackageId: localAuthenticatedStudioControlsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.4',
      contractAddendum:
        'The Studio Codex chat logs chronological observable activity entries inline between conversation messages, so verified workspace actions, lifecycle states, and results remain attached to the point in the exchange where they occurred. Activity is derived only from observable runtime events and never exposes or invents private model reasoning.',
      instructionsAddendum:
        'Interleave observable activity entries with user, assistant-progress, and final messages using their real turn and item order. Present concise verified action labels, details, status, and duration with distinctive accessible styling and restrained motion plus a static prefers-reduced-motion variant. Do not collect the entries into a persistent bottom workbench, and never present hidden chain-of-thought or inferred internal reasoning.',
      summary:
        'Observable Codex activity test package: logs verified chronological workspace activity inline with the chat without exposing private reasoning.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps a clear, animated history of observable Codex work in its conversational context while preserving the boundary around private reasoning.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDeviceVoiceReadAloudPackage: AgentPackage = {
      ...localObservableCodexActivityPackage,
      id: localDeviceVoiceReadAloudPackageId,
      version: 17.5,
      basePackageId: localObservableCodexActivityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.5',
      contractAddendum:
        "Completed assistant replies in the Studio Codex chat offer an explicit read-aloud action backed by the browser speech-synthesis service and voices available on the reviewer's device, without an API key or separately billed speech service. Only one reply plays at a time, and playback remains scoped to the active chat.",
      instructionsAddendum:
        "Add accessible read-aloud controls to completed assistant replies. Start speech only from the reviewer's action; support play, pause or resume, and stop, cancel speech when the active chat changes or the control unmounts, and announce meaningful playback or unsupported-state changes. Use available device voices with a language-appropriate fallback, split long replies into bounded readable segments, and account for mobile browsers that cancel rather than pause an utterance. Never claim these device voices are ChatGPT voices or send speech text to a Made Solid or OpenAI API.",
      summary:
        'Device voice read aloud test package: reads completed Codex replies with free browser speech synthesis and accessible, chat-scoped playback controls.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds useful hands-free review without API credentials or per-character speech charges while keeping browser and device voice limitations explicit.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexConversationLoadingPackage: AgentPackage = {
      ...localDeviceVoiceReadAloudPackage,
      id: localCodexConversationLoadingPackageId,
      version: 17.6,
      basePackageId: localDeviceVoiceReadAloudPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.6',
      contractAddendum:
        'When a reviewer switches Codex conversations or creates a new chat, the Studio immediately replaces the previous transcript with a stable, accessible loading surface and renders only the requested conversation after its data is ready.',
      instructionsAddendum:
        'Use one request-scoped transition state for conversation switching and creation. Remove stale messages from the active transcript immediately, preserve transcript geometry with Codex-native skeletons, announce the verified loading state, prevent duplicate or misrouted chat actions, and provide a static prefers-reduced-motion presentation. Restore the previous chat with a clear error if switching fails.',
      summary:
        'Codex conversation loading test package: adds a polished, stale-safe loading experience for chat switching and creation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps chat navigation clear and trustworthy while a selected or newly created Codex conversation is loading.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexSubscriptionUsagePackage: AgentPackage = {
      ...localCodexConversationLoadingPackage,
      id: localCodexSubscriptionUsagePackageId,
      version: 17.7,
      basePackageId: localCodexConversationLoadingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.7',
      contractAddendum:
        "The Studio Codex chat settings show the reviewer's current subscription quota usage directly from the signed-in Codex App Server account. Each available quota window remains separate and includes its verified usage percentage, duration, and reset time; unavailable usage never interrupts chat or produces an estimated value.",
      instructionsAddendum:
        'Read subscription quota from account/rateLimits/read and select the overall codex bucket rather than an arbitrary model-specific bucket. Validate and bound only the public usedPercent, windowDurationMins, and resetsAt fields. Render each primary or secondary window with an accessible progress meter and explicit reset detail in Chat settings. If the rate-limit read is unsupported or fails, keep chat operational and show a truthful unavailable state. Never derive subscription quota from conversation tokens or credit balances.',
      summary:
        'Codex subscription usage test package: shows live quota percentages and reset windows in chat settings without estimating usage.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Gives reviewers a trustworthy view of their current Codex allowance at the point where they choose models, reasoning, Fast mode, and Agent teams.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localEvidenceLinkedCodexActivityPackage: AgentPackage = {
      ...localCodexSubscriptionUsagePackage,
      id: localEvidenceLinkedCodexActivityPackageId,
      version: 17.8,
      basePackageId: localCodexSubscriptionUsagePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.8',
      contractAddendum:
        'The Studio Codex transcript can associate structural observable outcomes and explicit assistant commentary chronologically within the turn where they occurred. Each outcome remains evidence-linked to its observable runtime event and exposes only bounded public metadata; it never presents inferred conclusions, raw command output, diffs, tool results, or private reasoning.',
      instructionsAddendum:
        'Build chronological chat activity only from explicit assistant commentary and allowlisted structural outcomes emitted by the Codex App Server, preserving their real turn and item order and stable evidence association. Structural outcomes may identify bounded facts such as a lifecycle change, affected-file count, completed check, browser verification, or delegated task state. Do not infer conclusions from those events, and never render raw command output, file diffs, tool-call inputs or results, hidden chain-of-thought, or private reasoning.',
      summary:
        'Evidence-linked Codex activity test package: associates structural work outcomes with explicit commentary in chronological chat order while keeping private execution data hidden.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes observable Codex work more useful and auditable by linking concise structural outcomes to the commentary that explains them without exposing private execution detail.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableFullReplyReadingPackage: AgentPackage = {
      ...localEvidenceLinkedCodexActivityPackage,
      id: localReliableFullReplyReadingPackageId,
      version: 17.9,
      basePackageId: localEvidenceLinkedCodexActivityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v17.9',
      contractAddendum:
        "Completed Codex replies provide reliable, user-initiated English read-aloud for the full reply using the reviewer's available device voices. Playback advances through every bounded chunk in order and exposes an explicitly estimated elapsed-and-total timeline; it remains scoped to the active reply and chat.",
      instructionsAddendum:
        'Extend the existing browser speech-synthesis read-aloud behaviour without adding a separately billed speech service. Select only reported English voices, preferring a local Australian English voice, and mark each utterance as English. Read every speech-friendly chunk of the completed reply exactly once and ignore stale completion events so long replies cannot skip, repeat, or stop early. Show an accessible estimated elapsed-and-total timeline while playing, freeze it while paused, and clear it when playback stops, completes, errors, the reply changes, or the active chat changes.',
      summary:
        'Reliable full-reply reading test package: reads completed Codex replies fully in English with resilient device-voice playback and an estimated timeline.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes free device-voice playback dependable for long English replies and gives reviewers an honest sense of listening progress without claiming an exact audio duration.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSeamlessStudioHydrationPackage: AgentPackage = {
      ...localReliableFullReplyReadingPackage,
      id: localSeamlessStudioHydrationPackageId,
      version: 18.0,
      basePackageId: localReliableFullReplyReadingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.0',
      contractAddendum:
        'Studio source edits apply without restarting the reviewer workspace. The Codex bridge reloads independently from the Vite configuration lifecycle, and ordinary hot updates announce a brief accessible top status while the active route and rendered workspace remain mounted.',
      instructionsAddendum:
        'Keep the frequently edited Codex feedback bridge outside the Vite config dependency graph and reload its runtime module by source modification time without interrupting active maintenance or delivery. Preserve transient started-thread state when replacing the bridge instance. Announce ordinary Vite hot updates through the existing Studio top synchronization status, keep the current route and content mounted, and provide a static prefers-reduced-motion presentation.',
      summary:
        'Seamless Studio hydration test package: applies Studio source edits in place behind an accessible top loading notice without restarting the reviewer workspace.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps Codex-driven Studio refinement usable during live source edits by separating bridge updates from the application server and making brief UI hydration visible without a disruptive reload.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDeletableQueuedCodexMessagesPackage: AgentPackage = {
      ...localSeamlessStudioHydrationPackage,
      id: localDeletableQueuedCodexMessagesPackageId,
      version: 18.1,
      basePackageId: localSeamlessStudioHydrationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.1',
      contractAddendum:
        'Each waiting Studio Codex chat message can be deleted by its exact queue identifier before dispatch, with explicit confirmation and without changing sibling queued messages.',
      instructionsAddendum:
        'Expose a labelled Delete action on every queued message, confirm the irreversible removal in an accessible dialog, and disable duplicate actions while it is pending. Claim a queued record before dispatch so deletion and delivery cannot race; a cancelled record must never be sent, interrupted, or presented as current queued work.',
      summary:
        'Deletable queued Codex messages test package: removes an exact waiting message safely before Codex receives it.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers remove mistaken or obsolete queued directions without interrupting the active reply or affecting other waiting messages.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSelectableGoogleCodexVoicesPackage: AgentPackage = {
      ...localDeletableQueuedCodexMessagesPackage,
      id: localSelectableGoogleCodexVoicesPackageId,
      version: 18.2,
      basePackageId: localDeletableQueuedCodexMessagesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.2',
      contractAddendum:
        'Completed Studio Codex replies can use owner-authenticated Google Chirp 3 HD Australian English audio. Reviewers choose and preview an allow-listed voice in chat settings, retain that choice locally, hear every bounded reply chunk, and use exact generated-audio playback time and seeking. Google credentials remain server-only, generated audio remains private and ephemeral, and the corrected English device voice remains the automatic fallback.',
      instructionsAddendum:
        'Expose only the documented en-AU Chirp 3 HD voice set through the authenticated private Studio runtime. Exchange a server-only least-privilege service-account assertion for a short-lived Google access token, validate voice and UTF-8 text bounds, redact upstream errors, and return private no-store MP3 audio without persisting it. In chat settings, provide a labelled voice selector and explicit preview/stop control, save the selected voice locally, and revoke every audio object URL. For completed replies, show loading, pause, resume, stop, exact elapsed and total audio time, and keyboard-accessible seeking. Abort and clean up on reply replacement, conversation change, panel close, navigation, or failure; fall back to English device speech when Google is unavailable.',
      summary:
        'Selectable Google Codex voices test package: adds private Australian Chirp voice previews and exact seekable full-reply playback with free device fallback.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Gives the owner consistent natural Australian read-aloud voices with test-before-select settings while preserving private authentication, bounded cost, and a no-service fallback.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDurableCodexChatSessionPackage: AgentPackage = {
      ...localSelectableGoogleCodexVoicesPackage,
      id: localDurableCodexChatSessionPackageId,
      version: 18.3,
      basePackageId: localSelectableGoogleCodexVoicesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.3',
      contractAddendum:
        'A Studio refresh restores an open Codex chat to the same selected conversation and saved reading position. Each recent conversation retains its own bounded viewport anchor, offset, and follow-latest state without changing the active prospect route.',
      instructionsAddendum:
        'Persist only bounded local Codex chat session UI state: whether the panel was open, the exact selected thread ID, and up to 25 recent per-thread transcript positions. Save a stable visible message or activity anchor with its viewport offset and a scrollTop fallback. Restore only after the requested thread transcript is rendered; retain bottom-following only when it was active before refresh. A deliberate close remains closed after refresh, and invalid or unavailable storage must leave chat usable.',
      summary:
        'Durable Codex chat session test package: restores the open conversation and exact transcript reading position after refresh.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers refresh or recover the Studio without losing the Codex conversation and place they were actively reading.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localImageOnlyCodexMessagePackage: AgentPackage = {
      ...localDurableCodexChatSessionPackage,
      id: localImageOnlyCodexMessagePackageId,
      version: 18.4,
      basePackageId: localDurableCodexChatSessionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.4',
      contractAddendum:
        'A ready image attachment is sufficient content for a Studio Codex message. The composer enables Send and submits the image in selection order even when the text field is empty. Pending attachment previews remain scoped to their originating conversation while delivery is reconciled.',
      instructionsAddendum:
        'Treat trimmed message text or at least one ready image attachment as valid composer content. Keep Send disabled only when both are absent, and preserve the existing model capability, preparation, conversation-transition, and delivery guards. Submit an empty prompt with the ready screenshots when no text was entered. Record the originating thread on every optimistic message and render or reconcile it only against that exact thread.',
      summary:
        'Image-only Codex message test package: sends uploaded visual context without typed text and keeps its preview in the originating conversation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers use a screenshot or photo as the complete Codex request when the visual itself contains the needed context.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLiveEditableStudioRuntimePackage: AgentPackage = {
      ...localImageOnlyCodexMessagePackage,
      id: localLiveEditableStudioRuntimePackageId,
      version: 18.5,
      basePackageId: localImageOnlyCodexMessagePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.5',
      contractAddendum:
        'The permanent Railway Studio domain serves the editable persistent Studio checkout rather than an older image snapshot. Reviewed source edits appear through Vite hot updates, survive runtime replacement on the mounted volume, and remain separate from the private prospect workspace-preview domain.',
      instructionsAddendum:
        'After preparing the verified persistent repositories, launch the Studio Vite development server from the exact SITEFORGE_STUDIO_WORKSPACE_DIR checkout with NODE_ENV=development on the configured Studio port. Reuse the image-owned locked dependency installation only when the checkout has no node_modules and never overwrite a workspace-managed dependency directory. Allow the configured Railway Studio hostname in the development server, retain the existing CSP and owner-authenticated private runtime routes, and keep the preview host, prospect workspace proxy, workers, and Codex App Server on their existing separate ports.',
      summary:
        'Live editable Studio runtime test package: keeps persistent Studio source edits visible immediately after Railway restarts instead of reverting to the image snapshot.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the permanent Studio address the durable live refinement surface while preserving the separate private prospect preview and existing authentication boundaries.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localGlobalGoogleVoiceCataloguePackage: AgentPackage = {
      ...localLiveEditableStudioRuntimePackage,
      id: localGlobalGoogleVoiceCataloguePackageId,
      version: 18.6,
      basePackageId: localLiveEditableStudioRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.6',
      contractAddendum:
        'Codex read-aloud settings expose the complete current Google Cloud Text-to-Speech voice catalogue rather than one locale. Reviewers filter by language and model, see plain quality and cost-position labels, preview a voice, and retain the exact selected voice for later replies.',
      instructionsAddendum:
        'Fetch the authenticated Google voices:list catalogue server-side, cache it briefly, and return only sanitized voice metadata. Derive synthesis language from the selected allow-listed catalogue entry; never trust a client-supplied model or language. Present language, model quality, and voice as progressive filters, recommend Chirp 3 HD for natural chat reading, label specialist, legacy, preview, and lower-cost tiers without implying that price alone guarantees quality, and keep voice preview and device fallback behavior accessible.',
      summary:
        'Global Google voice catalogue test package: adds every available language and voice with previewable, clearly labelled model-quality tiers.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the reviewer compare Google voices worldwide and understand which models favor natural quality, narration, or lower cost before saving a choice.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAuthenticatedGoogleVoiceCataloguePackage: AgentPackage = {
      ...localGlobalGoogleVoiceCataloguePackage,
      id: localAuthenticatedGoogleVoiceCataloguePackageId,
      version: 18.7,
      basePackageId: localGlobalGoogleVoiceCataloguePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.7',
      contractAddendum:
        'Google Cloud authentication uses the standards-compliant JWT bearer grant so the live global voice catalogue and selected cloud playback load instead of silently falling back to Australian device voices.',
      instructionsAddendum:
        'Exchange the signed service-account assertion with the exact OAuth JWT bearer grant identifier urn:ietf:params:oauth:grant-type:jwt-bearer. Keep a regression assertion for the full identifier before accepting global catalogue or synthesis behavior.',
      summary:
        'Authenticated Google voice catalogue test package: loads the worldwide Google catalogue and cloud playback with the valid OAuth grant.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Restores the intended worldwide voice selection and Google audio while retaining the safe Australian fallback for genuine upstream outages.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResilientStudioSessionRecoveryPackage: AgentPackage = {
      ...localAuthenticatedGoogleVoiceCataloguePackage,
      id: localResilientStudioSessionRecoveryPackageId,
      version: 18.8,
      basePackageId: localAuthenticatedGoogleVoiceCataloguePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.8',
      contractAddendum:
        'Studio runtime requests recover once from a stale signed-in session, malformed workspace cookies cannot stop the private preview proxy, and unavailable preview documents return through authenticated Studio re-entry.',
      instructionsAddendum:
        'Refresh and replay a Studio runtime request once after an authenticated 401, then clear only the invalid local session and request sign-in. Treat malformed preview capabilities as absent, bound preview upstream waits, and redirect unavailable top-level preview documents through the authenticated Studio recovery route without exposing access tokens.',
      summary:
        'Resilient Studio session recovery test package: recovers stale sessions and private previews without deleting browser cookies.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps returning mobile reviewers in a recoverable signed-in flow while preventing malformed or stale preview cookies from taking down the shared Railway runtime.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRenderableRailwayStudioPackage: AgentPackage = {
      ...localResilientStudioSessionRecoveryPackage,
      id: localRenderableRailwayStudioPackageId,
      version: 18.9,
      basePackageId: localResilientStudioSessionRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v18.9',
      contractAddendum:
        'The live editable Railway Studio always starts Vite with a clean development dependency graph, so React development transforms receive the matching jsxDEV runtime instead of rendering a blank page from a stale production optimizer cache.',
      instructionsAddendum:
        'Launch the Railway Vite server with NODE_ENV unset, explicit development mode, and forced dependency optimization. Keep the editable persistent Studio checkout as the source root, retain the authenticated runtime plugin, and verify the public Studio renders without page errors at mobile, tablet, and desktop widths. Preserve workspace.madesolid.com.au re-entry through the authenticated Studio route.',
      summary:
        'Renderable Railway Studio test package: prevents the blank live Studio screen by rebuilding Vite dependencies with the matching React development runtime.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the permanent editable Studio reliably render after live source changes and Railway restarts without replacing either persistent repository.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localStudioOwnedWorkspaceShellPackage: AgentPackage = {
      ...localRenderableRailwayStudioPackage,
      id: localStudioOwnedWorkspaceShellPackageId,
      version: 19,
      basePackageId: localRenderableRailwayStudioPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.0',
      contractAddendum:
        'Editable client websites run inside a Studio-owned workspace shell with a persistent return path and Studio Codex access; generated client source no longer contains the Codex panel or its host bridge.',
      instructionsAddendum:
        'Keep workspace navigation and Codex controls in the authenticated Studio shell, outside the generated client project. Open the private client development server inside that shell, preserve a clear Back to Studio route across refresh and direct stable-host re-entry, and fall back to same-tab navigation when a browser blocks the requested preview tab. Do not add Studio iframe, bridge, chat, or navigation files to generated website source.',
      summary:
        'Studio-owned workspace shell test package: keeps editable client previews recoverable while moving Codex and return navigation out of client project files.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents the client dev server from trapping reviewers and keeps Studio editing tools separate from deliverable website source.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localClientScopedCodexChatsPackage: AgentPackage = {
      ...localStudioOwnedWorkspaceShellPackage,
      id: localClientScopedCodexChatsPackageId,
      version: 19.1,
      basePackageId: localStudioOwnedWorkspaceShellPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.1',
      contractAddendum:
        'The client website editor separates conversations for the current client from universal Studio conversations, hides every other client, and binds new client conversations to that website repository only.',
      instructionsAddendum:
        'Resolve client chat scope on the server from the authenticated editable workspace. List only conversations whose exact working directory is the current client repository plus explicitly universal Studio conversations. Reject cross-client thread IDs for reads and mutations. Start client conversations with the exact client directory as their only writable runtime root, preserve that boundary through queued turns and interruption recovery, and label the scope persistently in the editor UI. Keep universal conversations available and clearly identified without presenting them as client-confined.',
      summary:
        'Client-scoped Codex chats test package: isolates each website editor while retaining clearly labelled universal Studio conversations.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers run multiple website-specific chats without exposing or accidentally editing another client project.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localWorkspaceHostedEditorShellPackage: AgentPackage = {
      ...localClientScopedCodexChatsPackage,
      id: localWorkspaceHostedEditorShellPackageId,
      version: 19.2,
      basePackageId: localClientScopedCodexChatsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.2',
      contractAddendum:
        'The stable workspace hostname remains the reviewer-facing development workspace, with a native runtime-owned shell around the isolated live client preview and an exact-client Codex editor.',
      instructionsAddendum:
        'Serve a native runtime-owned top-level editor shell at workspace.madesolid.com.au without adding Studio files to the client repository. Keep the client development server inside an opaque sandboxed preview frame, preserve live updates and refresh on the workspace hostname, and make Back to Studio navigate the top-level browser to Studio. Frame only a dedicated Studio Codex document that exchanges a short-lived exact-client capability for an HttpOnly cookie; keep normal Studio documents non-frameable from Workspace and bind every embedded Codex request to that same client.',
      summary:
        'Workspace-hosted editor shell test package: restores the distinct live development workspace instead of redirecting its browser tab to Studio.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps Workspace as the dedicated instant-update editing place while preserving Studio ownership and client repository isolation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLiveCodexLauncherRecoveryPackage: AgentPackage = {
      ...localWorkspaceHostedEditorShellPackage,
      id: localLiveCodexLauncherRecoveryPackageId,
      version: 19.3,
      basePackageId: localWorkspaceHostedEditorShellPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.3',
      contractAddendum:
        'The Railway Codex app-server starts with only configuration keys supported by the pinned Codex CLI, preserving the owner-only ChatGPT subscription runtime and restoring the live launcher.',
      instructionsAddendum:
        'Start the Railway Codex app-server with strict configuration, forced ChatGPT authentication, danger-full-access inside the isolated container, and no approvals. Do not pass unsupported sandbox_permissions configuration. Retain the exact owner and organization authorization gate and both configured Made Solid repository roots for universal Studio conversations.',
      summary:
        'Live Codex launcher recovery test package: removes the unsupported startup option that hid the otherwise owner-authenticated Railway launcher.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the private Railway Codex launcher available after deployment without weakening authentication or changing its two-repository runtime boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLockedWorkspaceDevDependenciesPackage: AgentPackage = {
      ...localLiveCodexLauncherRecoveryPackage,
      id: localLockedWorkspaceDevDependenciesPackageId,
      version: 19.4,
      basePackageId: localLiveCodexLauncherRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.4',
      contractAddendum:
        'Every editable client workspace installs the complete dependency graph pinned by its lockfile, including development tooling, even when the Railway container itself runs with NODE_ENV=production.',
      instructionsAddendum:
        'Run npm ci with --include=dev whenever Studio prepares a cloned client repository, an exported completed build, or an immutable committed-preview worktree. Keep NODE_ENV=development for the website development server, and never allow Next.js to repair, install, or upgrade missing TypeScript tooling in client project files.',
      summary:
        'Locked workspace development dependencies test package: preserves client lockfiles and prevents Next.js from mutating editable website projects on Railway.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes every client website workspace reproducible on Railway by installing its exact locked development toolchain before Next.js starts.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableWorkspaceDevelopmentSurfacesPackage: AgentPackage = {
      ...localLockedWorkspaceDevDependenciesPackage,
      id: localReliableWorkspaceDevelopmentSurfacesPackageId,
      version: 19.5,
      basePackageId: localLockedWorkspaceDevDependenciesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.5',
      contractAddendum:
        'Made Solid Workspace visibly remains the stable instant-development environment. Its opaque client frame receives a short-lived partitioned frame capability so same-client CSS, JavaScript, images, and live updates load without making the top-level capability cross-site, while the dedicated scoped Codex document is transformed by Vite before rendering.',
      instructionsAddendum:
        'Present the current client preview and client-scoped Codex as explicit Workspace surfaces with Preview and Codex controls, a desktop split editing state, and one-surface-at-a-time mobile switching. Label navigation to Studio as an intentional exit. Keep the top-level capability cookie HttpOnly, Secure, and SameSite=Strict; use an HttpOnly, Secure, SameSite=None, Partitioned cookie only for the opaque client frame; reject ambiguous cross-client frame cookies; and constrain proxied client documents to same-origin framing. Preserve only the validated non-secret last workspace directory in a separate long-lived Strict cookie so an expired bare visit can ask authenticated Studio to issue a fresh capability for that client. Transform the dedicated Codex HTML through Vite so React refresh and the real editor render, while normal Studio pages remain non-frameable from Workspace.',
      summary:
        'Reliable Workspace development surfaces test package: restores client assets and Codex rendering while making Preview, scoped Codex, instant updates, and Studio exit unambiguous.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes Workspace visibly and technically behave as the stable live client development environment without weakening client or Studio isolation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localOpaqueWorkspaceFrameCapabilityPackage: AgentPackage = {
      ...localReliableWorkspaceDevelopmentSurfacesPackage,
      id: localOpaqueWorkspaceFrameCapabilityPackageId,
      version: 19.6,
      basePackageId: localReliableWorkspaceDevelopmentSurfacesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.6',
      contractAddendum:
        'Keep the client development document in an opaque sandbox on the distinct private Preview origin. Authenticate the document, every rewritten runtime asset, navigation, API path, and HMR upgrade through one short-lived exact-client signed capability path instead of a frame cookie.',
      instructionsAddendum:
        'Never grant allow-same-origin to the live client frame and never serve client assets from the Workspace origin. Route the live document through the existing private Preview host, rewrite HTML, CSS, JavaScript, JSON, Vite, Next, redirect, and websocket roots beneath its exact signed capability, and validate the capability and current active directory on every request. Keep proxy responses private and no-store, with no referrer, cookies, service-worker scope, site-data clearing, or remote connections and forms. Preserve any upstream CSP sandbox directive, allow framing only from the exact Workspace origin, strip the capability before proxying upstream, and reject expired, mismatched, stale-client, and cross-client paths.',
      summary:
        'Opaque Workspace frame capability test package: restores real client assets and HMR without browser cookie exceptions or shared cross-client frame storage.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the existing Preview origin a secure live-development transport while Workspace remains the stable shell and every client frame remains opaque and isolated.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localNextCompatibleWorkspaceRuntimePackage: AgentPackage = {
      ...localOpaqueWorkspaceFrameCapabilityPackage,
      id: localNextCompatibleWorkspaceRuntimePackageId,
      version: 19.7,
      basePackageId: localOpaqueWorkspaceFrameCapabilityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.7',
      contractAddendum:
        'The trusted Preview-to-localhost hop removes the opaque browser Origin and stale cross-site Fetch Metadata before reaching Next.js or Vite, while the signed exact-client path remains the server-side authorization boundary. Railway boot safely restores a persisted approved active workspace when its recorded local server is absent.',
      instructionsAddendum:
        'Strip Origin, Sec-Fetch-*, Cookie, Referer, and the signed capability path before proxying authenticated live-frame HTTP and HMR traffic to the trusted loopback development server. Continue returning the narrow opaque-frame CORS response without forwarding that browser provenance upstream. On Railway boot, read only the validated active-preview record, reject reserved ports and traversal, resolve the directory through approved persistent workspace roots, require its Git checkout, package manifest, and existing locked dependencies, reuse its recorded port, and start its development command in the exact persistent tmux session only when the server is absent. A failed boot restore must leave Studio available for owner-authorized recovery.',
      summary:
        'Next-compatible Workspace runtime test package: removes opaque cross-site browser provenance that Next rejects and safely restores the approved active client after Railway restarts.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes Next.js client assets and HMR load through the secure Preview transport immediately after deploy or restart without broadening workspace authorization.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExecutableNextWorkspaceRuntimePackage: AgentPackage = {
      ...localNextCompatibleWorkspaceRuntimePackage,
      id: localExecutableNextWorkspaceRuntimePackageId,
      version: 19.8,
      basePackageId: localNextCompatibleWorkspaceRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.8',
      contractAddendum:
        'Next.js source remains byte-compatible inside the opaque client frame except for its exact Webpack and Turbopack runtime public-path declarations, which are rooted beneath the signed client capability. A document-local, memory-only compatibility layer supports Next development storage without persistence or shared client state.',
      instructionsAddendum:
        'Never broadly replace slash-prefixed strings in proxied Next.js JavaScript. Preserve React hydration sentinels, embedded source, and Next asset-prefix detection while rewriting only the exact CHUNK_BASE_PATH, RUNTIME_PUBLIC_PATH, and Webpack public-path assignments to the validated frame capability. For Next development documents only, install an early per-document memory sessionStorage and cookie surface when the opaque sandbox blocks native access. Keep the frame opaque and prove real Next initialization, React interaction, painted output, and HMR on the exact capability path in HTTPS Chromium.',
      summary:
        'Executable Next Workspace runtime test package: restores client-side React hydration and exact-capability hot reload while keeping each client frame opaque and isolated.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes downloaded Next.js client code actually execute and live-update inside the secure Workspace preview instead of leaving a blank or static server-rendered surface.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localOwnerApiCreditsSwitchPackage: AgentPackage = {
      ...localExecutableNextWorkspaceRuntimePackage,
      id: localOwnerApiCreditsSwitchPackageId,
      version: 19.9,
      basePackageId: localExecutableNextWorkspaceRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v19.9',
      contractAddendum:
        'The authenticated Studio owner can deliberately switch all Codex and OpenAI-backed Studio work between included ChatGPT subscription access and separately billed OpenAI API credits without exposing credentials to the browser.',
      instructionsAddendum:
        'Default every Railway runtime to ChatGPT subscription access. Persist an owner-only billing preference on the Railway volume, require a server-side API key before enabling API credits, restart only the Codex app-server when the preference changes, and apply the same effective mode to Studio chat, website/test builders, analysis workers, and asset enrichment. Never reveal the key, silently enable API billing, switch during active or queued Codex work, or weaken the exact owner, organization, client, and repository boundaries.',
      summary:
        'Owner API credits switch test package: adds a disclosed private control that can move all Studio AI work to separately billed API usage when subscription allowance is exhausted.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the Studio usable after subscription quota exhaustion while making the billing boundary explicit, reversible, owner-only, and credential-safe.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDeployedStudioShellPackage: AgentPackage = {
      ...localOwnerApiCreditsSwitchPackage,
      id: localDeployedStudioShellPackageId,
      version: 20,
      basePackageId: localOwnerApiCreditsSwitchPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.0',
      contractAddendum:
        'The public Studio shell always runs the exact reviewed Railway image release while Codex keeps both persistent Git workspaces available for repository-scoped editing, commits, builds, and deployment.',
      instructionsAddendum:
        'Serve Studio application code and runtime middleware from the immutable Railway image. Keep /data/workspaces/siteforge-os and /data/workspaces/made-solid-website as the exact Codex workspace roots. A Codex source change becomes production only after it is reviewed, committed, pushed, built, and deployed; an uncommitted persistent checkout must never pin the public shell to an obsolete release.',
      summary:
        'Deployed Studio shell test package: prevents persistent uncommitted work from leaving the live owner interface on an obsolete release.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes every successful Railway deployment visible immediately without deleting or weakening either persistent editable repository.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCanonicalWorkspaceEntryPackage: AgentPackage = {
      ...localDeployedStudioShellPackage,
      id: localCanonicalWorkspaceEntryPackageId,
      version: 20.1,
      basePackageId: localDeployedStudioShellPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.1',
      contractAddendum:
        'The bare Workspace hostname is a canonical entry to Made Solid Studio, while only an explicit exact-client launch opens the isolated live website development shell.',
      instructionsAddendum:
        'Redirect every top-level Workspace request without an exact client directory or valid fresh query capability to the Studio prospects UI, regardless of active, expired, or remembered Workspace cookies. Never infer a client from the active preview process or a last-client cookie. Require the authenticated Studio access endpoint to receive and return the same validated client directory. Preserve explicit client launch, clean scoped refresh, authenticated exact-client recovery, opaque Preview-origin capability paths, and client-bound Codex authorization.',
      summary:
        'Canonical Workspace entry test package: makes a direct Workspace visit open Studio instead of silently selecting the active or previously viewed client.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Separates Studio entry from explicit website editing so the Workspace hostname cannot surprise the reviewer with an unrelated client preview.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localWorkspaceDevelopmentStudioPackage: AgentPackage = {
      ...localCanonicalWorkspaceEntryPackage,
      id: localWorkspaceDevelopmentStudioPackageId,
      version: 20.2,
      basePackageId: localCanonicalWorkspaceEntryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.2',
      contractAddendum:
        'The Studio hostname serves the exact reviewed production release, while the owner-authenticated Workspace hostname serves the complete Made Solid Studio application from its persistent editable checkout with immediate development updates.',
      instructionsAddendum:
        'Serve production Studio only from immutable built release assets and never expose its Vite source or HMR endpoints. Serve Workspace from /data/workspaces/siteforge-os with Vite development and hot updates behind the same owner and organization authorization boundary used by the private runtime. A bare Workspace visit opens the full development Studio UI without selecting a client. Open client website development as a clean route inside that UI, preserve Studio navigation, and show only the selected client chats plus clearly labelled universal Studio chats. Keep every client preview in its opaque exact-client Preview-origin capability frame; never expose capability tokens in the clean Workspace URL, leak secrets to the editable browser process, or allow one client route, chat, asset, API request, or HMR channel to cross into another client.',
      summary:
        'Workspace development Studio test package: separates reviewed production from the authenticated live Studio checkout while keeping client editors isolated inside the complete development UI.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Restores Workspace as the instant-development Studio environment without replacing it with a client website or weakening production, owner, repository, or exact-client boundaries.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRestoredCodexVoiceExperiencePackage: AgentPackage = {
      ...localWorkspaceDevelopmentStudioPackage,
      id: localRestoredCodexVoiceExperiencePackageId,
      version: 20.3,
      basePackageId: localWorkspaceDevelopmentStudioPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.3',
      contractAddendum:
        'Studio Codex read aloud restores the complete reviewer-controlled voice experience: natural or literal reading, three saved speeds, opt-in chat-scoped automatic reading, progressive cloud playback, and an interactive read-along dock that remains usable while the transcript scrolls.',
      instructionsAddendum:
        'Keep speech user-initiated unless the reviewer explicitly enables Auto-read for the open chat. Persist Natural or Literal reading style, 0.85x, 1x, or 1.15x speed, language, model, and voice preferences locally; apply the same effective rate and locale-aware selection to Google and device fallback speech. Auto-read only stable new Codex commentary and the final reply, de-duplicate messages, coalesce queued progress to its newest update, and let manual Read pre-empt automatic speech. Fetch bounded Google chunks concurrently, start the first ready chunk without waiting for the rest, keep at most 24 private in-memory MP3 blobs, and abort or ignore late audio after conversation, panel, or navigation changes. Keep the active word visible in a persistent accessible dock with pause, resume, stop, five-second skip, exact Google seeking, and keyboard or pointer restart from a rendered word. Revoke every object URL, preserve device fallback, and use a static active-word treatment when reduced motion is requested.',
      summary:
        'Restored Codex voice experience test package: brings back saved listening preferences, opt-in auto-read, progressive private audio, and interactive read-along controls.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Restores the four developed Codex listening features in the Workspace development Studio without weakening speech privacy, cancellation, accessibility, or client-chat isolation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPersistentCodexChatSurfacesPackage: AgentPackage = {
      ...localRestoredCodexVoiceExperiencePackage,
      id: localPersistentCodexChatSurfacesPackageId,
      version: 20.4,
      basePackageId: localRestoredCodexVoiceExperiencePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.4',
      contractAddendum:
        'Studio Codex chat is available on its own route and as a persistent popup whose launcher and open conversation survive initial capability checks, refresh restoration, and in-place Studio source updates.',
      instructionsAddendum:
        'Expose universal Codex chat as a normal authenticated Studio route while retaining the floating launcher on other Studio routes. Reuse one conversation, draft, preference, and transcript-position contract across both surfaces without rendering duplicate chat owners. Keep the launcher mounted in a truthful connecting or unavailable state instead of removing it during capability checks. An open popup, selected thread, draft, and transcript position must survive Studio update notifications and remount restoration; update indicators must never implicitly close the chat.',
      summary:
        'Persistent Codex chat surfaces test package: adds a dedicated Studio chat page and keeps the popup launcher and open conversation stable through refresh and source updates.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes Codex continuously reachable during Studio work while preserving the same authenticated conversation state across page and popup presentations.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSelectedCodexExcerptActionsPackage: AgentPackage = {
      ...localPersistentCodexChatSurfacesPackage,
      id: localSelectedCodexExcerptActionsPackageId,
      version: 20.5,
      basePackageId: localPersistentCodexChatSurfacesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.5',
      contractAddendum:
        'A reviewer can select text within one Codex assistant reply and use that exact excerpt in a temporary question, append it to the current draft, or send it immediately without losing the existing draft.',
      instructionsAddendum:
        'Capture selections only inside a single rendered assistant reply. Offer Quick question, Add to prompt, Send now, and Dismiss with keyboard-accessible 44-pixel controls on popup and page chat surfaces. Quote excerpts with a clear Codex attribution and retain any existing composer draft when sending immediately. Run quick questions outside conversation history in a server-created empty temporary directory with no workspace roots, an ephemeral thread, read-only thread and turn sandboxes, bounded inputs, and guaranteed thread and directory cleanup.',
      summary:
        'Selected Codex excerpt actions test package: restores quick read-only questions, draft quoting, immediate sending, and dismissal across popup and page chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers act on precise Codex output without copying text manually or granting a temporary question access to Studio or client files.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexPhoneNotificationsPackage: AgentPackage = {
      ...localSelectedCodexExcerptActionsPackage,
      id: localCodexPhoneNotificationsPackageId,
      version: 20.6,
      basePackageId: localSelectedCodexExcerptActionsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.6',
      contractAddendum:
        'The authenticated Studio owner can explicitly subscribe each supported phone to private Web Push notifications when a Studio-submitted Codex supervisor turn completes successfully.',
      instructionsAddendum:
        'Offer phone notifications as a device-specific opt-in in Settings. On iPhone and iPad, explain that Studio must first be installed to the Home Screen. Persist subscriptions and an idempotent completion marker on the private runtime, send only after the exact tracked supervisor turn reaches completed, and never describe interrupted, cancelled, or failed work as finished. Keep lock-screen text generic, use a same-origin Codex route, remove expired subscriptions, retry durable pending delivery, and never cache private Studio data in the push-only service worker.',
      summary:
        'Codex phone notifications test package: sends private, generic Web Push alerts after successful Studio chat completion.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds explicit per-phone completion alerts without exposing prospect or transcript content or depending on an open Studio tab.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localBranchableCodexConversationsPackage: AgentPackage = {
      ...localCodexPhoneNotificationsPackage,
      id: localBranchableCodexConversationsPackageId,
      version: 20.7,
      basePackageId: localCodexPhoneNotificationsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.7',
      contractAddendum:
        'A completed final Codex reply can create a durable branched conversation through that exact completed turn while retaining the original conversation unchanged.',
      instructionsAddendum:
        'Use the native Codex thread fork contract at completed turn boundaries. Preserve the source thread, its native context, cleaned Studio prompts, approved image attachments, client or universal workspace scope, and recorded source lineage. Never offer a branch from progress output or an in-progress turn, never copy queued or running feedback records, and keep branch creation failure on the original selected conversation with a clear retryable error.',
      summary:
        'Branchable Codex conversations test package: creates durable alternate chats from completed replies without changing the original conversation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds native context-preserving Codex chat branches with exact turn boundaries, evidence continuity, accessible controls, and workspace isolation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLiveWorkspaceCodexBranchingPackage: AgentPackage = {
      ...localBranchableCodexConversationsPackage,
      id: localLiveWorkspaceCodexBranchingPackageId,
      version: 20.8,
      basePackageId: localBranchableCodexConversationsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.8',
      contractAddendum:
        'Branching remains available in the editable Workspace Studio as soon as its source changes, even while the separately reviewed production API image is still on the preceding release.',
      instructionsAddendum:
        'Serve the native thread-fork mutation through a narrow owner-gateway-protected Workspace endpoint loaded from the persistent Studio checkout. Keep ordinary chat delivery on the established runtime worker, never start a second queue maintainer, accept legacy completed-turn status only for button visibility, and revalidate completion and exact workspace scope in the current bridge before forking.',
      summary:
        'Live Workspace Codex branching test package: makes the Branch control and native fork available immediately from editable Studio source.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the editable-frontend versus reviewed-backend rollout gap without duplicating Codex queue workers or weakening the private owner gateway.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLiveWorkspacePhoneNotificationsPackage: AgentPackage = {
      ...localLiveWorkspaceCodexBranchingPackage,
      id: localLiveWorkspacePhoneNotificationsPackageId,
      version: 20.9,
      basePackageId: localLiveWorkspaceCodexBranchingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v20.9',
      contractAddendum:
        'Phone-notification subscription and completion delivery remain available in the editable Workspace Studio while its separately reviewed production API image is still on the preceding release.',
      instructionsAddendum:
        'Serve the Web Push configuration and subscription actions through the owner-gateway-protected live Workspace endpoint. Reuse the production runtime data directory, monitor its durable completed records without running a second Codex queue maintainer, and deliver only completions recorded after the first active device subscription. Treat empty or non-JSON runtime responses as a clear retryable availability state instead of exposing a browser parsing exception.',
      summary:
        'Live Workspace phone notifications test package: enables device subscriptions and completion alerts immediately from editable Studio source with safe retry guidance.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the editable-frontend versus reviewed-backend rollout gap for private phone alerts without duplicating the Codex queue worker.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localNaturalCodexReadingPackage: AgentPackage = {
      ...localLiveWorkspacePhoneNotificationsPackage,
      id: localNaturalCodexReadingPackageId,
      version: 21,
      basePackageId: localLiveWorkspacePhoneNotificationsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.0',
      contractAddendum:
        'Studio Codex read aloud interprets rightward arrow glyphs as a useful spoken transition. Natural reading keeps verification introductions audible while omitting only their long technical result lists; Literal reading preserves every listed item.',
      instructionsAddendum:
        'Convert common rightward arrow glyphs to the spoken transition “then” before either Natural or Literal synthesis. In Natural mode only, omit a Markdown list when nearby text identifies it as verification, checks, tests, lint, typecheck, build, audit, quality-gate, command, or diagnostic output and the list contains at least four items or 320 characters. Keep the preceding introduction and all later prose. Continue reading ordinary lists, short check lists, and every list in Literal mode.',
      summary:
        'Natural Codex reading test package: speaks right arrows meaningfully and skips long technical verification lists without hiding them in chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes long Codex replies easier to follow by voice while preserving complete visible detail and an explicit Literal option.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localFocusedCodexSettingsPackage: AgentPackage = {
      ...localNaturalCodexReadingPackage,
      id: localFocusedCodexSettingsPackageId,
      version: 21.1,
      basePackageId: localNaturalCodexReadingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.1',
      contractAddendum:
        'Studio Codex chat separates request-level run setup from persistent usage, billing, speed, and read-aloud preferences so the compact composer no longer presents unrelated settings in one scrolling menu.',
      instructionsAddendum:
        'Keep Model, Reasoning, and Agent team together behind the compact Run setup control beside the composer. Put subscription usage, API-credit billing, Fast service tier, and read-aloud preferences behind a distinct Chat settings cog with a labelled dialog, explicit close control, Escape dismissal, focus restoration, 44-pixel controls, and overflow-free mobile presentation.',
      summary:
        'Focused Codex settings test package: separates per-request model and Agent team controls from persistent usage, billing, speed, and voice preferences.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the Codex composer easier to scan while retaining every existing run, billing, usage, and listening control in a clearer hierarchy.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localConciseCodexReadingPackage: AgentPackage = {
      ...localFocusedCodexSettingsPackage,
      id: localConciseCodexReadingPackageId,
      version: 21.2,
      basePackageId: localFocusedCodexSettingsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.2',
      contractAddendum:
        'Natural Studio Codex reading replaces compact technical handoff paragraphs about implementation files and completed verification with one short spoken pointer to the full visible chat. Literal reading preserves those details.',
      instructionsAddendum:
        'In Natural mode, recognise technical handoff paragraphs beginning with Implemented in, Changed in, Updated in, All checks passed or complete, Verification checks passed or complete, or Verification details or results. Replace consecutive matching paragraphs with exactly one concise sentence explaining that the technical implementation and verification details remain in the chat. Preserve the outcome before the handoff, later non-technical prose, all visible message content, and complete Literal playback.',
      summary:
        'Concise Codex reading test package: summarises file, test, tool, count, and viewport handoff details instead of reading them aloud.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps voice playback focused on the result while leaving detailed engineering evidence available for visual review.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDevelopmentReleaseUrlsPackage: AgentPackage = {
      ...localConciseCodexReadingPackage,
      id: localDevelopmentReleaseUrlsPackageId,
      version: 21.3,
      basePackageId: localConciseCodexReadingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.3',
      contractAddendum:
        'Studio and the Made Solid website expose separate owner-only development surfaces, exact saved Git versions, and explicit production destinations. Canonical development hostnames are additive, legacy Workspace entry remains compatible, private build capabilities identify tests and complete builds, and no development change promotes itself.',
      instructionsAddendum:
        'Keep dev.studio.madesolid.com.au separate from studio.madesolid.com.au and dev.madesolid.com.au separate from madesolid.com.au. Retain workspace.madesolid.com.au as a compatibility entry until verified retirement. Present repository changes and saved feature versions in Studio, route generated tests through /test capabilities and complete builds through /build capabilities, preserve legacy /site links, and require an exact reviewed version plus an authenticated deployment connection before production promotion.',
      summary:
        'Development release URLs test package: separates Studio and website development, preserves Workspace compatibility, labels private test/build capabilities, and keeps production promotion explicit.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes development and production destinations understandable while keeping every current production route untouched during rollout.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResilientLiveCodexBranchingPackage: AgentPackage = {
      ...localDevelopmentReleaseUrlsPackage,
      id: localResilientLiveCodexBranchingPackageId,
      version: 21.4,
      basePackageId: localDevelopmentReleaseUrlsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.4',
      contractAddendum:
        'Authenticated live Studio branching allows enough time for a long Codex thread fork to complete, while an interrupted upstream response provides clear recovery guidance without claiming whether the fork completed.',
      instructionsAddendum:
        'Keep live Codex branch requests bound to the authenticated owner, exact conversation, and current workspace while allowing the protected fork operation to run through its longer bounded response window. Never claim success without a returned branch result. When the upstream response is interrupted, explain: Branching was interrupted before Studio returned a result. Check Conversations for the new branch, then retry if it is not listed.',
      summary:
        'Resilient live Codex branching test package: supports longer authenticated branch operations and gives interrupted responses clear check-before-retry guidance.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents valid long-running branches from timing out early and makes an uncertain interrupted response safe to verify before retrying.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localStoppableCodexTurnsPackage: AgentPackage = {
      ...localResilientLiveCodexBranchingPackage,
      id: localStoppableCodexTurnsPackageId,
      version: 21.5,
      basePackageId: localResilientLiveCodexBranchingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.5',
      contractAddendum:
        'While the selected Studio Codex conversation is working, its primary composer action becomes an accessible Stop Codex control. Stopping cooperatively interrupts the exact active supervisor turn and any active attached agents, preserves the unsent draft, and records the app-owned turn as intentionally interrupted so maintenance cannot restart it.',
      instructionsAddendum:
        'Derive the primary composer action from the selected conversation lifecycle. Show Send only while idle and Stop Codex with a square icon while working; expose an explicit disabled Stopping Codex state while the request is pending. Send the exact selected thread and workspace scope to a protected stop-active-turn bridge action, interrupt its active supervisor and discoverable active descendants, and mark its running app-owned records interrupted with a manual-stop marker. Never clear or submit the current draft when stopping, never auto-recover a manually stopped turn, and preserve visible focus, error feedback, and 44px touch targets.',
      summary:
        'Stoppable Codex turns test package: changes Send into Stop during active work and safely interrupts the selected supervisor and agent team without losing the draft.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Gives reviewers the familiar immediate stop control they expect in chat while keeping cancellation scoped, observable, and safe from automatic recovery.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localClientUrlReleaseContractPackage: AgentPackage = {
      ...localStoppableCodexTurnsPackage,
      id: localClientUrlReleaseContractPackageId,
      version: 21.6,
      basePackageId: localStoppableCodexTurnsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.6',
      contractAddendum:
        'Test builds, complete builds, client review links, live editing workspaces, committed edit previews, source handoffs, and production releases remain distinct versioned surfaces. Private review links expire and can be revoked; committed previews stay bound to one exact Git revision; a source handoff never deploys production or assigns a client domain.',
      instructionsAddendum:
        'Open canonical /test and /build capabilities only after exact preview-origin, run, and token validation. Create /review capabilities only for quality-approved full-site builds, scope their frame policy to the configured Clientspace origin, expire them after seven days, and revoke them when publishing is cancelled. Key live preview routing by client directory plus working or exact 40-character Git revision so concurrent clients and historical edits cannot replace each other. Never restore a committed preview as the working editor after restart. A Made Solid source handoff may create an isolated Vercel preview for internal review, but must never pass --prod, attach a Made Solid domain, accept a reserved hostname, or treat handoff completion as production promotion.',
      summary:
        'Client URL release contract test package: separates test, build, private review, exact edit, handoff, and production surfaces without changing production automatically.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes every client-facing URL state explicit and recoverable while closing public-preview, cross-client, historical-version, and accidental-production paths.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localRevocableReadyClientReviewsPackage: AgentPackage = {
      ...localClientUrlReleaseContractPackage,
      id: localRevocableReadyClientReviewsPackageId,
      version: 21.7,
      basePackageId: localClientUrlReleaseContractPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.7',
      contractAddendum:
        'A private client review remains revocable after it becomes ready. Revocation immediately disables every active review capability for the exact build before recording the ready publication as cancelled, while queued and running work retains its truthful cancellation lifecycle.',
      instructionsAddendum:
        'Allow an authenticated organization member to cancel a queued, running, or ready private client review. Revoke every unrevoked review capability for the exact builder run before closing a ready publication, record its phase as revoked with a plain-language explanation, and make repeated cancellation safe. Cancel queued work before it starts; keep running work in cooperative cancellation until its next safe checkpoint. Preserve completed build evidence and never turn review cancellation into a production or source deletion action.',
      summary:
        'Revocable ready client reviews test package: closes an already-ready private review immediately while preserving truthful queued and running cancellation states.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the final review-link lifecycle gap so a reviewer can withdraw access after sharing without deleting the build or affecting production.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localReliableCodexStopStatePackage: AgentPackage = {
      ...localRevocableReadyClientReviewsPackage,
      id: localReliableCodexStopStatePackageId,
      version: 21.8,
      basePackageId: localRevocableReadyClientReviewsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.8',
      contractAddendum:
        'The Studio Codex composer derives Stop from the selected turn rather than coarse thread or historical-agent state. Completion replaces the keyed Stop control with a distinct Send control promptly, out-of-order status responses cannot restore stale work, and a stop gesture can never be reinterpreted as message submission. The runtime advertises stop support explicitly and rejects unknown chat actions instead of treating them as prompts. A malformed or stalled saved transcript is isolated to that exact conversation so the conversation picker, new chats, and other healthy chats remain usable.',
      instructionsAddendum:
        'Treat an included turn list as the source of truth for selected-thread activity; use coarse active thread status only for summaries that omit turns. Scope running agents to the selected active supervisor turn. Poll active work once per second, discard any status response older than the most recently started request, and render separate keyed Send and Stop buttons so a lifecycle transition between pointer-down and click cancels the old gesture. Include an explicit enqueue action for messages, disable Send without both a model and reasoning choice, advertise stop-active-turn capability from the same server dispatcher that implements it, disable Stop during frontend/server version skew, and fail closed on unknown chat actions. Bound selected-transcript reads below the owner-gateway timeout, preserve an unreadable conversation without rendering or accepting new work into it, return the remaining conversation list, and direct the user to another or new chat.',
      summary:
        'Reliable Codex chat state test package: removes stale Stop controls, prevents stop/send races, and keeps healthy chats usable when one saved conversation cannot load.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the familiar chat surface trustworthy across completion timing, agent-team history, overlapping polling, live Studio server updates, and one malformed saved conversation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDedicatedClientWebsiteEditorPackage: AgentPackage = {
      ...localReliableCodexStopStatePackage,
      id: localDedicatedClientWebsiteEditorPackageId,
      version: 21.9,
      basePackageId: localReliableCodexStopStatePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v21.9',
      contractAddendum:
        'Website editing opens a dedicated new-tab client editor scoped to one prospect, with the latest live website and that client’s Codex workspace visible together while review and checkpoint controls remain in Studio. A working preview is reusable only when its persisted workspace identity matches the canonical editable checkout selected by Studio; an older healthy process from another checkout must be replaced without deleting either source tree.',
      instructionsAddendum:
        'Open the client website editor in a separate tab and keep its preview, client identity, return route, and client-scoped Codex context together. Resolve refinement history, final-edit state, live launch, recovery, committed snapshots, and Codex against one canonical prospect checkout. Persist the resolved workspace identity with every active working preview, reject a healthy registry entry whose workspace identity does not match, and restart from the canonical checkout. Preserve dirty or alternate checkouts for human recovery; never reset, overwrite, delete, or silently promote them. Keep committed edit previews bound to their exact Git revision and require the normal verified checkpoint workflow before a later HEAD becomes a new committed edit version.',
      summary:
        'Dedicated client website editor test package: opens each client website with scoped Codex in a new tab and binds live preview recovery to the canonical checkout.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps focused client editing easy to understand while preventing a healthy but stale Railway process from serving a different checkout than Studio’s ledger and checkpoint controls.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResilientDevelopmentStudioRuntimePackage: AgentPackage = {
      ...localDedicatedClientWebsiteEditorPackage,
      id: localResilientDevelopmentStudioRuntimePackageId,
      version: 22,
      basePackageId: localDedicatedClientWebsiteEditorPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.0',
      contractAddendum:
        'The editable development Studio serves optimized dependencies from a runtime-owned cache that build verification cannot remove. Its supervisor probes both the Vite client and a real React dependency, restarts an unhealthy live server automatically, and the document shell remains visible with one bounded reconnect attempt plus a manual recovery action when application modules cannot start.',
      instructionsAddendum:
        'Keep live-serve and build optimizer caches physically separate. Run the Railway development Vite server with a runtime-owned cache outside the editable checkout, and probe both /@vite/client and the optimized React dependency while its process is alive. Restart after two consecutive failed probes. Ship a dependency-free startup shell in the HTML document, attempt one session-scoped reload after a module startup failure, and then show a clear reload action that states saved source is safe. Never leave a blank document as the failure state.',
      summary:
        'Resilient development Studio runtime test package: prevents build checks from blanking the live app and recovers visibly when frontend modules fail.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Separates verification from the live module graph and adds automatic plus user-visible recovery for development Studio startup failures.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localFocusedProspectPreviewModesPackage: AgentPackage = {
      ...localResilientDevelopmentStudioRuntimePackage,
      id: localFocusedProspectPreviewModesPackageId,
      version: 22.1,
      basePackageId: localResilientDevelopmentStudioRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.1',
      contractAddendum:
        'The focused prospect website editor provides fit, exact 768px tablet, and exact 1440px desktop preview modes plus an in-app full-preview mode. Fixed viewports scale inside the available Studio surface without changing the website browsing context width or creating page overflow. Client-scoped Codex conversations and Universal Studio conversations remain visibly grouped, and leaving the website editing context restores the universal chat scope.',
      instructionsAddendum:
        'Keep preview viewport selection separate from the generated website source. Render tablet and desktop modes at their exact CSS viewport widths and scale the visual surface down when the device is narrower, including after phone rotation. Full preview hides secondary editor chrome and the Codex column without entering browser Fullscreen or losing the selected mode. Label client conversation groups with the selected client, keep the Universal Studio group visible even when either group is empty, reject other-client conversations server-side, and remove the client workspace parameter whenever the user leaves the website editing or preview route.',
      summary:
        'Focused prospect preview modes test package: adds fit, tablet, desktop, and full-preview views while making client and universal chat scope explicit and route-bound.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes responsive prospect review practical from phone, tablet, and desktop while keeping website-specific Codex work visibly separated from universal Studio work.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableCodexEphemeralThreadsPackage: AgentPackage = {
      ...localFocusedProspectPreviewModesPackage,
      id: localReliableCodexEphemeralThreadsPackageId,
      version: 22.2,
      basePackageId: localFocusedProspectPreviewModesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.2',
      contractAddendum:
        'A newly created persistent Codex conversation remains a valid empty selection until its first user message materializes stored turn history. Temporary Quick Questions run in an ephemeral read-only thread and collect their answer from scoped app-server item and turn completion events instead of requesting stored turns that ephemeral threads do not support. The Quick Question surface uses the same dark visual system as the parent Codex chat.',
      instructionsAddendum:
        'Keep the exact newly started thread in the visible conversation ledger while it is empty, and suppress only the expected not-materialized history-read response for that app-started thread; preserve genuine unreadable-conversation errors. Subscribe to app-server notifications before starting an ephemeral turn, treat the final completed agent-message item as authoritative, require a completed turn, remove the temporary thread and directory, and never add the exchange to conversation history. Render Quick Question with dark surfaces, accessible contrast, and unchanged focus, error, loading, and action semantics.',
      summary:
        'Reliable Codex ephemeral chats test package: keeps new empty chats safe and makes dark Quick Questions complete through live turn events.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes two chat dead ends without weakening corrupt-history isolation or persisting temporary questions.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResumeAwareCodexProgressPackage: AgentPackage = {
      ...localReliableCodexEphemeralThreadsPackage,
      id: localResumeAwareCodexProgressPackageId,
      version: 22.3,
      basePackageId: localReliableCodexEphemeralThreadsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.3',
      contractAddendum:
        'A newly created Codex conversation starts with an empty activity timeline and cannot display progress from the previously selected conversation. A mounted chat refreshes its selected-thread status immediately when the document becomes visible, the page is shown, the browser regains focus, or the network returns, without waiting for a suspended polling interval.',
      instructionsAddendum:
        'Clear messages, activities, agents, and queue state together when selecting a newly created conversation. Keep status rendering scoped to that selected thread. Retain bounded active and idle polling, but also request current selected-thread status after visibilitychange to visible, pageshow, window focus, and online events; ignore hidden-page events and preserve stale-response sequencing so an older request cannot replace the resumed state.',
      summary:
        'Resume-aware Codex progress test package: prevents previous-chat progress flashes and refreshes loading conversations automatically after a phone, tab, browser, or network resumes.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps conversation progress truthful at chat creation and across mobile browser suspension without requiring a manual refresh.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localQueueableWorkingCodexMessagesPackage: AgentPackage = {
      ...localResumeAwareCodexProgressPackage,
      id: localQueueableWorkingCodexMessagesPackageId,
      version: 22.4,
      basePackageId: localResumeAwareCodexProgressPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.4',
      contractAddendum:
        'While a selected Codex conversation is working, its empty composer shows Stop Codex. Entering trimmed text or attaching at least one ready image immediately replaces Stop with Send so the reviewer can enqueue another message; clearing all draft content restores Stop.',
      instructionsAddendum:
        'Derive the working composer action from ready draft content. Keep Stop available only while the selected turn is working and the composer has neither trimmed text nor a ready image. Show the existing Send action as soon as either content type is present, retain all model, reasoning, image-preparation, transition, and delivery guards, and enqueue through the existing thread-scoped message path. Preserve a stopping action once it has begun so its pending control cannot become Send mid-request.',
      summary:
        'Queueable working Codex messages test package: changes Stop back to Send when text or an image is ready so follow-ups can be queued during active work.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets reviewers compose and queue the next instruction without waiting for the active Codex turn to finish or giving up access to Stop when the composer is empty.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResponsiveDevelopmentRuntimePackage: AgentPackage = {
      ...localQueueableWorkingCodexMessagesPackage,
      id: localResponsiveDevelopmentRuntimePackageId,
      version: 22.5,
      basePackageId: localQueueableWorkingCodexMessagesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.5',
      contractAddendum:
        'The development Studio reveals the authenticated prospect index as soon as its lightweight business query succeeds, while full workspace detail continues hydrating in place. Codex status polling keeps at most one ordinary request in flight, status reads do not wait for the periodic durable maintenance pass, and the server reuses one healthy app-server connection until that socket actually closes.',
      instructionsAddendum:
        'Start the complete prospect hydration concurrently with the lightweight business index. Dismiss the initial cover once that index is saved, show the existing hydration status while details load, and retain the retry/error boundary when even the index is unavailable. Coalesce timer and browser-resume Codex status requests while preserving explicit conversation transitions and stale-response sequencing. Run durable maintenance on its existing server interval rather than in the status response path. Share the initialized Codex app-server transport across bridge operations, invalidate it on close, reconnect on the next operation, and close it deliberately when the bridge reloads or the server stops.',
      summary:
        'Responsive development runtime test package: reveals the prospect index before full hydration and removes repeated Codex handshakes, overlapping polls, and status-path maintenance waits.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Shortens authenticated development startup and keeps long Codex conversations responsive through transient transport loss without changing production Studio or workspace boundaries.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExactEditedSiteReleasePackage: AgentPackage = {
      ...localResponsiveDevelopmentRuntimePackage,
      id: localExactEditedSiteReleasePackageId,
      version: 22.6,
      basePackageId: localResponsiveDevelopmentRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.6',
      contractAddendum:
        'The generated full-site build remains an immutable baseline after an editable repository is created. The current edited website is identified by its exact Git commit and receives a separate release attestation only after exact-source, responsive-layout, compact-navigation, and accessibility checks pass. Historical builder failures never appear as current edited-site results, and Made Solid handoff remains blocked without a matching passed attestation.',
      instructionsAddendum:
        'Label completed builder output as the generated baseline once editing exists. Preserve its original quality evidence unchanged. Bind edited-site release verification to the exact business, builder run, manifest, commit, tree, branch and edit version. Run the versioned release suite in an immutable worktree, invalidate the result when the commit changes, and require the matching passed attestation at every handoff and Clientspace boundary.',
      summary:
        'Exact edited-site release test package: separates immutable baseline failures from the current edited commit and requires exact-commit verification before handoff.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes build history understandable and prevents an edited website from reaching Made Solid or Clientspace on lineage alone.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localUnambiguousWebsiteEditingPackage: AgentPackage = {
      ...localExactEditedSiteReleasePackage,
      id: localUnambiguousWebsiteEditingPackageId,
      version: 22.7,
      basePackageId: localExactEditedSiteReleasePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.7',
      contractAddendum:
        'Website editing presents one client-named current website editor. The private source repository and local preview runtime are separate supporting controls and must never be described as another editor or an ambiguous editable workspace.',
      instructionsAddendum:
        'Name the exact client website in the editing page and focused editor. Use Open [client] editor only for the combined preview and client-scoped Codex surface. Label repository and runtime actions as website source controls and Start local website preview, explain that they power the editor rather than replace it, and keep those technical actions visually secondary.',
      summary:
        'Unambiguous website editing test package: names the client editor and separates it clearly from source repository and local preview controls.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the false impression that Studio exposes two editors while preserving private source, preview runtime, and refinement-ledger operations.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localEditorOnlyClientChatScopePackage: AgentPackage = {
      ...localUnambiguousWebsiteEditingPackage,
      id: localEditorOnlyClientChatScopePackageId,
      version: 22.8,
      basePackageId: localUnambiguousWebsiteEditingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.8',
      contractAddendum:
        'Client-only Codex scope is active only inside the dedicated website editor. Prospect review and website-editing control pages retain the Universal Studio chat even when they refer to a specific client.',
      instructionsAddendum:
        'Bind a client workspace directory only to the Codex instance rendered within the dedicated /website-editor route. Keep the persistent Studio chat universal on prospect tabs, including Website editing, so merely reviewing or preparing a client website never presents an editing-only notice or hides other Studio conversations.',
      summary:
        'Editor-only client chat scope test package: limits the editing-only Codex notice and client workspace boundary to the dedicated website editor.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the chat scope match the surface the reviewer actually opened and prevents an ordinary prospect page from looking like a live website-editing session.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexConversationStatusIndicatorsPackage: AgentPackage = {
      ...localEditorOnlyClientChatScopePackage,
      id: localCodexConversationStatusIndicatorsPackageId,
      version: 22.9,
      basePackageId: localEditorOnlyClientChatScopePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v22.9',
      contractAddendum:
        'Every conversation in the Codex chat selector exposes its current activity state. Working conversations show a loading indicator, while a finished conversation that has not been viewed since completion shows an unread notification indicator until selected. Interrupted conversations remain explicitly interrupted and do not receive the finished indicator.',
      instructionsAddendum:
        'Derive conversation activity and unread completion state from persisted lifecycle evidence for every selector row, not only the selected conversation. Animate the loading indicator with a reduced-motion alternative, give status icons accessible text, and clear the unread completion indicator only when the user views that finished conversation.',
      summary:
        'Codex conversation status indicators test package: shows working chats and unread finished chats across the conversation selector.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes concurrent chat progress and unseen completions visible before a reviewer opens each conversation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localContextualQuickQuestionsPackage: AgentPackage = {
      ...localCodexConversationStatusIndicatorsPackage,
      id: localContextualQuickQuestionsPackageId,
      version: 23,
      basePackageId: localCodexConversationStatusIndicatorsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.0',
      contractAddendum:
        'A Quick question about selected Codex output inherits the complete selected conversation through its latest completed turn without adding the question or answer to that conversation. The temporary answer follows the saved Auto-read Codex preference and exposes in-dialog read, pause, resume, and stop controls.',
      instructionsAddendum:
        'Bind selected text to its exact conversation, completed turn, and assistant message. Authorize that source thread against the active universal or client workspace, verify the excerpt against the saved assistant message, then create an ephemeral native fork in an empty temporary directory with no workspace roots and read-only thread and turn sandboxes. Answer from the inherited conversation, delete the fork and directory on every outcome, and never mutate the source thread. When Auto-read Codex is enabled, read each returned answer once with the saved voice, style, language, and speed; keep manual speech priority and stop temporary speech when the dialog closes or resets.',
      summary:
        'Contextual auto-read Quick questions test package: answers from the whole selected conversation in an isolated fork and reads temporary answers with the saved voice preference.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes a precise follow-up useful without losing the surrounding conversation or requiring the reviewer to read the temporary answer manually.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSeamlessStudioResumePackage: AgentPackage = {
      ...localContextualQuickQuestionsPackage,
      id: localSeamlessStudioResumePackageId,
      version: 23.1,
      basePackageId: localContextualQuickQuestionsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.1',
      contractAddendum:
        'The authenticated development Studio keeps its owner-only live-update connection active while Chrome is backgrounded, privately revalidates editable source instead of discarding every browser module, reuses versioned optimized dependencies and the runtime optimizer cache, and pre-warms its largest client entry files. A routine return keeps the mounted route and workspace intact; an unavoidable cold start removes its post-load pause and restores saved workspace data before live hydration.',
      instructionsAddendum:
        'Send a bounded server-side WebSocket heartbeat through the owner gateway so background-tab timer throttling does not turn an idle live-update connection into a document reload. Keep documents and runtime API responses private and no-store. Serve editable source as private no-cache responses with validators, and versioned optimized dependencies as private immutable responses. Reuse the isolated Vite optimizer cache on routine restarts, pre-warm the primary Studio client entries, require four consecutive failed dependency-graph probes before restarting, and keep saved workspace hydration non-blocking. Never cache authenticated API data or weaken owner-cookie validation.',
      summary:
        'Seamless Studio resume test package: prevents idle development reconnect reloads and makes unavoidable reloads reuse warm private modules and saved workspace state.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the editable Studio responsive when Chrome resumes while retaining immediate source updates, owner isolation, and fresh live data.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localConfiguredFinalEditUpstreamPackage: AgentPackage = {
      ...localSeamlessStudioResumePackage,
      id: localConfiguredFinalEditUpstreamPackageId,
      version: 23.2,
      basePackageId: localSeamlessStudioResumePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.2',
      contractAddendum:
        "A final website edit checkpoint targets the editable branch's configured upstream repository and branch instead of requiring a remote named origin. Studio validates that destination before it commits, pushes the exact verified revision to it, and keeps the checkpoint unlocked when the upstream is missing or invalid.",
      instructionsAddendum:
        'Resolve the current editable branch and its configured upstream remote and merge branch before mutating the prospect repository. Validate that the configured remote exists, then push the exact final-edit commit to that configured remote branch and confirm HEAD matches the upstream revision before locking the handoff checkpoint. Do not assume the remote is named origin. If no valid upstream is configured, preserve the working files and return actionable repository-setup guidance without creating a partial checkpoint.',
      summary:
        'Configured final edit upstream test package: commits and pushes a verified edit to its tracked repository branch without requiring a remote named origin.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes final edit checkpoints reliable for every correctly tracked prospect repository while preventing partial or misdirected client handoffs.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localGeneratedNextEnvironmentHygienePackage: AgentPackage = {
      ...localConfiguredFinalEditUpstreamPackage,
      id: localGeneratedNextEnvironmentHygienePackageId,
      version: 23.3,
      basePackageId: localConfiguredFinalEditUpstreamPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.3',
      contractAddendum:
        'Next.js development may rewrite next-env.d.ts from its committed route-types declaration to the byte-exact development route-types declaration. Studio treats only that deterministic framework-generated rewrite as runtime metadata, excludes it from pending-edit and release-dirty state, and restores the committed declaration after preview startup, preview recovery, or finalisation. Every other next-env.d.ts difference and every real source change remains a pending website edit.',
      instructionsAddendum:
        'Compare next-env.d.ts with the exact committed file and recognise only the byte-exact Next.js development transformation from ./.next/types/routes.d.ts to ./.next/dev/types/routes.d.ts. Use one shared workspace-state contract for the Editing status, final edit, exact release verification, manual preview launch, and restored preview. Restore that generated transformation to the committed declaration before a checkpoint completes. Never ignore or overwrite any other next-env.d.ts difference, and keep every genuine source change pending.',
      summary:
        'Generated Next environment hygiene test package: prevents byte-exact Next.js development metadata from appearing as a website edit or blocking exact release verification.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps edit versions and release gates tied to intentional website work while preserving every manual environment declaration and genuine source change.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localPersistentCodexPreferencesPackage: AgentPackage = {
      ...localGeneratedNextEnvironmentHygienePackage,
      id: localPersistentCodexPreferencesPackageId,
      version: 23.4,
      basePackageId: localGeneratedNextEnvironmentHygienePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.4',
      contractAddendum:
        'Authenticated Studio Codex chat preferences persist on the private runtime volume for the owner and restore after browser cookies or site data are deleted.',
      instructionsAddendum:
        'Keep browser storage as an immediate offline cache, then hydrate model, per-model reasoning, Agent team, Fast, Auto-read, language, voice, reading style, and speed from one bounded owner-scoped runtime record after authentication. Migrate the browser choice when no runtime record exists, write atomically, and never expose preferences before the existing Studio owner authorization succeeds.',
      summary:
        'Persistent Codex preferences test package: restores owner chat settings after cookies or browser site data are cleared.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the reviewer’s Codex setup consistent across cleared browser sessions and signed-in devices without weakening private runtime access.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableNextWebsitePreviewPackage: AgentPackage = {
      ...localPersistentCodexPreferencesPackage,
      id: localReliableNextWebsitePreviewPackageId,
      version: 23.5,
      basePackageId: localPersistentCodexPreferencesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.5',
      contractAddendum:
        'A generated Next.js website remains fully navigable inside its exact client preview capability without server/client URL divergence. Internal page changes expose a truthful indeterminate loading state, development-only Next.js chrome stays outside the client review surface, and full preview uses the complete available screen with a persistent exit control.',
      instructionsAddendum:
        'Keep server-rendered internal anchor hrefs byte-consistent for Next.js hydration. Route document navigation through the exact directory and token capability without exposing it to generated source, retain secured resource and hot-reload rewriting, and announce navigation start only from the bound preview frame. Hide framework development chrome in the private client view while retaining runtime errors in protected logs. Make full preview edge-to-edge, request browser fullscreen from the reviewer gesture where supported, provide a CSS fallback and visible exit control, restore on Escape, and preserve reduced-motion loading feedback.',
      summary:
        'Reliable Next website preview test package: fixes client page navigation, adds visible workspace loading, removes development chrome, and makes full preview edge-to-edge.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes generated Next.js sites reviewable as complete multi-page websites without weakening exact-client preview isolation or hiding protected diagnostics.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAutomaticCodexUpdatesPackage: AgentPackage = {
      ...localReliableNextWebsitePreviewPackage,
      id: localAutomaticCodexUpdatesPackageId,
      version: 23.6,
      basePackageId: localReliableNextWebsitePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.6',
      contractAddendum:
        'The protected Studio runtime checks the official stable Codex CLI release daily, stages and verifies it on persistent storage, waits for active and queued Codex work to finish, then atomically activates it and health-checks the restarted App Server. A failed startup restores the prior executable. The owner can see the installed version, lifecycle state, failure or rollback detail, and official Codex feature notes in Settings, with an in-app notice and an opt-in phone alert after successful activation.',
      instructionsAddendum:
        'Resolve one persistent Codex executable pointer for the Workspace Agent and all subsequently launched builder jobs. Accept only stable @openai/codex registry versions, verify the staged binary reports the exact requested version, and never restart while tracked chat work or another Codex process is active. Preserve the prior executable until the replacement survives its startup health window, roll back atomically on failure, and retain truthful persisted status. Parse release highlights only from the official OpenAI Codex changelog, keep status private behind existing owner authorization, and reuse the established Web Push opt-in without exposing prospect or conversation data.',
      summary:
        'Automatic Codex updates test package: safely installs stable releases after work finishes, restores failed updates, and shows official feature notes with Studio and phone alerts.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the complete protected Codex runtime current without interrupting work, while making every activation, feature summary, failure, and rollback visible to the owner.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCodexUpdateCheckerPackage: AgentPackage = {
      ...localAutomaticCodexUpdatesPackage,
      id: localCodexUpdateCheckerPackageId,
      version: 23.7,
      basePackageId: localAutomaticCodexUpdatesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.7',
      contractAddendum:
        'The owner-facing Codex runtime Settings card shows the installed version, latest known stable version, last successful check time, automatic-update lifecycle, and official release notes. A protected Check for updates action requests an immediate official registry check without disabling the daily updater, duplicating an active check, or interrupting Codex work.',
      instructionsAddendum:
        'Keep the manual Codex update check behind the existing authenticated same-site runtime boundary. Serialize update checks across runtime processes, reject duplicate checks while downloading or activating, announce checking and failure states accessibly, and keep the installed executable available until the existing idle activation and health-check contract succeeds.',
      summary:
        'Codex update checker test package: adds installed/latest version details, last-check time, and an immediate protected update check in Settings.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the Studio owner verify the live Codex version and request a fresh official update check without waiting for the daily schedule or weakening safe activation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localOwnerOnlyWebsiteCodexPackage: AgentPackage = {
      ...localCodexUpdateCheckerPackage,
      id: localOwnerOnlyWebsiteCodexPackageId,
      version: 23.8,
      basePackageId: localCodexUpdateCheckerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.8',
      contractAddendum:
        'The Codex control on the Made Solid development website is rendered only after the website server confirms the exact authenticated Studio admin account and staff record. The embedded Studio panel resynchronizes its remembered open state after the host bridge is ready, so returning to an already-open chat expands it instead of leaving it trapped in the launcher frame.',
      instructionsAddendum:
        'Keep the website Codex iframe and its bridge script absent from signed-out and non-admin responses. Reuse the server-side Studio admin authorization boundary rather than relying on client-side hiding. On iframe load, request the current embedded panel state and accept resize messages only from the configured Studio origin and exact iframe contentWindow. Preserve the owner gateway and runtime authorization checks.',
      summary:
        'Owner-only website Codex panel test package: hides the development-site chat from every non-owner and reliably restores an already-open owner chat.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the development website chat both owner-private and dependable across remembered chat state without weakening the Studio runtime boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAuthenticatedWebsiteCodexEmbedPackage: AgentPackage = {
      ...localOwnerOnlyWebsiteCodexPackage,
      id: localAuthenticatedWebsiteCodexEmbedPackageId,
      version: 23.9,
      basePackageId: localOwnerOnlyWebsiteCodexPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v23.9',
      contractAddendum:
        'The owner-only Codex panel on dev.madesolid.com.au uses the existing owner-authenticated Development Studio session and an explicit website-Codex marker. Only that marked iframe from the exact development website origin may be framed; normal Studio documents remain non-frameable.',
      instructionsAddendum:
        'Keep the iframe itself behind the exact hello@madesolid.com.au website server authorization and never place a Supabase access token in browser markup or a URL. Authorize framing only when the explicit iframe marker, Fetch Metadata, exact development website referrer, and owner-authenticated Development Studio cookie all match. Reject every other iframe parent and retain owner-cookie protection for the document and its modules.',
      summary:
        'Authenticated website Codex embed test package: replaces the broken frame with a narrowly frameable owner session while keeping the rest of Development Studio non-frameable.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the authorized development-website launcher load reliably without weakening the existing owner-only Studio boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAstraReadyCodexRuntimePackage: AgentPackage = {
      ...localAuthenticatedWebsiteCodexEmbedPackage,
      id: localAstraReadyCodexRuntimePackageId,
      version: 24,
      basePackageId: localAuthenticatedWebsiteCodexEmbedPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.0',
      contractAddendum:
        'The protected Studio runtime includes stable Codex CLI 0.153.2 and reads both the visible and hidden signed-in App Server model catalogue, exposing only public models plus the explicitly supported GPT-6 Astra rollout. Settings shows whether Astra is available to the account, the exact runtime-advertised reasoning and service tiers, and how future runtime, model-metadata, and Studio-contract changes are adopted. Immediate feature notes may come from the official OpenAI Codex GitHub releases while the official changelog page catches up.',
      instructionsAddendum:
        'Treat the signed-in App Server model catalogue as the availability boundary. Never synthesize Astra access: include gpt-6-astra in the Studio picker only when model/list returns it, accept only that named rollout model from hidden entries, validate every requested reasoning level and service tier against its returned metadata, and keep all other hidden internal models unavailable. Retain daily verified stable updates, idle activation, health checks, rollback, and notifications. Merge release notes only from official OpenAI Codex sources, prefer the immediate GitHub release entry for duplicate versions, and keep arbitrary future Studio UI or API changes versioned and tested rather than claiming they can be safely guessed.',
      summary:
        'Astra-ready Codex runtime test package: bundles Codex 0.153.2, safely unlocks GPT-6 Astra when the account receives it, and documents automatic versus versioned update adoption.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps Studio current with Codex runtime and model rollouts while making account availability, exact model controls, feature notes, and Studio-specific adoption truthful and reviewable.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localReliableNewCodexChatPackage: AgentPackage = {
      ...localAstraReadyCodexRuntimePackage,
      id: localReliableNewCodexChatPackageId,
      version: 24.1,
      basePackageId: localAstraReadyCodexRuntimePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.1',
      contractAddendum:
        'A newly created Codex conversation remains the selected safe empty chat while the live App Server is still materializing its first transcript. The bridge binds the sparse thread/start result to the already validated universal or client workspace and does not turn a temporary initial thread/read failure into an unreadable-conversation warning.',
      instructionsAddendum:
        'Normalize every successful thread/start response with the exact requested workspace path and scope before storing or returning it. Preserve those trusted fields when thread/list or thread/read temporarily omits them. While the bridge still owns a newly started empty thread, treat a failed initial read as an empty transcript and retry through normal polling; retain the existing safety warning for every established or untrusted thread read failure.',
      summary:
        'Reliable new Codex chat test package: keeps a fresh empty conversation usable while the live runtime materializes it instead of showing a false safety error.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes New chat dependable against sparse and temporarily unreadable App Server responses without weakening workspace isolation for existing conversations.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRestorableManagedCodexChatsPackage: AgentPackage = {
      ...localReliableNewCodexChatPackage,
      id: localRestorableManagedCodexChatsPackageId,
      version: 24.2,
      basePackageId: localReliableNewCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.2',
      contractAddendum:
        'The cross-origin Clientspace Codex embed recovers deterministically after Chrome process or back-forward-cache restoration. The host conceals partial iframe rendering until a trusted ready state, repeats its synchronization handshake after load, focus, visibility, and pageshow events, and the panel converts transient status failures into a retryable connected surface instead of an indefinite spinner. Saved idle conversations expose a confirmed delete action in the conversation picker.',
      instructionsAddendum:
        'Do not rely on animation-completion or a one-shot postMessage handshake for restored browser state. Keep the embedded surface hidden and non-interactive until its trusted Studio frame responds ready, retry synchronization after browser lifecycle events, bound status requests, and keep normal polling able to reconnect. Allow permanent thread deletion only after explicit confirmation and exact workspace-scope validation; reject active or queued work, remove deleted lifecycle and transcript-position state, and select a safe remaining conversation when the active chat is deleted.',
      summary:
        'Restorable managed Codex chats test package: repairs Chrome-restored embed and loading states and adds confirmed deletion for saved idle chats.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the cross-product Codex chat usable after mobile Chrome restoration and lets the Studio owner safely remove unwanted saved conversations.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDurableNewCodexChatPackage: AgentPackage = {
      ...localRestorableManagedCodexChatsPackage,
      id: localDurableNewCodexChatPackageId,
      version: 24.3,
      basePackageId: localRestorableManagedCodexChatsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.3',
      contractAddendum:
        'A validated newly created Codex conversation remains safely selectable across browser refreshes and live bridge reloads while Codex App Server 0.153.1 reports list_turns as unsupported for its still-empty transcript. The bridge persists only bounded thread identity, exact workspace scope and path, runtime status, and timestamps in private server storage, then removes that record when the conversation materializes or is deleted.',
      instructionsAddendum:
        'Persist at most ten bridge-created empty-thread trust records atomically outside the feedback queue. Hydrate them before opening the App Server connection, validate their exact workspace path and scope on every use, and never persist transcript or prompt content. Treat an unsupported initial list_turns read as an empty transcript only for one of those trusted records. Remove the record after readable content appears or deletion succeeds; retain the existing safety warning for every untrusted thread read failure.',
      summary:
        'Durable new Codex chat test package: keeps a validated empty chat usable across refreshes and bridge reloads while the live runtime finishes materializing it.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes New chat reliable against the exact Codex 0.153.1 empty-transcript response without weakening client-workspace isolation or persisting conversation content.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localConciseCurrentWorkChatTitlesPackage: AgentPackage = {
      ...localDurableNewCodexChatPackage,
      id: localConciseCurrentWorkChatTitlesPackageId,
      version: 24.4,
      basePackageId: localDurableNewCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.4',
      contractAddendum:
        'Every Studio Codex conversation title is a compact summary of that thread’s latest requested work. The title removes conversational lead-ins, capture provenance, links, and trailing purpose clauses while the existing adjacent state reports whether the work is active, finished, unread, interrupted, or ready.',
      instructionsAddendum:
        'Derive every conversation chooser label from the newest thread preview without making another model or per-thread network request. Normalize common conversational requests into direct work summaries, preserve a saved thread name only when no preview exists, shorten at a readable word boundary, and keep live lifecycle and last-used information as separate accessible metadata.',
      summary:
        'Concise current-work chat titles test package: makes every conversation recognizable at a glance from its latest task without slowing the chooser.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the chat chooser scannable by turning each latest request into a short current-work label while retaining truthful live state and timing.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExplicitWebsiteEditVersionStatusPackage: AgentPackage = {
      ...localConciseCurrentWorkChatTitlesPackage,
      id: localExplicitWebsiteEditVersionStatusPackageId,
      version: 24.5,
      basePackageId: localConciseCurrentWorkChatTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.5',
      contractAddendum:
        'Website editing presents the current working website and latest committed Made Solid edit checkpoint as separate, directly comparable states. It derives an explicit up-to-date, uncommitted-changes, checkpoint-behind, not-synced, or unavailable result from the exact Git head, changed-file list, committed-version record, and upstream sync state.',
      instructionsAddendum:
        'Never imply that the next available version number already exists. Compare the current Git head with the latest committed edit record, report pending file changes separately, keep remote sync distinct from local checkpoint equality, and give the reviewer a direct next action whenever the checkpoint is behind.',
      summary:
        'Explicit website edit version status test package: makes it immediately clear whether the latest committed version contains the current working website.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents stale committed checkpoints and pending working edits from being mistaken for the same website version.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localRecoverStaleEmptyCodexChatPackage: AgentPackage = {
      ...localExplicitWebsiteEditVersionStatusPackage,
      id: localRecoverStaleEmptyCodexChatPackageId,
      version: 24.6,
      basePackageId: localExplicitWebsiteEditVersionStatusPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.6',
      contractAddendum:
        'A browser selection that points to an older empty Codex thread without a durable bridge record no longer traps the Studio owner behind a false safety warning. When the live App Server returns its specific unsupported list_turns response for that unmaterialized selection, Studio exposes none of the unknown thread and falls back to a separately validated listed conversation or an empty ready surface. A changed bridge waits for the current maintenance or queue flush checkpoint and then replaces the old instance instead of allowing recurring maintenance to starve live reload indefinitely.',
      instructionsAddendum:
        'Continue to show the preserved-conversation safety warning for every genuine read error. Suppress it only when the requested untrusted identifier returns the App Server unmaterialized-thread signature. Do not adopt, display, send to, or infer a workspace for that orphan identifier; discard the stale selection and use only an independently listed, exact-workspace conversation. Keep durable trust records for all newly bridge-created empty chats. When bridge source mtime changes, await only the active maintenance or flush promise, retry bridge resolution immediately, transfer trusted started-thread state, and close the old instance.',
      summary:
        'Stale empty Codex chat recovery test package: loads the current bridge and releases older orphaned New chat selections from the false safety warning without trusting or exposing them.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Ensures the live development endpoint adopts the recovery, letting affected browsers recover while retaining the exact safety boundary for real unreadable and cross-workspace conversations.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRecentRequestChatContextPackage: AgentPackage = {
      ...localRecoverStaleEmptyCodexChatPackage,
      id: localRecentRequestChatContextPackageId,
      version: 24.7,
      basePackageId: localRecoverStaleEmptyCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.7',
      contractAddendum:
        'Every Studio Codex chooser label is derived from the newest privately saved request for that exact conversation, with the runtime thread preview retained only as a fallback. The open conversation keeps a compact, non-interactive copy of the reviewer’s latest request above the scrolling transcript, including queued and just-sent requests, while capture provenance stays hidden.',
      instructionsAddendum:
        'Build one latest-request map from the already loaded private feedback records and apply it only to conversations that passed the existing workspace-scope checks; do not issue per-thread reads or model calls for titles. In the selected chat, prefer a just-sent request, then the newest queued request, then the newest rendered user message. Keep the pinned reminder outside the scrolling log, limit it to two visual lines, expose the full cleaned request as its title, and preserve the transcript’s available height at mobile, tablet, and desktop widths.',
      summary:
        'Recent request chat context test package: keeps every chat title current and pins the latest request in a compact reminder.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes conversations identifiable from their actual latest work and keeps the current ask visible without repeated scrolling or a crowded chat surface.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResilientWebsiteCodexResumePackage: AgentPackage = {
      ...localRecentRequestChatContextPackage,
      id: localResilientWebsiteCodexResumePackageId,
      version: 24.8,
      basePackageId: localRecentRequestChatContextPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.8',
      contractAddendum:
        'The owner-only Codex iframe on the Made Solid development website never leaves a discarded browser frame visible after Android Chrome restores a backgrounded or closed tab. The website conceals the old frame during page hide and every foreground synchronization, waits for a trusted ready acknowledgement from the exact Studio origin and iframe window, and reloads the same authenticated embed with a cache-busting resume token when no acknowledgement arrives within a bounded delay.',
      instructionsAddendum:
        'Preserve the iframe-owned open or closed conversation state across recovery. Keep the stale frame non-interactive and invisible, show only a compact owner-only reconnecting placeholder in its footprint, and reveal the iframe only after its validated panel-ready response. Apply the same path to focus, pageshow, online, and visible-state restoration without exposing the control to signed-out or non-owner accounts.',
      summary:
        'Resilient website Codex resume test package: replaces broken restored frames with bounded automatic recovery.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents Android Chrome from exposing a dead embedded Studio document when the Made Solid development website returns from the background.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAutomaticClientEmailHandoffPackage: AgentPackage = {
      ...localResilientWebsiteCodexResumePackage,
      id: localAutomaticClientEmailHandoffPackageId,
      version: 24.9,
      basePackageId: localResilientWebsiteCodexResumePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v24.9',
      contractAddendum:
        'Every Clientspace handoff surface resolves one client email from the latest immutable Research Packet and its page-level public evidence, unless a saved prospect contact takes priority. Contact-page and general business addresses rank ahead of weaker candidates, rejected and no-reply values are excluded, and equally strong alternatives require a visible choice.',
      instructionsAddendum:
        'Use the existing website capture instead of scraping again during handoff. Keep the selected address synchronized while evidence loads, stop automatic replacement after the reviewer edits it, show its source and alternatives, and never treat prefilling as permission to send email or create an account automatically.',
      summary:
        'Automatic client email handoff test package: carries the best captured public address into both Clientspace handoff paths with visible provenance and ambiguity controls.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes repeated email entry while making the captured source, competing addresses, and no-send boundary clear before Clientspace creation.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localClientPreviewCodexIsolationPackage: AgentPackage = {
      ...localAutomaticClientEmailHandoffPackage,
      id: localClientPreviewCodexIsolationPackageId,
      version: 25,
      basePackageId: localAutomaticClientEmailHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.0',
      contractAddendum:
        'The owner-only Codex control belongs only to a top-level Made Solid development website. Clientspace thumbnails and interactive website-review frames never render the Studio Codex iframe or its reconnecting placeholder, even when the reviewer is simultaneously authenticated as the Studio owner.',
      instructionsAddendum:
        'Reject the website Codex surface server-side when the browser requests the document as an iframe. Retain a client-side nested-frame guard for deployments or proxies that omit request-destination metadata. Remove both the Codex iframe and reconnecting placeholder without disturbing the separate client feedback bridge, and preserve the top-level owner-only Codex experience.',
      summary:
        'Client preview Codex isolation test package: keeps Studio chat controls out of client-facing website frames.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents authenticated owner tooling from appearing inside Clientspace thumbnails and the interactive client website preview.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localImmediateWebsiteCodexOpenPackage: AgentPackage = {
      ...localClientPreviewCodexIsolationPackage,
      id: localImmediateWebsiteCodexOpenPackageId,
      version: 25.1,
      basePackageId: localClientPreviewCodexIsolationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.1',
      contractAddendum:
        'The owner-only Codex launcher on the Made Solid development website accepts the first tap while its embedded Studio capability check is still connecting. The website queues that open request until the authenticated embedded listener is available and expands the trusted panel as soon as it acknowledges the open state, without waiting for the status request to complete.',
      instructionsAddendum:
        'Render the connecting fallback as a keyboard- and touch-operable 56-pixel button. On activation, announce its opening state, repeatedly deliver the pending open request alongside host synchronization, and reveal only an iframe that has sent a validated open acknowledgement from the exact configured Studio origin and contentWindow. Preserve stale-frame recovery, top-level owner authorization, and client-preview exclusion.',
      summary:
        'Immediate website Codex open test package: makes the connecting launcher accept the first tap and open as soon as the trusted embedded UI responds.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the dead first-tap period on slower mobile loads without exposing an untrusted or discarded iframe.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localUnifiedProposalPackage: AgentPackage = {
      ...localImmediateWebsiteCodexOpenPackage,
      id: 'agent-package-local-v25-2-unified-client-proposal',
      version: 25.2,
      basePackageId: localImmediateWebsiteCodexOpenPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.2',
      contractAddendum:
        'Studio prepares one client proposal from the current committed website. Saved editable client details and one source-bound approved quote follow the prospect into the existing Clientspace handoff. Preparation, invitation, payment and launch remain distinct observable stages.',
      instructionsAddendum:
        'Prefill from saved contacts and captured evidence, preserve explicit edits, serialize draft saves and explain failures. Retain approved pricing across refreshes only while scope, commercial terms and validity still match. Keep original-build review creation out of the main proposal flow and hide internal learning tools behind disclosure. Carry the approved quote into immutable Clientspace quote history without treating a proposed deposit as paid.',
      summary:
        'Unified client proposal test package: one saved form and quote, existing handoff navigation, transparent payment setup and clear launch steps.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localRecoveringCodexTranscriptsPackage: AgentPackage = {
      ...localUnifiedProposalPackage,
      id: 'agent-package-local-v25-3-recovering-codex-transcripts',
      version: 25.3,
      basePackageId: localUnifiedProposalPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.3',
      contractAddendum:
        'New Codex conversations clear the previous conversation error immediately. Incomplete background updates retain only the same conversation last loaded transcript with an explicit reconnecting notice and recover automatically. Stalled child-agent reads cannot block the parent transcript.',
      instructionsAddendum:
        'Bound the full status request including authentication and body reading, discard late responses after a conversation transition, and clear the polling lock on every outcome. Keep last loaded messages and agent placement together only for the same conversation, disable sending during transcript recovery, and replace them with the next complete response. Never merge evidence across conversation IDs or bypass workspace checks.',
      summary:
        'Recovering Codex transcripts test package: clears new-chat errors and restores stalled or incomplete chat updates without a page refresh.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCompleteCodexReadPlaybackPackage: AgentPackage = {
      ...localRecoveringCodexTranscriptsPackage,
      id: 'agent-package-local-v25-4-complete-codex-read-playback',
      version: 25.4,
      basePackageId: localRecoveringCodexTranscriptsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.4',
      contractAddendum:
        'Natural Codex read playback preserves every numbered item, bullet, implementation paragraph, and verification detail from the selected reply. Markdown decoration remains quiet while the substantive visible text is spoken in document order through both private Google audio and device speech fallback.',
      instructionsAddendum:
        'Do not remove, condense, or replace reply content based on list length or technical keywords. Keep each list item as a separate speech paragraph so chunking, read-along position, restart, and fallback playback retain the complete sequence. Literal mode may continue to announce structural labels, and Natural mode may continue to simplify Markdown syntax and omit fenced source code with an audible notice.',
      summary:
        'Complete Codex read playback test package: Natural voice playback reads every list item and technical handoff detail in order.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents read playback from silently dropping substantive reply content while retaining the existing Natural and Literal presentation choices.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localStableChatReconnectionPackage: AgentPackage = {
      ...localCompleteCodexReadPlaybackPackage,
      id: 'agent-package-local-v25-5-stable-chat-reconnection',
      version: 25.5,
      status: 'test_ready',
      basePackageId: localCompleteCodexReadPlaybackPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.5',
      contractAddendum:
        'Chat reconnection notices preserve the compact conversation selector and the transcript layout. A saved conversation cannot make an unavailable service appear Ready.',
      instructionsAddendum:
        'Keep the workspace scope and connection notice in one stable layout row. Display Reconnecting while service status is unavailable, retain the saved conversation, and restore the connected header after successful automatic polling.',
      summary:
        'Stable chat reconnection test package: prevents stretched selectors and contradictory Ready labels while reconnecting.',
      capabilityProposal:
        'Keeps mobile chat usable and connection status truthful through transient service failures.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localVisibleCodexFailuresPackage: AgentPackage = {
      ...localStableChatReconnectionPackage,
      id: 'agent-package-local-v25-6-visible-codex-failures',
      version: 25.6,
      basePackageId: localStableChatReconnectionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.6',
      contractAddendum:
        'Failed Codex turns preserve the original user message and show an explicit failure notice. Safety-blocked turns are identified without exposing raw provider output or automatically retrying them.',
      instructionsAddendum:
        'Use saved feedback records to remove transport context from failed and dispatching messages. Derive a safe failure notice from the latest failed turn; clear it when a newer turn supersedes it. Keep safety controls intact and never replay blocked requests automatically.',
      summary:
        'Visible Codex failures test package: clean failed messages and explicit turn failure notices.',
      capabilityProposal:
        'Explains missing replies without leaking transport instructions or bypassing provider safety decisions.',
    };
    const localCompatibleCodexFailureDisplayPackage: AgentPackage = {
      ...localVisibleCodexFailuresPackage,
      id: 'agent-package-local-v25-7-compatible-codex-failure-display',
      version: 25.7,
      basePackageId: localVisibleCodexFailuresPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.7',
      contractAddendum:
        'The development chat displays failures correctly even when its status API is served by an older packaged runtime.',
      instructionsAddendum:
        'Recognize only the known complete Studio transport suffix when cleaning legacy user messages. Preserve message formatting and unrelated text. Use lastTurnStatus to show a generic failed-turn notice when the older runtime supplies no failure detail. Never retry or bypass blocked turns.',
      summary:
        'Compatible Codex failure display test package: clean legacy failed messages and report failures from the packaged status API.',
    };
    const localFailedChatContinuationPackage: AgentPackage = {
      ...localCompatibleCodexFailureDisplayPackage,
      id: 'agent-package-local-v25-8-failed-chat-continuation',
      version: 25.8,
      basePackageId: localCompatibleCodexFailureDisplayPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.8',
      contractAddendum:
        'A failed Codex turn can continue in a newly selected conversation from the last completed assistant reply while the original conversation remains unchanged.',
      instructionsAddendum:
        'Offer recovery only when a completed assistant reply can be branched. Use the existing protected native branch operation with that successful turn identifier, exclude the failed user turn and its transport context, never retry the failed prompt automatically, and focus the composer after the recovered conversation opens.',
      summary:
        'Failed chat continuation test package: continue safely from the last successful reply without replaying the failed prompt.',
      capabilityProposal:
        'Restores a usable composer after a failed turn while preserving the provider safety decision and the original conversation.',
    };
    const localClientspaceRehearsalPackage: AgentPackage = {
      ...localFailedChatContinuationPackage,
      id: 'agent-package-local-v25-9-clientspace-rehearsal',
      version: 25.9,
      basePackageId: localFailedChatContinuationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v25.9',
      contractAddendum:
        'A rehearsal is a separate test prospect and Clientspace that references an original exact verified website without copying or relabelling its release proof.',
      instructionsAddendum:
        'Keep rehearsal contact, proposal and lifecycle state separate from the real prospect. Label every Studio, handoff and Clientspace surface as test-only; create no invitation implicitly; restrict deliberate rehearsal email to its saved test inbox; reject payment, recurring billing and live launch actions server-side.',
      summary:
        'Clientspace rehearsal test package: safely rehearses the complete proposal and client experience without affecting the real prospect.',
      capabilityProposal:
        'Lets the owner prove the first-client workflow end to end while preserving immutable source evidence and hard commercial safeguards.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localGuidedClientHandoffPackage: AgentPackage = {
      ...localClientspaceRehearsalPackage,
      id: 'agent-package-local-v26-0-guided-client-handoff',
      version: 26.0,
      status: 'test_ready',
      basePackageId: localClientspaceRehearsalPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.0',
      contractAddendum:
        'Client handoff presents website and report readiness, saved client details, quote approval and a final review in a responsive guided workflow.',
      instructionsAddendum:
        'Preserve exact release and quote checks, draft persistence and explicit invitation approval. Summarise the current client, project and contact before private preparation; keep technical history and launch guidance in accessible disclosures.',
      summary:
        'Guided client handoff test package: clearer readiness, client details, quote approval and final review across mobile, tablet and desktop.',
      capabilityProposal:
        'Makes the next handoff action understandable while preserving private preparation and deliberate client invitations.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localReliableRehearsalCreationPackage: AgentPackage = {
      ...localGuidedClientHandoffPackage,
      id: 'agent-package-local-v26-1-reliable-rehearsal-creation',
      version: 26.1,
      status: 'test_ready',
      basePackageId: localGuidedClientHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.1',
      contractAddendum:
        'Creating a client-experience rehearsal uses one stable rehearsal identity and recovers automatically from a transient incomplete Studio runtime response without duplicating the test prospect.',
      instructionsAddendum:
        'Describe the rehearsal as practising the client experience, identify the destination as the owner email used for the test, retry an incomplete runtime response once with the exact same idempotency identifier, and preserve a clear actionable error if confirmation still fails.',
      summary:
        'Reliable rehearsal creation test package: clearer test-email language and automatic recovery from blank runtime responses.',
      capabilityProposal:
        'Prevents raw JSON errors and duplicate rehearsals when the live Studio connection briefly interrupts rehearsal creation.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localContextualCodexChatTitlesPackage: AgentPackage = {
      ...localReliableRehearsalCreationPackage,
      id: 'agent-package-local-v26-2-contextual-codex-chat-titles',
      version: 26.2,
      status: 'test_ready',
      basePackageId: localReliableRehearsalCreationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.2',
      contractAddendum:
        'Studio Codex conversation titles describe the current work rather than copying an unclear latest message. A short referential follow-up retains its action while resolving its subject from the preceding private request or a meaningful saved title.',
      instructionsAddendum:
        'Carry only the two newest already-saved prompts for each validated conversation into the private status response. Derive chooser labels locally with no additional model or per-thread request: summarize standalone prompts directly, resolve vague follow-ups such as implement it, discuss this, do it, or it still does not work against the preceding prompt, and ignore generic saved names when no useful context exists.',
      summary:
        'Contextual Codex chat titles test package: keeps each chat recognizable when the latest message relies on earlier conversation context.',
      capabilityProposal:
        'Makes the conversation chooser useful after short follow-ups without adding model latency, usage cost, or cross-thread reads.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAutomaticRehearsalPreviewPackage: AgentPackage = {
      ...localContextualCodexChatTitlesPackage,
      id: 'agent-package-local-v26-3-automatic-rehearsal-preview',
      version: 26.3,
      status: 'test_ready',
      basePackageId: localContextualCodexChatTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.3',
      contractAddendum:
        'Preparing a Clientspace rehearsal automatically queues the verified exact-source preview when it does not already exist, follows its persisted worker status, and continues the rehearsal after the preview is ready.',
      instructionsAddendum:
        'Do not send the owner backwards to prepare a separate original handoff. Reuse an existing exact-source preview job or queue it with the saved test-only contact and approved quote, surface its real persisted phase, and resume Clientspace preparation without another click. Never contact the real client.',
      summary:
        'Automatic rehearsal preview test package: removes the separate original-handoff prerequisite and carries the test through its verified preview step.',
      capabilityProposal:
        'Makes the rehearsal one understandable workflow while retaining exact-source verification, idempotent worker jobs and all commercial safeguards.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localPublishedRepositoryFallbackPackage: AgentPackage = {
      ...localAutomaticRehearsalPreviewPackage,
      id: 'agent-package-local-v26-4-published-repository-fallback',
      version: 26.4,
      status: 'test_ready',
      basePackageId: localAutomaticRehearsalPreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.4',
      contractAddendum:
        'Exact-source handoff verification accepts a workspace without a local origin remote only when the persisted ready GitHub publication for the exact builder run independently matches the expected repository.',
      instructionsAddendum:
        'Keep commit, tree, clean-worktree and attestation checks unchanged. Reject a mismatched configured origin. When origin is absent, require the immutable ready GitHub publication for the same builder run to match before deploying the verified preview.',
      summary:
        'Published repository fallback test package: safely recovers verified preview handoffs when local origin metadata is absent.',
      capabilityProposal:
        'Prevents a missing local Git remote from blocking an otherwise fully verified rehearsal without weakening repository identity checks.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localIsolatedExactPreviewPackage: AgentPackage = {
      ...localPublishedRepositoryFallbackPackage,
      id: 'agent-package-local-v26-5-isolated-exact-preview',
      version: 26.5,
      status: 'test_ready',
      basePackageId: localPublishedRepositoryFallbackPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.5',
      contractAddendum:
        'The handoff worker selects a clean local checkout of the attested commit or creates a disposable detached Git worktree for that exact commit, without rewinding or changing the active editable website.',
      instructionsAddendum:
        'Search only configured prospect repository roots, require the attested commit object, preserve the active checkout, use a uniquely created temporary worktree when isolation is needed, and remove only that exact temporary worktree after success or failure.',
      summary:
        'Isolated exact preview test package: deploys the verified handoff commit without requiring the editable workspace to remain on that older revision.',
      capabilityProposal:
        'Allows a rehearsal of a verified committed edit after later development has begun while preserving both exact-source proof and the current working tree.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localAuthenticatedPreviewDeploymentPackage: AgentPackage = {
      ...localIsolatedExactPreviewPackage,
      id: 'agent-package-local-v26-6-authenticated-preview-deployment',
      version: 26.6,
      status: 'test_ready',
      basePackageId: localIsolatedExactPreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.6',
      contractAddendum:
        'The protected handoff worker passes its configured Vercel access token explicitly to every private project inspection, creation and preview deployment command. An explicit rehearsal retry resets exhausted infrastructure attempts on the same idempotent job.',
      instructionsAddendum:
        'Require a server-only Vercel access token at worker startup, accept the runtime access-token variable or standard CLI token fallback, pass it directly to bounded Vercel commands, and never persist or expose it in browser state or job output.',
      summary:
        'Authenticated preview deployment test package: removes interactive Vercel login and safely resets exhausted attempts when the owner retries the same rehearsal.',
      capabilityProposal:
        'Makes automated rehearsal preview deployment reliable after runtime restarts while keeping the credential server-only.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localVerifiedPreviewCompletionPackage: AgentPackage = {
      ...localAuthenticatedPreviewDeploymentPackage,
      id: 'agent-package-local-v26-7-verified-preview-completion',
      version: 26.7,
      status: 'test_ready',
      basePackageId: localAuthenticatedPreviewDeploymentPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.7',
      contractAddendum:
        'The protected handoff worker reuses a ready private Vercel preview only when its project metadata matches the exact source commit. A new deployment is polled to a verified ready or failed terminal state instead of assuming the initial CLI response is complete.',
      instructionsAddendum:
        'After exact source and release-attestation checks pass, expose a persisted deploying-preview phase. Reuse only a non-production ready preview for the exact commit, otherwise create one and inspect it until ready, failed, cancelled or the bounded timeout expires.',
      summary:
        'Verified preview completion test package: makes automatic rehearsal handoff resilient to asynchronous Vercel deployment responses.',
      capabilityProposal:
        'Prevents a successfully built private preview from being misclassified as failed while preserving exact-commit and no-production-domain safeguards.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localCompatibleHandoffTimestampPackage: AgentPackage = {
      ...localVerifiedPreviewCompletionPackage,
      id: 'agent-package-local-v26-8-compatible-handoff-timestamps',
      version: 26.8,
      status: 'test_ready',
      basePackageId: localVerifiedPreviewCompletionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.8',
      contractAddendum:
        'The synchronized Clientspace receiver accepts standards-compliant ISO timestamps with either the Z UTC designator or an explicit UTC offset. Rejected handoff fields are retained in the private worker failure summary.',
      instructionsAddendum:
        'Keep exact-source, quote and attestation checks unchanged. Normalize validation around equivalent ISO datetime representations, and surface protected receiver field errors in the persisted Studio job without exposing secrets or raw request bodies.',
      summary:
        'Compatible handoff timestamps test package: prevents valid Supabase UTC timestamps from stopping rehearsal preparation and makes future contract failures actionable.',
      capabilityProposal:
        'Allows the verified report and source handoff to cross Studio and Clientspace reliably while preserving all release safeguards.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localOversizedCodexConversationRecoveryPackage: AgentPackage = {
      ...localCompatibleHandoffTimestampPackage,
      id: 'agent-package-local-v26-9-oversized-codex-conversation-recovery',
      version: 26.9,
      status: 'test_ready',
      basePackageId: localCompatibleHandoffTimestampPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v26.9',
      contractAddendum:
        'An oversized or slow Codex transcript remains usable through a bounded newest-turn summary page. The complete saved rollout is preserved, stale older in-progress turns do not override the newest lifecycle, and an authenticated reviewer can explicitly trigger native context compaction without deleting the conversation.',
      instructionsAddendum:
        'Attempt the normal complete transcript read within its bounded timeout, then remember that thread and use experimental thread/turns/list with newest-first summary items for subsequent status reads. Render the limited-history state plainly, keep the composer usable, and expose Repair chat only as a guarded thread/compact/start request after active work finishes. Never truncate, rewrite, or delete the source rollout.',
      summary:
        'Oversized Codex conversation recovery test package: keeps long chats open and adds a safe in-UI repair action.',
      capabilityProposal:
        'Prevents one large transcript from becoming permanently inaccessible while preserving its complete history and workspace boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRehearsalRecipientIsolationPackage: AgentPackage = {
      ...localOversizedCodexConversationRecoveryPackage,
      id: 'agent-package-local-v27-0-rehearsal-recipient-isolation',
      version: 27,
      status: 'test_ready',
      basePackageId: localOversizedCodexConversationRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.0',
      contractAddendum:
        'Automatic rehearsal preparation keeps the rehearsal test inbox separate from the original prospect handoff. An exact source revision may refresh an existing Clientspace without supplying a recipient, in which case the established client-account email is preserved.',
      instructionsAddendum:
        'Never copy rehearsal contact fields into the original source handoff. Queue source-only preparation with the original prospect identity and no recipient override; keep the test inbox only on the separately identified rehearsal record.',
      summary:
        'Rehearsal recipient isolation test package: refreshes the verified source preview without attempting to replace an existing client account email.',
      capabilityProposal:
        'Lets rehearsal creation continue automatically for an existing Clientspace while preventing test contact details from leaking into the real client handoff.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localGuidedClientspaceTestPackage: AgentPackage = {
      ...localRehearsalRecipientIsolationPackage,
      id: 'agent-package-local-v27-1-guided-clientspace-test',
      version: 27.1,
      status: 'test_ready',
      basePackageId: localRehearsalRecipientIsolationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.1',
      contractAddendum:
        'A Clientspace rehearsal remains an internal child of its original prospect instead of appearing in the sales pipeline. Studio resolves the existing rehearsal before offering creation, displays the protected recipient and current Clientspace invitation lifecycle, and prevents accidental duplicate test records.',
      instructionsAddendum:
        'Present one state-aware safe-test workflow on the original prospect. Keep internal rehearsal records out of prospect metrics and lists, query Clientspace read-only for account and invitation status, state exactly whether anything was sent, and place internal identifiers behind technical details.',
      summary:
        'Guided Clientspace test package: replaces duplicate-looking rehearsal prospects with one truthful, state-aware test flow.',
      capabilityProposal:
        'Makes first-client rehearsal understandable without weakening recipient isolation, billing blocks, launch blocks or deliberate invitation controls.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localUniversalBuilderModelSettingsPackage: AgentPackage = {
      ...localGuidedClientspaceTestPackage,
      id: 'agent-package-local-v27-2-universal-builder-model-settings',
      version: 27.2,
      status: 'test_ready',
      basePackageId: localGuidedClientspaceTestPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.2',
      contractAddendum:
        'Every website build and Agent Studio test snapshots the effective organization-wide Codex model, reasoning effort, runtime version, and agent package. Page tests, whole-site tests, and full builds retain separate recommended or custom profiles.',
      instructionsAddendum:
        'Discover selectable models and reasoning levels from the authenticated Codex runtime catalogue. Persist one owner-visible builder preference per workflow class, apply it to every build entry point, and copy the resolved profile onto each queued run before a worker can claim it. Never rewrite an earlier run when settings change.',
      summary:
        'Universal builder model settings test package: adds one editable Settings source for every website build and test with immutable per-run execution details.',
      capabilityProposal:
        'Makes model selection consistent and auditable across prospect builds and Agent Studio tests while retaining economical page-test and quality-first full-site defaults.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResilientCodexRuntimeUpdatesPackage: AgentPackage = {
      ...localUniversalBuilderModelSettingsPackage,
      id: 'agent-package-local-v27-3-resilient-codex-runtime-updates',
      version: 27.3,
      status: 'test_ready',
      basePackageId: localUniversalBuilderModelSettingsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.3',
      contractAddendum:
        'Codex runtime updates expose persisted phase timing and ordered progress, resume an interrupted activation health check, and automatically restore the previous executable when a bounded activation phase stalls. Existing conversations remain readable, and messages submitted during the App Server handover are saved durably for automatic delivery after reconnection.',
      instructionsAddendum:
        'Keep the current Codex executable serving chat while checking and downloading. Pause durable queue dispatch only for the activation handover, accept and validate existing-conversation messages into that queue, resume dispatch after reconnection, and never report a saved message as sent. Resume or roll back persisted restarting state after a supervisor restart; fail any checking, download, restart-pending, or health-check phase that exceeds its bounded timeout with an owner-visible explanation.',
      summary:
        'Resilient Codex runtime updates test package: adds visible phases, bounded recovery, resumable health checks, and durable chat sends during activation.',
      capabilityProposal:
        'Prevents a runtime update from trapping Studio in an indefinite updating state or forcing the owner to copy and retry a chat message.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localVoiceDictatedCodexChatPackage: AgentPackage = {
      ...localResilientCodexRuntimeUpdatesPackage,
      id: 'agent-package-local-v27-4-voice-dictated-codex-chat',
      version: 27.4,
      status: 'test_ready',
      basePackageId: localResilientCodexRuntimeUpdatesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.4',
      contractAddendum:
        'The Codex message composer can use browser speech recognition to append live transcription to the saved draft. Studio sends only the reviewed text when the owner explicitly presses Send; it never stores or forwards microphone audio.',
      instructionsAddendum:
        'Expose a 44px accessible microphone control without reducing the compact composer. Show starting, listening, stopping, permission-error, and unavailable states; preserve existing draft text; stop on backgrounding or navigation; and require review before an explicit send.',
      summary:
        'Voice-dictated Codex chat test package: adds live browser transcription as a reviewable message draft with explicit privacy and error states.',
      capabilityProposal:
        'Lets the Studio owner speak longer Codex requests while retaining the same editable draft and deliberate send boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localImmediateRehearsalPipelineIsolationPackage: AgentPackage = {
      ...localVoiceDictatedCodexChatPackage,
      id: 'agent-package-local-v27-5-immediate-rehearsal-pipeline-isolation',
      version: 27.5,
      status: 'test_ready',
      basePackageId: localVoiceDictatedCodexChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.5',
      contractAddendum:
        'Internal Clientspace rehearsal children remain attached to their original prospect and are excluded from pipeline lists and metrics from the first lightweight organization read, before detailed workspace hydration completes.',
      instructionsAddendum:
        'Classify rehearsal businesses from their proposal-draft marker whenever the prospect index is loaded. Keep the internal record intact for recipient, proposal, payment and lifecycle isolation, but expose its controls only from the original prospect handoff.',
      summary:
        'Immediate rehearsal pipeline isolation test package: prevents internal test children from flashing in the prospect pipeline during startup.',
      capabilityProposal:
        'Removes the duplicate-looking rehearsal card without deleting or weakening the isolated test workspace behind the original prospect.',
      stagedBehaviourIds: ['framework-quality-gates'],
    };
    const localBrandedExactClientPreviewPackage: AgentPackage = {
      ...localImmediateRehearsalPipelineIsolationPackage,
      id: 'agent-package-local-v27-6-branded-exact-client-preview',
      version: 27.6,
      status: 'test_ready',
      basePackageId: localImmediateRehearsalPipelineIsolationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.6',
      contractAddendum:
        'A verified source handoff may assign only its dedicated preview.<project>.madesolid.com.au hostname to the exact immutable Vercel preview deployment. The branded preview remains separate from the project live hostname and production release.',
      instructionsAddendum:
        'Register the branded preview as a project custom domain, pin its alias to the exact source-commit deployment, verify the alias resolves to that deployment, and prove it is publicly reachable without a provider login before saving it to Clientspace. Fail closed instead of exposing a Vercel URL or moving the live client domain.',
      summary:
        'Branded exact client preview test package: gives client review emails a Made Solid preview hostname pinned to the verified website version.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps Vercel deployment addresses internal while preserving exact-version review and a separate, deliberate live launch.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localEmailReadyHomepagePreviewPackage: AgentPackage = {
      ...localBrandedExactClientPreviewPackage,
      id: 'agent-package-local-v27-7-email-ready-homepage-preview',
      version: 27.7,
      status: 'test_ready',
      basePackageId: localBrandedExactClientPreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.7',
      contractAddendum:
        'Every generated website foundation exposes the Made Solid review bridge only when it is embedded by a trusted Made Solid parent. The bridge provides a settled exact-homepage capture for client introduction emails without changing the public website or its live release state.',
      instructionsAddendum:
        'Keep the review bridge in the locked foundation, restrict its parent origin to Made Solid or local development, wait for final website content and visible media before capture, and use the exact branded preview URL as both the capture source and linked destination.',
      summary:
        'Email-ready homepage preview test package: lets Clientspace embed a settled screenshot from the exact branded website in the introduction email.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the first client email visual and dependable while the screenshot and branded live preview remain tied to the same verified website version.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localCompactCodexComposerNotificationsPackage: AgentPackage = {
      ...localEmailReadyHomepagePreviewPackage,
      id: 'agent-package-local-v27-8-compact-codex-composer-notifications',
      version: 27.8,
      status: 'test_ready',
      basePackageId: localEmailReadyHomepagePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.8',
      contractAddendum:
        'Codex runtime update, rollback, and failure notices can be dismissed for their exact lifecycle state. Adding camera-roll or captured image evidence keeps the message field compact and every inline composer action reachable while previews remain removable and horizontally scrollable.',
      instructionsAddendum:
        'Give each visible Codex runtime-update state an accessible 44px dismiss action and allow a later lifecycle state to appear. Do not focus or expand the message field merely because an image was attached. Keep attachment previews in one bounded horizontal strip without clipping capture, setup, settings, Stop, or Send controls at mobile, tablet, or desktop widths.',
      summary:
        'Compact Codex composer notifications test package: adds dismissible update notices and keeps photo attachments from pushing inline chat actions out of reach.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the embedded Codex chat controllable after photo attachment and lets the owner clear update or rollback notices without hiding later lifecycle changes.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPublicOnlyManifestSourcesPackage: AgentPackage = {
      ...localCompactCodexComposerNotificationsPackage,
      id: 'agent-package-local-v27-9-public-only-manifest-sources',
      version: 27.9,
      status: 'test_ready',
      basePackageId: localCompactCodexComposerNotificationsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v27.9',
      contractAddendum:
        'Research capture, redesign briefs, and Build Manifests may contain only stable public website pages. Authentication, login, OAuth, credential-bearing, and temporary session redirect URLs are excluded before they can become page plans or builder routes.',
      instructionsAddendum:
        'Treat authentication redirects as failed private evidence, continue capturing the remaining public pages, normalise safe page URLs consistently across selection and disposition matching, and never expose session query parameters in a Build Manifest or builder error.',
      summary:
        'Public-only manifest sources test package: excludes temporary authentication redirects while preserving every legitimate captured public page.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents provider login sessions from becoming generated site routes or blocking an otherwise valid public-page manifest.',
      stagedBehaviourIds: ['site-navigation-architecture'],
    };
    const localBuilderVersionDialogPackage: AgentPackage = {
      ...localPublicOnlyManifestSourcesPackage,
      id: 'agent-package-local-v28-0-builder-version-dialog',
      version: 28,
      status: 'test_ready',
      basePackageId: localPublicOnlyManifestSourcesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.0',
      contractAddendum:
        'Agent Studio and full website build workspaces expose the same in-place Codex version dialog. It shows the effective page-test, whole-site-test, and full-site model and reasoning profiles plus the active runtime version without navigating away from current work.',
      instructionsAddendum:
        'Provide one accessible shared dialog from Agent Studio and complete website build controls. Keep the trigger at least 44 pixels, trap focus while open, support close control and Escape dismissal with focus restoration, prevent mobile overflow, and retain immutable model, reasoning, runtime, and package details on existing runs.',
      summary:
        'Builder version dialog test package: restores in-place access to the Codex versions used by Agent Studio and complete website builds.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the Studio owner inspect or change future builder execution profiles without losing the current Agent Studio or prospect-build context.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localVisibleBuilderCodexVersionPackage: AgentPackage = {
      ...localBuilderVersionDialogPackage,
      id: 'agent-package-local-v28-1-visible-builder-codex-version',
      version: 28.1,
      status: 'test_ready',
      basePackageId: localBuilderVersionDialogPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.1',
      contractAddendum:
        'Agent Studio tests and full website builds always show the effective Codex model, reasoning level, and runtime version before work starts, while it is active, and after it finishes or stops. Active and completed runs use only their immutable execution snapshot.',
      instructionsAddendum:
        'Show a responsive accessible Codex execution summary beside each builder workflow. Before a run, identify the saved effective profile and current runtime while stating that the exact runtime is captured at worker start. During and after a run, replace planned values with the immutable model, reasoning, runtime, and profile source saved on that run; never present current preferences as historical execution facts.',
      summary:
        'Visible builder Codex version test package: keeps the planned or recorded Codex execution version visible through the full build lifecycle.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the Studio owner confirm which Codex configuration will run and verify the exact recorded configuration while reviewing active or finished work.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAutomaticBuilderQualityRepairPackage: AgentPackage = {
      ...localVisibleBuilderCodexVersionPackage,
      id: 'agent-package-local-v28-2-automatic-builder-quality-repair',
      version: 28.2,
      status: 'test_ready',
      basePackageId: localVisibleBuilderCodexVersionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.2',
      contractAddendum:
        'Agent Studio tests and complete website builds run one bounded automatic Codex repair pass when the first automated quality suite does not pass, then compile and execute the complete suite again. The first results remain immutable repair input, and an unsuccessful repair preserves the original private preview and evidence.',
      instructionsAddendum:
        'Repair only the exact recorded quality findings within the existing manifest, factual, asset, route, file-scope, and locked-foundation boundaries. Do not suppress checks, remove required content, add dependencies, broaden claims, or redesign unrelated work. Run at most one automatic pass; if findings remain or repair cannot finish, keep the build private and surface the original and final evidence with a focused human next action.',
      summary:
        'Automatic builder quality repair test package: fixes recorded Agent Studio and full-site quality failures once, then reruns the complete suite.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Reduces manual repair loops while keeping bounded cost, immutable evidence, safe fallback source, and honest review-required outcomes.',
      stagedBehaviourIds: ['visual-codex-feedback', 'framework-quality-gates'],
    };
    const localReliableBuilderRepairPackage: AgentPackage = {
      ...localAutomaticBuilderQualityRepairPackage,
      id: 'agent-package-local-v28-3-reliable-builder-repair',
      version: 28.3,
      status: 'test_ready',
      basePackageId: localAutomaticBuilderQualityRepairPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.3',
      contractAddendum:
        'Every Codex website build and quality repair uses workspace-write with automatic approval review in the protected container. A successful Codex process must change generated source; an execution-environment block or zero-change result is a worker failure and can never be compiled or presented as a website. Manual quality repair restores saved source when available and otherwise rebuilds the selected scope from its immutable manifest.',
      instructionsAddendum:
        'Treat namespace or shell execution denial as an infrastructure failure even when the Codex process exits successfully. Require a real generated-source change before validation, retain locked-foundation and scoped-file checks, and give completed tests one repair action that runs Codex against their recorded findings. If no validated checkpoint exists, use the immutable manifest and approved assets rather than retesting the locked starter.',
      summary:
        'Reliable builder repair test package: restores container-safe Codex editing, rejects zero-change builds, and makes manual quality repair rebuild unusable starter output.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a blocked Codex shell from masquerading as a finished website and gives failed Agent Studio or full-site tests a repair path that produces openable generated output.',
      stagedBehaviourIds: ['visual-codex-feedback', 'framework-quality-gates'],
    };
    const localCompactPhotoComposerPackage: AgentPackage = {
      ...localReliableBuilderRepairPackage,
      id: 'agent-package-local-v28-4-compact-photo-composer',
      version: 28.4,
      status: 'test_ready',
      basePackageId: localReliableBuilderRepairPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.4',
      contractAddendum:
        'Attaching camera-roll or captured images keeps every Codex composer action, including Send, fully inside both the composer and browser viewport at 320px and wider. Compact controls retain 44px targets and attachment previews remain horizontally scrollable.',
      instructionsAddendum:
        'Verify the image-attached composer at 320 by 568, 375 by 812, 768 by 1024, and 1440 by 900. Require zero unintended horizontal overflow and keep the complete upload, capture, run setup, chat settings, and Send controls within the visible composer without shrinking their touch targets.',
      summary:
        'Compact photo composer test package: keeps Send fully visible after image attachment at the narrowest supported Studio viewport.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents image evidence from making a Codex message impossible to send on compact phones.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSettledNavigationQualityPackage: AgentPackage = {
      ...localCompactPhotoComposerPackage,
      id: 'agent-package-local-v28-5-settled-navigation-quality',
      version: 28.5,
      status: 'test_ready',
      basePackageId: localCompactPhotoComposerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.5',
      contractAddendum:
        'Responsive navigation quality replay completes the normal Escape-dismissal exit before changing the browser to reduced motion and testing the same trigger again. An invisible outgoing backdrop may never be mistaken for a broken compact trigger.',
      instructionsAddendum:
        'Verify normal pointer opening, Escape dismissal, focus restoration, completed exit-layer removal, and reduced-motion reopening in that order. Report a persistent outgoing layer separately from a trigger activation failure, and never switch motion preferences during an active exit transition.',
      summary:
        'Settled navigation quality test package: removes a false compact-menu failure caused by changing motion preferences during exit.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps genuine blocked menu interactions reviewable while allowing valid responsive navigation to pass the complete browser suite.',
      stagedBehaviourIds: ['visual-codex-feedback', 'framework-quality-gates'],
    };
    const localVisibleBuilderModelsPackage: AgentPackage = {
      ...localSettledNavigationQualityPackage,
      id: 'agent-package-local-v28-6-visible-builder-models',
      version: 28.6,
      status: 'test_ready',
      basePackageId: localSettledNavigationQualityPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.6',
      contractAddendum:
        'Agent Studio and full website workflows show the effective Codex model before a build starts and retain the immutable model snapshot beside every saved generated website. Agent Studio separates primary website creation from optional package refinement.',
      instructionsAddendum:
        'Keep the planned model summary above each build setup. Show the recorded model and reasoning level on every completed or stopped website entry, never substituting current preferences for historical run data. Group the primary Agent Studio creation flow separately from collapsed advanced package capabilities and directions.',
      summary:
        'Visible builder models test package: surfaces the planned and recorded Codex model throughout cleaner, grouped website creation workflows.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes model choice verifiable before building and preserves that execution fact while reducing Agent Studio setup clutter.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localSettledEmailHomepageCapturePackage: AgentPackage = {
      ...localVisibleBuilderModelsPackage,
      id: 'agent-package-local-v28-7-settled-email-homepage-capture',
      version: 28.7,
      status: 'test_ready',
      basePackageId: localVisibleBuilderModelsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.7',
      contractAddendum:
        'The first-introduction email may accept a generated homepage screenshot only from the versioned Made Solid capture bridge after the page has reached its final reveal state, fonts and visible media have loaded, and the viewport geometry has remained stable. An unverified, timed-out, stale-bridge, or partially loaded image keeps sending locked.',
      instructionsAddendum:
        'Use the settled-email-homepage-capture-v2 handshake for email screenshots. Disable capture-time motion, wait for loaded fonts and every visible image or video, require a stable viewport across repeated checks, and fail with a retryable explanation instead of continuing after a timeout. Keep the exact verified website URL as the screenshot source and email destination.',
      summary:
        'Settled email homepage capture test package: prevents the introduction email from saving a partially loaded website preview.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the initial client email wait for a fully loaded, visually settled homepage and reject stale or incomplete captures.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localOwnerDevicePreviewPackage: AgentPackage = {
      ...localSettledEmailHomepageCapturePackage,
      id: 'agent-package-local-v28-8-owner-device-preview',
      version: 28.8,
      status: 'test_ready',
      basePackageId: localSettledEmailHomepageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.8',
      contractAddendum:
        'Every saved Agent Studio test, complete website build, and owner-managed live website exposes one separate Made Solid Inspect link with phone, tablet, and desktop viewport presets. The clean client review hostname, feedback workflow, generated source, and publication state remain unchanged.',
      instructionsAddendum:
        'Open responsive inspection through the protected inspect.madesolid.com.au shell. Default to the 1440 by 900 desktop viewport, allow 375 by 812 phone and 768 by 1024 tablet selection, preserve the selected device in the viewer URL, and clearly distinguish mutable working source from immutable saved output. Accept only issued private preview capabilities or exact Made Solid branded client previews; never turn the viewer into an arbitrary URL proxy.',
      summary:
        'Owner device preview test package: opens generated and editable websites in one phone-accessible desktop, tablet, and phone inspection surface.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the Studio owner inspect a real desktop-responsive layout from a phone while keeping Clientspace review links and feedback separate.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localEditableClientspaceBalancePackage: AgentPackage = {
      ...localOwnerDevicePreviewPackage,
      id: 'agent-package-local-v28-9-editable-clientspace-balance',
      version: 28.9,
      status: 'test_ready',
      basePackageId: localOwnerDevicePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v28.9',
      contractAddendum:
        'Clientspace Admin exposes the current final balance as a route-backed pricing control. Every edit creates an immutable quote revision with an explicit reason and outstanding-milestone breakdown; payment-started balances remain locked. A protected durable worker synchronizes the exact revision into the originating Studio proposal without changing the committed website scope.',
      instructionsAddendum:
        'Treat Clientspace as the operational source for post-handoff balance amendments. Preserve the opening payment, require every outstanding milestone and an audit reason, keep Stripe blocked unless the current project balance and quote agree, and expose queued, running, synced, or failed Studio synchronization truthfully. In Studio, show the imported Clientspace balance and reason on the ready handoff.',
      summary:
        'Editable Clientspace balance test package: opens a complete pricing breakdown, saves safe balance revisions, and synchronizes them back to Studio.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the owner revise a final balance once in Clientspace while preserving quote history, checkout integrity, and the matching Studio commercial record.',
      stagedBehaviourIds: ['commercial-offer-strategy'],
    };
    const localReadableAgentStudioRefinementPackage: AgentPackage = {
      ...localEditableClientspaceBalancePackage,
      id: 'agent-package-local-v29-0-readable-agent-studio-refinement',
      version: 29,
      status: 'test_ready',
      basePackageId: localEditableClientspaceBalancePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.0',
      contractAddendum:
        'Agent Studio advanced refinement remains a full-width, readable disclosure at every supported viewport and during live source updates. Earlier stacked refinement markup and the current disclosure layout may coexist briefly without collapsing explanatory text into a narrow grid column.',
      instructionsAddendum:
        'Scope the current two-column summary layout to its explicit disclosure variant, retain a safe single-column base header for live-update compatibility, and verify the closed and open refinement states at 320 by 568, 375 by 812, 768 by 1024, and 1440 by 900 without horizontal overflow.',
      summary:
        'Readable Agent Studio refinement test package: keeps advanced package guidance full-width through compact layouts and live source transitions.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents Agent Studio refinement guidance from collapsing into one-word lines while the development UI receives a source update.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localVisibleChatGptCreditsPackage: AgentPackage = {
      ...localReadableAgentStudioRefinementPackage,
      id: localVisibleChatGptCreditsPackageId,
      version: 29.1,
      status: 'test_ready',
      basePackageId: localReadableAgentStudioRefinementPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.1',
      contractAddendum:
        'Studio Codex distinguishes purchased ChatGPT flexible-usage credits from separately billed OpenAI API access. When included usage is exhausted and the signed-in Codex account reports a usable credit balance, chat visibly states that ChatGPT credits are active and shows the verified remaining balance.',
      instructionsAddendum:
        'Read the Codex credit snapshot and ordinaryUsageAllowed state from account/rateLimits/read. Expose only bounded credit availability, unlimited status, and non-negative balance. Show an active-credit notice in the chat header and the exact remaining balance in Chat settings only when included use is exhausted and credits are available. Label server API-key billing as a separate mechanism and never infer or estimate a credit balance.',
      summary:
        'Visible ChatGPT credits test package: confirms when Codex has moved beyond included usage and shows the live remaining credit balance without conflating it with API billing.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the active paid-usage state and remaining ChatGPT credit balance clear before the owner continues a Codex conversation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPurposeAwareCodexBranchingPackage: AgentPackage = {
      ...localVisibleChatGptCreditsPackage,
      id: localPurposeAwareCodexBranchingPackageId,
      version: 29.2,
      status: 'test_ready',
      basePackageId: localVisibleChatGptCreditsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.2',
      contractAddendum:
        'Codex branches distinguish deliberate exploration from recovery after a broken source conversation. Recovery keeps the source history privately stored but removes that unusable chat from the conversation chooser; an intentional branch leaves both the source and branch visible.',
      instructionsAddendum:
        'Label the failed-turn Continue in a new chat action as recovery and every message-level Branch action as intentional. Persist only recovery source thread IDs in the private runtime, filter them from conversation selection after the fork succeeds and across restart, and never delete their native thread or evidence. Preserve existing exact-turn, workspace-scope, and branch-failure guarantees.',
      summary:
        'Purpose-aware Codex branching test package: hides broken recovery sources while preserving source chats for intentional branches.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the conversation chooser clear after broken-chat recovery without hiding the reference chat for a branch the reviewer created on purpose.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localContextAwareChatTitlesAndStatesPackage: AgentPackage = {
      ...localPurposeAwareCodexBranchingPackage,
      id: localContextAwareChatTitlesAndStatesPackageId,
      version: 29.3,
      status: 'test_ready',
      basePackageId: localPurposeAwareCodexBranchingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.3',
      contractAddendum:
        'Every Codex conversation chooser title is a concise summary of its newest task, including referential follow-ups resolved from the preceding request. The chooser permanently distinguishes active running work from completed work; unread completion is an additional notification and does not replace the completed state.',
      instructionsAddendum:
        'Keep conversation titles at 48 characters or fewer, strip captured-page instructions, and resolve short requests such as implement it against the preceding saved user prompt. Label active work Running with a spinner and completed work Completed with a distinct success icon and treatment. Preserve Completed after the chat is viewed, while clearing only its unread notification.',
      summary:
        'Context-aware chat titles and states test package: concise latest-task names with durable Running and Completed dropdown states.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes every chat identifiable at a glance and keeps its running or completed lifecycle visible after notifications are read.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRetrospectiveChatContextPackage: AgentPackage = {
      ...localContextAwareChatTitlesAndStatesPackage,
      id: localRetrospectiveChatContextPackageId,
      version: 29.4,
      status: 'test_ready',
      basePackageId: localContextAwareChatTitlesAndStatesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.4',
      contractAddendum:
        'Existing Codex conversations recover a bounded recent user-prompt history from their native transcript, so vague latest messages do not become vague chooser titles. Recovered prompts are cleaned server-side before entering the private status response and cached by conversation revision.',
      instructionsAddendum:
        'For every visible conversation without sufficient saved Studio prompt records, read only its bounded recent turn summaries and retain up to eight cleaned user prompts. Strip captured-page and progress instructions before serialization. Resolve vague chains such as do it, is that appropriate, or do previous chats do it against the newest substantive task; cache results and preserve the native completion status.',
      summary:
        'Retrospective chat context test package: repairs vague titles across existing chats from cleaned, bounded native prompt history.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes older conversations identifiable without requiring a new message or exposing Studio runtime instructions.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localValidatedCodexBranchActionsPackage: AgentPackage = {
      ...localRetrospectiveChatContextPackage,
      id: localValidatedCodexBranchActionsPackageId,
      version: 29.5,
      status: 'test_ready',
      basePackageId: localRetrospectiveChatContextPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.5',
      contractAddendum:
        'The dedicated Codex branch endpoint accepts only intentional branch and repair actions. Unknown actions fail before any conversation lookup or Codex work begins.',
      instructionsAddendum:
        'Validate the dedicated branch endpoint action against branch-thread and repair-thread before calling the Codex bridge. Return a clear private validation error for every unknown action, while preserving the selected workspace and branch purpose for valid requests.',
      summary:
        'Validated Codex branch actions test package: rejects unknown dedicated branch actions before Codex work begins.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps branch and repair requests deterministic and prevents malformed Studio requests from being interpreted as intentional branches.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExpandedChatDropdownTitlesPackage: AgentPackage = {
      ...localValidatedCodexBranchActionsPackage,
      id: localExpandedChatDropdownTitlesPackageId,
      version: 29.6,
      status: 'test_ready',
      basePackageId: localValidatedCodexBranchActionsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.6',
      contractAddendum:
        'Codex conversation names have separate compact and expanded presentations. The selected conversation control remains concise, while every open chooser row renders the complete contextual task summary without character truncation, ellipsis, or a line clamp.',
      instructionsAddendum:
        'Keep the closed conversation selector at its existing compact 48-character title contract. In the open conversation chooser, generate the full cleaned contextual summary, preserve explanatory task clauses, wrap the complete title to as many lines as required, and never substitute an ellipsis. Maintain status metadata, touch targets, menu scrolling, and zero horizontal overflow at every required viewport.',
      summary:
        'Expanded chat dropdown titles test package: shows each complete contextual task in the open chooser while keeping the selected chat compact.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Provides enough context to identify similar chats in the chooser without making the closed chat control oversized.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRecoverableQuoteExpiryPackage: AgentPackage = {
      ...localExpandedChatDropdownTitlesPackage,
      id: localRecoverableQuoteExpiryPackageId,
      version: 29.7,
      status: 'test_ready',
      basePackageId: localExpandedChatDropdownTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.7',
      contractAddendum:
        'An expired approved quote remains visible as a distinct recoverable commercial state. When its exact website revision, scope and terms are unchanged, Studio can issue a fresh bounded approval without contacting the client or weakening Clientspace payment and release safeguards.',
      instructionsAddendum:
        'Separate quote term matching from time validity. Show the exact expiry date, explain that an unsent invitation remains blocked, and offer Reconfirm unchanged quote only when source, scope and commercial terms still match. Reconfirmation creates a new reference and validity window. Rehearsal billing and live launch remain blocked.',
      summary:
        'Recoverable quote expiry test package: explains expired approvals and safely reconfirms unchanged quotes without client contact.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Turns an ambiguous approved-but-blocked quote into an explicit expiry state with a safe, exact-scope recovery action.',
      stagedBehaviourIds: ['commercial-offer-strategy'],
    };
    const localInterpretedChatDropdownTitlesPackage: AgentPackage = {
      ...localRecoverableQuoteExpiryPackage,
      id: localInterpretedChatDropdownTitlesPackageId,
      version: 29.8,
      status: 'test_ready',
      basePackageId: localRecoverableQuoteExpiryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.8',
      contractAddendum:
        'Open Codex conversation chooser titles are concise semantic interpretations of the current task, never copies of complete user prompts or Codespace resume instructions. They may use more room than the selected-chat label only when that context is necessary to distinguish the work.',
      instructionsAddendum:
        'Summarize the task rather than rendering the full cleaned prompt. Keep dropdown interpretations to 96 characters or fewer without adding ellipsis, preserve the task subject and distinguishing outcome, and resolve Codespace paused or continue-the-same-request messages against the newest substantive prompt in bounded history. Keep the closed selector on its compact 48-character contract.',
      summary:
        'Interpreted chat dropdown titles test package: replaces copied prompts and resume instructions with concise current-task summaries.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the conversation list scannable while retaining enough task meaning to distinguish similar chats.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPolishedDevicePreviewToolbarPackage: AgentPackage = {
      ...localInterpretedChatDropdownTitlesPackage,
      id: localPolishedDevicePreviewToolbarPackageId,
      version: 29.9,
      status: 'test_ready',
      basePackageId: localInterpretedChatDropdownTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v29.9',
      contractAddendum:
        'The private Inspect device viewer uses an explicit responsive toolbar layout. Product identity, website identity, preview tools, and device selection never overlap or leave the viewport, including with long website names at compact mobile, mobile, tablet, and desktop widths.',
      instructionsAddendum:
        'Use a compact three-row toolbar through tablet width and a single ordered row on desktop. Keep Rotate and Reload available as 44px touch targets, present Phone, Tablet, and Desktop as one segmented control, truncate only the secondary website identity when required, and preserve full keyboard, focus, loading, and reduced-motion behaviour.',
      summary:
        'Polished device preview toolbar test package: gives Inspect a compact, non-overlapping header with clear preview and device controls.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes desktop previews usable from a phone without the Inspect product label, website title, or controls colliding.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localPinnedTaggedCodexChatsPackage: AgentPackage = {
      ...localPolishedDevicePreviewToolbarPackage,
      id: localPinnedTaggedCodexChatsPackageId,
      version: 30.0,
      status: 'test_ready',
      basePackageId: localPolishedDevicePreviewToolbarPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.0',
      contractAddendum:
        'Studio Codex conversations have private durable organization metadata. A reviewer can pin any chat above unpinned chats in its existing workspace section and assign up to eight visible tag names without changing the Codex transcript or workspace boundary.',
      instructionsAddendum:
        'Persist pin and tag metadata in the protected Studio runtime, validate the exact conversation scope before saving it, and return organization data with conversation status. Sort pinned chats first within each existing client or Universal Studio section while preserving relative order, show tags without horizontal overflow, and provide a keyboard-accessible editor with clear limits and errors.',
      summary:
        'Pinned and tagged Codex chats test package: keeps important conversations first and adds durable multi-tag organization.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes long-running Studio chat history easier to scan and organize without renaming or altering conversation content.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localFeatureReleaseManagementPackage: AgentPackage = {
      ...localPinnedTaggedCodexChatsPackage,
      id: localFeatureReleaseManagementPackageId,
      version: 30.1,
      status: 'test_ready',
      basePackageId: localPinnedTaggedCodexChatsPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.1',
      contractAddendum:
        'Studio maintains a protected Feature Releases registry for material changes completed by Codex. Each feature preserves exact conversation and turn lineage, affected software and files, immutable source commits, and separately verified development and production deployment evidence.',
      instructionsAddendum:
        'Create or update a feature only after a completed Codex turn records observable file changes. Keep one feature linked across its source chat and explicit follow-up branches. Group release targets by Made Solid Studio and Made Solid website or Clientspace, never infer deployment from Git, and enable deployment only for clean repositories at the exact recorded commits. Require explicit confirmation for production, persist deployment lifecycle and failure detail, deploy cross-product receivers before Studio, and open historical source output without silently branching it.',
      summary:
        'Feature Releases test package: traces Codex-built changes from their exact chat output through committed source and verified development or production releases.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds an owner-only release control plane inside Codex with automatic feature capture, software grouping, source-chat continuation, exact-commit gates, and truthful environment status.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localManualCodexUpdateRecoveryPackage: AgentPackage = {
      ...localFeatureReleaseManagementPackage,
      id: localManualCodexUpdateRecoveryPackageId,
      version: 30.2,
      status: 'test_ready',
      basePackageId: localFeatureReleaseManagementPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.2',
      contractAddendum:
        'Codex runtime recovery is directly available from Chat settings and from a dedicated route. A failed or rolled-back activation can be retried explicitly, exposes truthful loading and error states, and a dismissed lifecycle notice stays dismissed until the runtime enters a different lifecycle state.',
      instructionsAddendum:
        'Link Chat settings to the route-persistent Codex updates page. Send manual recovery through a protected retry action that clears only failed staging metadata before rerunning the verified update flow. Keep chat usable during recovery, disable duplicate retries, announce state changes, and persist dismissal against the exact runtime lifecycle key.',
      summary:
        'Manual Codex update recovery test package: adds a dedicated update page, in-notice retry, verified retry lifecycle, and durable notice dismissal.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the owner recover a stopped runtime update without waiting for the next automatic cycle or repeatedly dismissing the same error.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCompactCodexChatChromePackage: AgentPackage = {
      ...localManualCodexUpdateRecoveryPackage,
      id: localCompactCodexChatChromePackageId,
      version: 30.3,
      status: 'test_ready',
      basePackageId: localManualCodexUpdateRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.3',
      contractAddendum:
        "The Studio Codex chat keeps workspace scope in its compact header and gives the conversation picker and new-chat action one intrinsic control row. Neither control may absorb the transcript's flexible height at any supported viewport.",
      instructionsAddendum:
        'Render Universal Studio or client-only scope as a concise labelled header chip with its fuller explanation available as accessible context. Keep the conversation selector and 44px new-chat touch target aligned in a content-sized row, reserve remaining height for the transcript, and verify the open chat without overflow at mobile, tablet, and desktop widths.',
      summary:
        'Compact Codex chat chrome test package: moves workspace scope into the header and prevents the new-chat row from stretching into transcript space.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Restores usable transcript space in the Studio chat while retaining clear scope, keyboard access, and a full-size touch target for starting a conversation.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAiInterpretedChatTitlesPackage: AgentPackage = {
      ...localCompactCodexChatChromePackage,
      id: localAiInterpretedChatTitlesPackageId,
      version: 30.4,
      status: 'test_ready',
      basePackageId: localCompactCodexChatChromePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.4',
      contractAddendum:
        'Codex interprets each conversation’s newest task from bounded recent context and persists separate compact and expanded semantic titles. Prompt-copying heuristics remain only as a temporary unavailable-state fallback and are not the saved title source.',
      instructionsAddendum:
        'Generate stale conversation titles with one private read-only Codex request, treating conversation content as untrusted data. Save a 3-7 word compact title and a 6-14 word dropdown title against the exact current-task signature. Regenerate after that signature changes, resolve vague follow-ups from recent context, and never expose the private title-generation exchange as a user chat.',
      summary:
        'AI-interpreted chat titles test package: replaces prompt-copying title rules with cached semantic titles generated from the current task and recent context.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes current and previous chats identifiable by their actual task while keeping the selected-chat label compact and the open dropdown more descriptive.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localManagedFeatureWordingPackage: AgentPackage = {
      ...localAiInterpretedChatTitlesPackage,
      id: localManagedFeatureWordingPackageId,
      version: 30.5,
      status: 'test_ready',
      basePackageId: localAiInterpretedChatTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.5',
      contractAddendum:
        'Feature Releases uses semantic owner-facing names and concise product descriptions instead of implementation prompts or raw Codex completion text. Generated wording remains editable, regenerable and mergeable without losing exact source-chat lineage or overstating deployment evidence.',
      instructionsAddendum:
        'Derive new feature wording from the interpreted conversation task, completed behaviour and changed components. Keep titles as short product capabilities and descriptions as one plain-language outcome sentence. Preserve manual wording across refreshes, provide explicit improve and edit actions, merge related records only after confirmation, retain every implementation turn, and reset environment verification whenever merged source revisions differ.',
      summary:
        'Managed Feature Releases wording test package: replaces vague implementation-command cards with semantic editable descriptions and safe feature merging.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the release overview understandable as a product ledger while preserving auditable chat, source and deployment history.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localVisibleFeatureReleaseStatusPackage: AgentPackage = {
      ...localManagedFeatureWordingPackage,
      id: localVisibleFeatureReleaseStatusPackageId,
      version: 30.6,
      status: 'test_ready',
      basePackageId: localManagedFeatureWordingPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.6',
      contractAddendum:
        'Every Feature Releases overview card exposes source readiness, development deployment and production deployment as separate truthful states without requiring the reviewer to open its detail view.',
      instructionsAddendum:
        'Summarize source, development and production independently on each feature card. For multi-product features show verified target counts when deployment is partial, distinguish queued and failed states, and never infer deployment from a commit or from another environment. Keep exact revisions, URLs, files and actions in the detail view.',
      summary:
        'Visible Feature Releases status test package: shows commit, development and production state directly on every overview card.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets the owner scan what is local, deployed to development or live in production without opening every feature.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localDurableAiChatTitlesPackage: AgentPackage = {
      ...localVisibleFeatureReleaseStatusPackage,
      id: localDurableAiChatTitlesPackageId,
      version: 30.7,
      status: 'test_ready',
      basePackageId: localVisibleFeatureReleaseStatusPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.7',
      contractAddendum:
        'AI-interpreted chat titles persist in a dedicated runtime record that legacy Studio processes cannot overwrite. Title generation runs as private background work after status responses, so the authenticated development gateway never waits on the model turn.',
      instructionsAddendum:
        'Store interpreted conversation titles separately from shared legacy conversation state. Schedule at most one bounded AI-title batch after returning each normal chat status response, persist valid results atomically, and let later status polls continue the backfill and reveal completed titles. Never make the browser hold open a long title-generation request.',
      summary:
        'Durable AI chat titles test package: prevents legacy state overwrites and moves title interpretation behind non-blocking status polling.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes AI-interpreted titles survive runtime restarts and appear reliably through the real development gateway.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localProductReleaseOverviewPackage: AgentPackage = {
      ...localDurableAiChatTitlesPackage,
      id: localProductReleaseOverviewPackageId,
      version: 30.8,
      status: 'test_ready',
      basePackageId: localDurableAiChatTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.8',
      contractAddendum:
        'Feature Releases provides one owner-facing release overview with separate Made Solid Studio, public website, Clientspace and Clientspace admin surfaces. Each surface compares development with production, counts pending product features and lists the recorded revisions that determine its status. Internal research and documentation remain visible without inflating product release counts.',
      instructionsAddendum:
        'Classify changed paths into product surfaces while preserving their owning repository and exact source lineage. Treat a verified deployment as current only when it still matches the recorded committed revision; when newer local or committed work exists, label the deployment as an earlier live revision. Keep each product summary expandable, keyboard accessible and usable in the compact Codex panel from phone through desktop.',
      summary:
        'Product release overview test package: shows what is current or pending across Studio, website, Clientspace and Clientspace admin.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Turns the feature ledger into a clear cross-product release dashboard without losing revision-level evidence.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localLeceEmailAndQuoteRecoveryPackage: AgentPackage = {
      ...localProductReleaseOverviewPackage,
      id: localLeceEmailAndQuoteRecoveryPackageId,
      version: 30.9,
      status: 'test_ready',
      basePackageId: localProductReleaseOverviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v30.9',
      contractAddendum:
        'Clientspace Admin keeps AI-assisted incoming email replies inside the current Messages workspace, automatically prepares review-only drafts for matched client email, and requires explicit human editing, approval and confirmation before production delivery. Expired LECE rehearsal quotes expose direct recovery actions in both Clientspace and Studio without contacting the client or enabling live billing.',
      instructionsAddendum:
        'Preserve all current Clientspace communication, payment, balance, release and rehearsal capabilities while restoring the inbound email approval desk. Match only the selected project client email, keep generated drafts private and unsent, invalidate approval after edits, and disable delivery in development. When a rehearsal quote expires, link Clientspace directly to the exact Studio rehearsal and place a prominent Studio action that focuses the unchanged-quote reconfirmation control.',
      summary:
        'LECE email and quote recovery test package: restores AI-assisted reply review and makes expired test quotes directly recoverable.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Restores the protected inbound-email workflow and removes the dead end from expired LECE rehearsal quotes.',
      stagedBehaviourIds: ['inbound-client-email-review', 'commercial-offer-strategy'],
    };
    const localReliableFeatureLedgerPackage: AgentPackage = {
      ...localLeceEmailAndQuoteRecoveryPackage,
      id: localReliableFeatureLedgerPackageId,
      version: 31.0,
      status: 'test_ready',
      basePackageId: localLeceEmailAndQuoteRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.0',
      contractAddendum:
        'Feature Releases durably records every inspected completed Codex turn, reconciles the newest missing turns first in bounded batches, and never replays completed no-change conversations after a runtime restart. Generated feature wording uses a recognisable capability name and a multi-sentence owner-facing explanation, while manual wording remains immutable until the owner edits it again.',
      instructionsAddendum:
        'Persist processed thread-and-turn keys with the private feature ledger, seed them from existing implementation history and cap retained reconciliation history. Reconcile a bounded newest-first batch and serialize overlapping maintenance passes. Treat Studio source as live in the editable development workspace, but require recorded deployment verification for the separate website and Clientspace development runtime. Never infer production deployment from workspace availability.',
      summary:
        'Reliable feature ledger test package: keeps newly completed features current, improves their explanations and distinguishes the live Studio workspace from deployed environments.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the Features tab a dependable owner record instead of a restart-sensitive best-effort list.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localChatFeatureHistoryPackage: AgentPackage = {
      ...localReliableFeatureLedgerPackage,
      id: localChatFeatureHistoryPackageId,
      version: 31.1,
      status: 'test_ready',
      basePackageId: localReliableFeatureLedgerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.1',
      contractAddendum:
        'A Codex conversation linked to feature work uses the newest linked Feature Releases title as its owner-facing chat name. The conversation chooser exposes an expandable, scrollable feature history for every chat, and the selected chat shows the same history above its transcript with exact feature markers at completed turns.',
      instructionsAddendum:
        'Expose linked thread identifiers from the private feature ledger without changing persisted feature lineage. Resolve chat names and histories from that same feature record, falling back to the interpreted conversation title only before a feature exists. Selecting a feature must open its source chat, scroll to the exact saved turn, focus its labelled marker and report clearly when that turn is outside bounded history.',
      summary:
        'Chat feature history test package: names chats after their latest feature and navigates from feature history to exact transcript turns.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes feature-led work easy to recognise and revisit without searching through long chat transcripts.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localMultiFeatureChatLineagePackage: AgentPackage = {
      ...localChatFeatureHistoryPackage,
      id: localMultiFeatureChatLineagePackageId,
      version: 31.2,
      status: 'test_ready',
      basePackageId: localChatFeatureHistoryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.2',
      contractAddendum:
        'One Codex conversation may own multiple distinct Feature Releases records. When completed work clearly introduces a new capability, the ledger creates a new feature entry, preserves the earlier feature and makes the newest feature the chat name instead of appending every later turn to the first feature.',
      instructionsAddendum:
        'Detect explicit semantic feature boundaries before resolving the active thread feature. Preserve each implementation under exactly one feature, update the thread pointer to the newest feature and keep earlier same-thread features discoverable through implementation lineage. Migrate the completed chat-feature-history turn out of the older product-release-overview record without discarding either turn.',
      summary:
        'Multi-feature chat lineage test package: keeps distinct features separate inside one chat and names the chat after the newest feature.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a long-running chat from being permanently named after its first feature.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localActionableReleasePipelinePackage: AgentPackage = {
      ...localMultiFeatureChatLineagePackage,
      id: localActionableReleasePipelinePackageId,
      version: 31.3,
      status: 'test_ready',
      basePackageId: localMultiFeatureChatLineagePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.3',
      contractAddendum:
        'Feature Releases presents Workspace, Development and Production as distinct release stages. Local files are never described as queued deployment work, identical feature titles count once while duplicate records remain visible for reconciliation, and each state exposes one safe next action.',
      instructionsAddendum:
        'Classify uncommitted or unresolved targets as workspace review, prevent them from appearing ready in either environment, and explain the blocker beside the action. Prepare release with Codex must open a linked follow-up with a review-only draft that scopes files, reconciles stale records, runs checks and forbids production deployment. Development deployment still requires an exact clean commit; production still requires verified development and explicit confirmation.',
      summary:
        'Actionable release pipeline test package: replaces ambiguous pending labels with precise stages, blockers and safe next actions.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes release status understandable and actionable without overstating local files as deployed or queued.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAutomaticFeatureDevelopmentReleasePackage: AgentPackage = {
      ...localActionableReleasePipelinePackage,
      id: localAutomaticFeatureDevelopmentReleasePackageId,
      version: 31.4,
      status: 'test_ready',
      basePackageId: localActionableReleasePipelinePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.4',
      contractAddendum:
        'A newly completed feature with an exact committed revision automatically queues, deploys and verifies its development release. Local, unresolved or mixed workspace changes remain blocked for review, and production promotion remains a separate explicitly confirmed action.',
      instructionsAddendum:
        'Invoke automatic development release only from the durable completed-feature record and only when its refreshed status is ready_development. Reuse the protected exact-revision deployment contract, persist queued and terminal states, record verification failure without promotion, and never infer that local changes are deployed. Advertise and verify automatic-feature-development-release-v1 in the private runtime health contract.',
      summary:
        'Automatic feature development release test package: safely deploys exact committed features to development immediately after completion.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the owner expectation true for safe revisions while keeping mixed local work and every production release under review.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localUninterruptedStudioChatPackage: AgentPackage = {
      ...localAutomaticFeatureDevelopmentReleasePackage,
      id: localUninterruptedStudioChatPackageId,
      version: 31.5,
      status: 'test_ready',
      basePackageId: localAutomaticFeatureDevelopmentReleasePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.5',
      contractAddendum:
        'Studio chat and workspace refreshes remain non-blocking: a new chat accepts a focused draft while its durable thread is created, live transcript updates never blur that draft, and a cached app resume uses compact top status instead of the full-screen loading presentation.',
      instructionsAddendum:
        'Keep new-chat creation honest and compact without fabricated transcript rows. Preserve focused draft input across streamed transcript updates. Use the synchronous cache hint only to choose presentation; IndexedDB and the repository remain the saved-data sources of truth and hydrate the mounted route dynamically.',
      summary:
        'Uninterrupted Studio chat test package: keeps new-chat drafting, live typing and cached mobile resume usable during background work.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes blocking chat and resume states without weakening durable conversation or workspace hydration.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localAccurateFeatureTitlesPackage: AgentPackage = {
      ...localUninterruptedStudioChatPackage,
      id: localAccurateFeatureTitlesPackageId,
      version: 31.6,
      status: 'test_ready',
      basePackageId: localUninterruptedStudioChatPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.6',
      contractAddendum:
        'Feature Releases and chat names use current-task feature metadata rather than a previously cached conversation label. Generated feature titles use polished product capitalization, distinct requests in one chat retain separate history entries, and a prompt containing several related outcomes receives one accurate encompassing title and description.',
      instructionsAddendum:
        'Generate dedicated feature title and summary fields alongside conversation labels, bind them to the exact current-task signature, and never reuse stale metadata for a later completed turn. Re-evaluate older generated records from their own implementation evidence, preserve manual wording, and keep chat names sourced from the newest linked feature.',
      summary:
        'Accurate feature and chat titles test package: fixes stale repeated names, standardizes capitalization and covers multi-outcome prompts clearly.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes feature history and chat names accurate enough to identify completed work without reopening the transcript.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localClientspaceQuoteReconfirmationPackage: AgentPackage = {
      ...localAccurateFeatureTitlesPackage,
      id: localClientspaceQuoteReconfirmationPackageId,
      version: 31.7,
      status: 'test_ready',
      basePackageId: localAccurateFeatureTitlesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.7',
      contractAddendum:
        'An expired Clientspace rehearsal quote can be reconfirmed from the exact preflight warning that blocks its invitation. Clientspace requests a new 14-day approval from Studio, verifies that every commercial and source term is unchanged, updates both saved records, and leaves client contact, charging and launch as separate blocked actions.',
      instructionsAddendum:
        'Keep quote recovery inside the selected Clientspace project. Authenticate the cross-product request, require an expired unsent rehearsal quote, preserve exact source and commercial terms, issue only a new reference and bounded validity window, and show loading, success and safe retry errors beside the preflight action.',
      summary:
        'Clientspace quote reconfirmation test package: renews unchanged expired rehearsal quotes directly from preflight without leaving the project.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the Studio detour while preserving the rehearsal payment, invitation and launch safety boundaries.',
      stagedBehaviourIds: ['commercial-offer-strategy'],
    };
    const localClientspaceDevelopmentQuoteReconfirmationPackage: AgentPackage = {
      ...localClientspaceQuoteReconfirmationPackage,
      id: localClientspaceDevelopmentQuoteReconfirmationPackageId,
      version: 31.8,
      status: 'test_ready',
      basePackageId: localClientspaceQuoteReconfirmationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.8',
      contractAddendum:
        'The protected development Clientspace keeps expired rehearsal-quote recovery inside Clientspace Admin. Its authenticated rehearsal-only route forwards to the production receiver while production credentials remain isolated, and the preflight action never redirects to Studio.',
      instructionsAddendum:
        'Permit the quote-reconfirmation mutation only for a saved test rehearsal after owner authentication. Proxy the exact Clientspace Admin request to the protected production receiver, retain the current project and section, and render loading, success or retry guidance in the same preflight surface.',
      summary:
        'Clientspace development quote reconfirmation test package: removes the remaining Studio redirect and completes the action inside protected Clientspace Admin.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the development rehearsal behave like the intended Clientspace workflow without copying privileged credentials into Preview.',
      stagedBehaviourIds: ['commercial-offer-strategy'],
    };
    const localAutomaticClientspaceHomepageCapturePackage: AgentPackage = {
      ...localClientspaceDevelopmentQuoteReconfirmationPackage,
      id: localAutomaticClientspaceHomepageCapturePackageId,
      version: 31.9,
      status: 'test_ready',
      basePackageId: localClientspaceDevelopmentQuoteReconfirmationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v31.9',
      contractAddendum:
        'Creating a verified Clientspace rehearsal immediately queues a durable homepage capture. The protected Studio browser waits for fonts, visible media and stable geometry, then Clientspace persists the finished email image against the exact project and preview URL before the Email tab is opened.',
      instructionsAddendum:
        'Start the homepage capture after rehearsal provisioning without sending the invitation. Persist queued, running, ready and failed lifecycle states, accept output only from the verified Made Solid preview, and let the first-introduction email reuse the ready image with its existing manual fallback.',
      summary:
        'Automatic Clientspace homepage capture test package: prepares and saves the first-email website screenshot as soon as the rehearsal is created.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the Email-tab capture delay while preserving exact-preview verification and explicit email sending.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localAnimatedClientspaceHomepagePreviewPackage: AgentPackage = {
      ...localAutomaticClientspaceHomepageCapturePackage,
      id: localAnimatedClientspaceHomepagePreviewPackageId,
      version: 32,
      status: 'test_ready',
      basePackageId: localAutomaticClientspaceHomepageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.0',
      contractAddendum:
        'The prepared first-email homepage image is an email-safe scrolling GIF when the verified page can be animated below the strict payload limit. Its first frame is a complete static hero, it pans down and returns to the top in a restrained loop, and JPEG remains the automatic fallback.',
      instructionsAddendum:
        'Generate the animation from one settled immutable homepage capture rather than recording runtime motion. Cap the binary below 1.9 MB, preserve the verified preview URL and private storage lifecycle, embed it as an inline GIF, and fall back to the existing JPEG whenever the page is too short, encoding fails or the result exceeds the limit.',
      summary:
        'Animated Clientspace homepage preview test package: turns the prepared first-email image into a compact scrolling loop with a safe static fallback.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Shows the prospect more of the finished homepage without delaying the Email tab, sending automatically or making the message image-only.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localPersistedAnimatedHomepagePreviewPackage: AgentPackage = {
      ...localAnimatedClientspaceHomepagePreviewPackage,
      id: localPersistedAnimatedHomepagePreviewPackageId,
      version: 32.1,
      status: 'test_ready',
      basePackageId: localAnimatedClientspaceHomepagePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.1',
      contractAddendum:
        'The private Clientspace review-capture bucket explicitly accepts the bounded scrolling GIF alongside its existing JPEG and PNG evidence. The capture worker verifies that storage contract before persisting an animated first-email homepage preview.',
      instructionsAddendum:
        'Keep the review-capture bucket private and capped at 6 MB, allow image/gif without removing image/jpeg or image/png, and fail safely before email preparation if the protected storage contract cannot be updated or the animation cannot be persisted.',
      summary:
        'Persisted animated homepage preview test package: saves the verified scrolling GIF in Clientspace private storage for rehearsal email review.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Completes the animated preview workflow by aligning private storage with the already verified capture and email contracts.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localSmoothHomepagePreviewLoopPackage: AgentPackage = {
      ...localPersistedAnimatedHomepagePreviewPackage,
      id: localSmoothHomepagePreviewLoopPackageId,
      version: 32.2,
      status: 'test_ready',
      basePackageId: localPersistedAnimatedHomepagePreviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.2',
      contractAddendum:
        'The first-email homepage GIF begins with the real captured loading screen, softly reveals the settled homepage, scrolls downward once at a slow memory-bounded frame rate, holds the exact bottom, and fades back to its opening frame instead of reversing upward.',
      instructionsAddendum:
        'Capture the loading viewport immediately after DOM readiness and capture the complete homepage only after fonts, visible media and geometry settle. Build one phase-ordered loop of loading hold, loaded reveal, linear downward scroll, bottom hold and reset fade. Preserve the 1.9 MB email limit, cap raw animation frames at 64 MB, and adapt delay or dimensions instead of omitting the bottom frame.',
      summary:
        'Smooth homepage preview loop test package: shows the real loading screen, scrolls slowly to the page bottom, and fades back smoothly within bounded memory.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the prepared email preview smooth and legible while preserving the authentic loading experience, exact page ending and bounded private capture workflow.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localReliableSmoothHomepageCapturePackage: AgentPackage = {
      ...localSmoothHomepagePreviewLoopPackage,
      id: localReliableSmoothHomepageCapturePackageId,
      version: 32.3,
      status: 'test_ready',
      basePackageId: localSmoothHomepagePreviewLoopPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.3',
      contractAddendum:
        'The smooth first-email homepage GIF must finish inside the protected Clientspace capture lifecycle. The capture worker starts with an email-sized high-frame-rate profile, uses bounded page-settling waits and the fastest GIF encoding effort, while retaining the loading reveal, slow one-way scroll, exact-bottom hold and fade reset.',
      instructionsAddendum:
        'Keep raw frames capped at 64 MB and the finished email GIF below 1.9 MB. Begin with the 420-pixel 24-colour profile instead of repeatedly encoding larger files that cannot fit the email budget, bound network-idle and visible-media waits, use the fastest CPU-effort palette pass, and allow the protected receiver up to 120 seconds so it can persist the finished animation instead of leaving the earlier capture in place.',
      summary:
        'Reliable smooth homepage capture test package: finishes and persists the new loading-to-bottom fade loop within the protected capture window.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a receiver timeout from silently leaving the old laggy GIF visible after the smooth animation runtime has been deployed.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localLiveAnimatedHomepageCapturePackage: AgentPackage = {
      ...localReliableSmoothHomepageCapturePackage,
      id: localLiveAnimatedHomepageCapturePackageId,
      version: 32.4,
      status: 'test_ready',
      basePackageId: localReliableSmoothHomepageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.4',
      contractAddendum:
        'The first-email homepage GIF records the real loading introduction and live scroll-triggered website motion instead of animating crops from a frozen full-page screenshot. A media warm-up pass loads lazy company logos and other imagery before the clean loading sequence is replayed.',
      instructionsAddendum:
        'Capture the verified homepage with normal motion at 100 millisecond intervals. Warm lazy media by traversing the page, reload to replay the authentic brand introduction, eagerly settle image assets, then record a linear downward browser scroll so viewport animations appear. Keep compressed source frames and the raw encoded stack bounded, preserve the exact-bottom hold and fade reset, and keep the finished GIF below 1.9 MB.',
      summary:
        'Live animated homepage capture test package: records the loading animation, scroll-triggered motion and fully loaded company imagery in the saved email GIF.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the email preview faithful to the real website experience without dropping lazy assets or exceeding the protected capture budget.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localHeroAnimatedHomepageCapturePackage: AgentPackage = {
      ...localLiveAnimatedHomepageCapturePackage,
      id: localHeroAnimatedHomepageCapturePackageId,
      version: 32.5,
      status: 'test_ready',
      basePackageId: localLiveAnimatedHomepageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.5',
      contractAddendum:
        'The first-email homepage GIF records the complete live hero entrance immediately after the loading introduction hands off, before image and layout settling can consume the short animation off-camera.',
      instructionsAddendum:
        'After the branded loading overlay becomes hidden, immediately record 1.2 seconds of the real hero entrance at 80 millisecond intervals. Only then settle eager media and geometry before continuing the live downward scroll. Preserve the loading animation, lazy-asset warm-up, exact-bottom hold, fade reset, 64 MB raw-frame cap and 1.9 MB email limit.',
      summary:
        'Hero-animated homepage capture test package: preserves the complete hero entrance between the loading sequence and smooth live-page scroll.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the hero heading, supporting copy and media visibly animating in the saved GIF instead of allowing their entrance to finish during capture settling.',
      stagedBehaviourIds: ['client-url-release-contract', 'hero-handoff'],
    };
    const localRehearsalIntroductionResetPackage: AgentPackage = {
      ...localHeroAnimatedHomepageCapturePackage,
      id: localRehearsalIntroductionResetPackageId,
      version: 32.6,
      status: 'test_ready',
      basePackageId: localHeroAnimatedHomepageCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.6',
      contractAddendum:
        'After a first-introduction email is accepted, Clientspace Admin shows a persistent sent receipt and waiting state instead of leaving an active duplicate-send control. A rehearsal-only reset preserves send history, advances the Clientspace welcome version and returns only the test invitation to pending.',
      instructionsAddendum:
        'Keep accepted outreach records immutable. Show recipient, subject and sent time, state that no follow-up sends automatically, and allow a deliberate follow-up draft. Expose Reset test introduction only when the selected project is a verified rehearsal. The protected reset must clear the rehearsal invitation timestamp, restore pending invitation status, increment the welcome version and never affect a production client.',
      summary:
        'Rehearsal introduction reset test package: adds a truthful post-send UI and safely replays the test client welcome before another introduction email.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes repeated end-to-end introduction testing possible without weakening production outreach safeguards or deleting the audit trail.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localReconciledIntroductionReceiptPackage: AgentPackage = {
      ...localRehearsalIntroductionResetPackage,
      id: localReconciledIntroductionReceiptPackageId,
      version: 32.7,
      status: 'test_ready',
      basePackageId: localRehearsalIntroductionResetPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.7',
      contractAddendum:
        'Clientspace Admin reconciles the project invitation timestamp with the linked Studio handoff invitation timestamp before rendering first-introduction state, so a retained delivery record cannot be hidden by a stale pending project status.',
      instructionsAddendum:
        'Treat either persisted invitation timestamp as delivery evidence. Preserve accepted status where present; otherwise normalize a timestamp-backed invitation to sent. A rehearsal reset must continue clearing both timestamps before the send controls return.',
      summary:
        'Reconciled introduction receipt test package: restores the sent receipt and rehearsal reset when historical invitation status drifted from its durable delivery timestamp.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the post-send UI truthful for existing rehearsals without sending again, deleting history or weakening the explicit reset boundary.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localPrioritisedIntroductionStatusPackage: AgentPackage = {
      ...localReconciledIntroductionReceiptPackage,
      id: localPrioritisedIntroductionStatusPackageId,
      version: 32.8,
      status: 'test_ready',
      basePackageId: localReconciledIntroductionReceiptPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.8',
      contractAddendum:
        'After a first introduction is accepted, Clientspace Admin places the durable sent receipt immediately below the message templates and before the email editor and long website preview. The normal follow-up is the primary action; the protected rehearsal reset remains a quieter testing control with its explanation attached.',
      instructionsAddendum:
        'Keep the sent time, recipient, subject and waiting-state explanation visible near the top of the email workspace. Do not make the reviewer scroll through the composed email, live website or homepage capture to discover the delivery result. Emphasize Prepare follow-up, visually subordinate Reset test introduction, and never expose rehearsal language for production projects.',
      summary:
        'Prioritised introduction status test package: moves the sent receipt and test controls above the long email preview and clarifies the next-action hierarchy.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the completed outreach state immediately discoverable while keeping routine follow-up distinct from destructive-looking test reset controls.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localDirectReplyComparisonIntroductionPackage: AgentPackage = {
      ...localPrioritisedIntroductionStatusPackage,
      id: localDirectReplyComparisonIntroductionPackageId,
      version: 32.9,
      status: 'test_ready',
      basePackageId: localPrioritisedIntroductionStatusPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v32.9',
      contractAddendum:
        'The first cold introduction is a direct Zac-to-client email and must not introduce, link to or create Clientspace access before the recipient expresses interest. It presents a complete redesign offer as four icon-led commitments and embeds one bounded current-to-redesign desktop/mobile animation linked to the verified redesign.',
      instructionsAddendum:
        'Keep the first-email heading outcome-focused, explain that verified public pages, content and existing functionality were carried across, and promise to add anything important missed from the current website at no additional cost while excluding genuinely new functionality. Offer a normal email reply with no account or setup. Capture the verified current homepage and redesign into one labelled GIF: desktop before, wipe to redesign, real loading and hero motion, a short slow scroll, mobile before-and-after wipe, redesigned hold and fade reset. Keep it at 420 pixels wide, under 1.9 MB and within the 64 MB raw-frame budget.',
      summary:
        'Direct reply comparison introduction test package: removes the premature Clientspace invitation, clarifies the complete redesign offer and delivers one bounded desktop-and-mobile before/after GIF.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets a cold prospect understand the finished offer and reply naturally before any portal workflow is introduced, without increasing attachment count or weakening verified-preview safeguards.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localTruthfulLiveCodexProgressPackage: AgentPackage = {
      ...localDirectReplyComparisonIntroductionPackage,
      id: localTruthfulLiveCodexProgressPackageId,
      version: 33,
      status: 'test_ready',
      basePackageId: localDirectReplyComparisonIntroductionPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.0',
      contractAddendum:
        'Studio retains safe completed App Server items from the live notification stream when an active thread read lags. The chat distinguishes recent native activity with delayed transcript detail, a missing activity signal that may indicate a stalled turn, and a failed status refresh. Historical user requests interrupted by a newer queued message remain visibly labelled as replaced.',
      instructionsAddendum:
        'Observe only bounded App Server lifecycle and completed-item notifications. Merge allowlisted commentary and structural activity into the selected active turn without exposing reasoning, raw command output, arguments or private paths. Track separate native-activity, visible-update and status-refresh signals; after a meaningful delay, explain the evidenced condition and offer Check now plus Stop Codex. Label superseded turns at their saved user message and never imply that a replaced request is still running.',
      summary:
        'Truthful live Codex progress test package: restores delayed in-progress activity, diagnoses silent or disconnected turns and marks requests replaced by a newer message.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Tells the owner whether Codex is working, the transcript is delayed or the activity signal is stale, with safe recovery actions instead of an indefinite ambiguous spinner.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localInstantCachedCodexAccessPackage: AgentPackage = {
      ...localTruthfulLiveCodexProgressPackage,
      id: localInstantCachedCodexAccessPackageId,
      version: 33.1,
      status: 'test_ready',
      basePackageId: localTruthfulLiveCodexProgressPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.1',
      contractAddendum:
        'Studio keeps a bounded private cache of the latest selected Codex transcript for each universal or client-scoped surface. Opening chat during startup renders that saved transcript immediately while the connection remains visibly unverified. Every trusted website and Clientspace launcher opens its embedded panel on the first activation without waiting for a runtime-ready acknowledgement.',
      instructionsAddendum:
        'Persist only bounded owner-browser chat data, keep universal and client workspace caches isolated, and replace the cached view after a verified live status response. Never cache queued work, update notices or active lifecycle state as live: label the header Waiting and keep Send and new-chat actions disabled until connection succeeds. Treat network timeouts as reconnectable rather than proof that the launcher is unsupported. On trusted owner surfaces, size and reveal the configured Studio iframe on activation while continuing origin and contentWindow validation for messages.',
      summary:
        'Instant cached Codex access test package: opens every owner launcher immediately and restores the latest chat while the live connection is still pending.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the blank startup wait without hiding connection state, enabling stale actions or weakening the authenticated embedded-panel boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPairedDeviceComparisonEmailPackage: AgentPackage = {
      ...localInstantCachedCodexAccessPackage,
      id: localPairedDeviceComparisonEmailPackageId,
      version: 33.2,
      status: 'test_ready',
      basePackageId: localInstantCachedCodexAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.2',
      contractAddendum:
        'The first introduction embeds two verified comparison animations: one true 1440 by 900 desktop capture and one true 375 by 812 mobile capture. Each keeps the current website and redesign side by side, scrolls both pages together at a slow percentage-matched pace, holds the bottom and fades directly back to the opening frame.',
      instructionsAddendum:
        'Do not stretch mobile content into a desktop canvas, crop the current desktop site, or use a reveal wipe. Warm and verify media before capture, replay the redesign loading and hero entrance beside the current-site opening frame, then scroll both sides by relative page progress for about 22 seconds. Store and require both bounded GIFs before enabling the first email.',
      summary:
        'Paired device comparison email test package: separates desktop and mobile into smooth side-by-side GIFs with correct proportions, complete current-site framing and a slow fade-reset loop.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the emailed comparison readable and faithful on each device without restoring the stretched single-GIF presentation or weakening the verified capture boundary.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localEmailSafePairedComparisonPackage: AgentPackage = {
      ...localPairedDeviceComparisonEmailPackage,
      id: localEmailSafePairedComparisonPackageId,
      version: 33.3,
      status: 'test_ready',
      basePackageId: localPairedDeviceComparisonEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.3',
      contractAddendum:
        'Paired comparison capture must remain inside the email-safe asset budget for real prospect pages. The mobile composition preserves the true 375 by 812 viewport ratio while adapting only its encoded canvas and palette; it must never substitute the obsolete single animation.',
      instructionsAddendum:
        'Keep the 22-second percentage-matched scroll, loading sequence, hero entrance, bottom hold and fade reset intact. Encode the mobile pair on a compact proportional canvas and progressively reduce palette complexity when necessary, without stretching either panel or dropping back to a reveal wipe.',
      summary:
        'Email-safe paired comparison test package: keeps the real mobile pair smooth, proportional and below the inline-image limit on content-heavy prospect pages.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents live prospect content from rejecting the new mobile animation while preserving the paired-device interaction and verified asset boundary.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localPasswordlessClientspaceAccessPackage: AgentPackage = {
      ...localEmailSafePairedComparisonPackage,
      id: localPasswordlessClientspaceAccessPackageId,
      version: 33.4,
      status: 'test_ready',
      basePackageId: localEmailSafePairedComparisonPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.4',
      contractAddendum:
        'Cold outreach and Clientspace access are separate reviewed messages. The first introduction offers a normal email reply without an account or portal link. After interest, the reviewer can send a dedicated passwordless Clientspace access email whose one-time confirmation opens the welcome, explains future secure-link sign-in, then introduces Milo.',
      instructionsAddendum:
        'Track the introduction receipt separately from the Clientspace invitation state. Generate a fresh magic link only for the explicitly selected Clientspace access delivery, preserve the scanner-safe confirmation step, and never ask the client to create or remember a password. Keep the welcome header and navigation rail clear at mobile, tablet and desktop widths, and make Milo available in protected rehearsals as well as authenticated client entry.',
      summary:
        'Passwordless Clientspace access test package: separates cold outreach from the later secure access email, explains account entry after the welcome and restores Milo across responsive rehearsal entry.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the client journey explicit and secure without introducing an account before interest, while preserving review-only delivery controls and the passwordless authentication boundary.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localDesktopOnlyComparisonEmailPackage: AgentPackage = {
      ...localPasswordlessClientspaceAccessPackage,
      id: localDesktopOnlyComparisonEmailPackageId,
      version: 33.5,
      status: 'test_ready',
      basePackageId: localPasswordlessClientspaceAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.5',
      contractAddendum:
        'The first introduction embeds one verified desktop comparison animation only. It keeps the current website and redesign side by side, scrolls both complete pages together at a slow percentage-matched pace, holds the bottom and fades directly back to the opening frame. No mobile comparison is captured, stored, previewed or delivered.',
      instructionsAddendum:
        'Capture only the true 1440 by 900 desktop pair, preserve the redesign loading and hero entrance, and require exactly one bounded desktop GIF before enabling the first email. Reject legacy two-asset capture records so the reviewer receives a fresh desktop-only comparison rather than a hidden mobile attachment.',
      summary:
        'Desktop-only comparison email test package: simplifies the first introduction to one smooth side-by-side desktop GIF and removes the mobile animation from the full delivery contract.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps the comparison readable and lighter in email while preserving the verified capture, matched scrolling and fade-reset behavior.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localResponsiveSplitComparisonEmailPackage: AgentPackage = {
      ...localDesktopOnlyComparisonEmailPackage,
      id: localResponsiveSplitComparisonEmailPackageId,
      version: 33.6,
      status: 'test_ready',
      basePackageId: localDesktopOnlyComparisonEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.6',
      contractAddendum:
        'The first introduction embeds two synchronized desktop animations: the current website and redesign. Email layout places them side by side on larger screens and stacks them vertically on phones, while both retain percentage-matched scrolling, bottom hold and a direct fade to their opening frames.',
      instructionsAddendum:
        'Capture both sites from true 1440 by 900 desktop viewports as separate bounded GIFs. Use an 80 millisecond target frame delay, encode the raw stacks sequentially, and require exactly the current and redesign assets before enabling the email. Reject the earlier combined desktop asset so mobile email can reflow the comparison without stretching or cropping it.',
      summary:
        'Responsive split comparison email test package: stacks separate current and redesign animations on phones, keeps them side by side on desktop and doubles the bounded scrolling frame rate.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the desktop comparison readable in narrow email clients while improving motion smoothness without holding two raw animation stacks in memory together.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localCompatibleIntroductionLedgerPackage: AgentPackage = {
      ...localResponsiveSplitComparisonEmailPackage,
      id: localCompatibleIntroductionLedgerPackageId,
      version: 33.7,
      status: 'test_ready',
      basePackageId: localResponsiveSplitComparisonEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.7',
      contractAddendum:
        'The explicit rehearsal send remains idempotent when the production outreach ledger predates the optional template column. The server retries only a PostgREST missing-template-column insert without that optional field; every other ledger failure remains blocked and is recorded in protected runtime logs.',
      instructionsAddendum:
        'Keep the verified recipient, two-image comparison, idempotency key and human-confirmed send boundary unchanged. Preserve template metadata whenever the live ledger supports it, and use the legacy insert only for the exact PGRST204 missing-template-column response.',
      summary:
        'Compatible introduction ledger test package: restores explicit rehearsal email sends across the additive template-schema rollout without weakening recipient or idempotency safeguards.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents a harmless additive schema-version mismatch from blocking an owner-confirmed rehearsal email while keeping unexpected database errors fail-closed.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localRecoverableWebsiteCodexAccessPackage: AgentPackage = {
      ...localCompatibleIntroductionLedgerPackage,
      id: localRecoverableWebsiteCodexAccessPackageId,
      version: 33.8,
      status: 'test_ready',
      basePackageId: localCompatibleIntroductionLedgerPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.8',
      contractAddendum:
        'When the owner opens the Codex panel on dev.madesolid.com.au after its private Development Studio session expires, the framed gateway returns a narrowly scoped access-required message instead of exposing a raw unavailable response. The authenticated website bridge sends the owner through the existing Studio verification flow, returns to the exact website route, and reopens Codex automatically.',
      instructionsAddendum:
        'Keep recovery bound to the exact development website origin, exact iframe window, Fetch Metadata checks and authenticated Studio owner. Store no access token in website markup or browser storage. Accept only an exact dev.madesolid.com.au return URL, renew the HttpOnly Development Studio session through the existing short-lived exchange, and preserve the owner-only frame and no-index boundaries.',
      summary:
        'Recoverable website Codex access test package: renews an expired private Workspace session and reopens the chat on the same development website page.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents an expired private Workspace cookie from replacing the owner Codex panel with an unavailable message while preserving the authenticated owner boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localContinuousFeatureReleaseReconciliationPackage: AgentPackage = {
      ...localRecoverableWebsiteCodexAccessPackage,
      id: localContinuousFeatureReleaseReconciliationPackageId,
      version: 33.9,
      status: 'test_ready',
      basePackageId: localRecoverableWebsiteCodexAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v33.9',
      contractAddendum:
        'The protected Studio runtime continuously reconciles each exact completed Codex turn once into Feature Releases when it owns the private ledger, including when Development Studio delegates that ownership upstream. Legacy conversation aliases for an already processed turn do not retry forever. An open Features view refreshes without a deployment being queued and refreshes immediately when the owner returns to it.',
      instructionsAddendum:
        'Run chat maintenance and completed-feature reconciliation independently on the protected runtime cadence so either operation can recover after a transient failure. Preserve bounded newest-first reconciliation, durable processed-turn keys and the no-file-change filter, and deduplicate recovered conversation aliases by their globally unique turn identifier. Advertise continuous-feature-release-reconciliation-v1 only where the owning runtime performs this work, so Development Studio can take over safely from an older upstream runtime without duplicate processing. Refresh the active Features view in the background without replacing current evidence with loading placeholders, and ignore superseded responses.',
      summary:
        'Continuous feature release reconciliation test package: records completed material Codex work automatically and keeps the open Features view current.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Repairs the runtime ownership gap that left completed work unprocessed and removes the need to reopen or manually refresh the Features view.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localPersistentWebsiteCodexPanelPackage: AgentPackage = {
      ...localContinuousFeatureReleaseReconciliationPackage,
      id: localPersistentWebsiteCodexPanelPackageId,
      version: 34,
      status: 'test_ready',
      basePackageId: localContinuousFeatureReleaseReconciliationPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.0',
      contractAddendum:
        'The authenticated development website remembers whether its owner-only Codex panel was open or closed for the current browser tab. A foreground, focus or restored-page synchronization keeps an open cached panel visible and repeatedly requests the trusted embedded panel state instead of replacing it with the three-dot fallback. A transient closed response cannot override an in-flight open request; only the panel’s explicit close action may do so.',
      instructionsAddendum:
        'Store only the open or closed presentation state in website session storage and keep transcript data inside the authenticated Studio origin. On pagehide, conceal the iframe without forgetting that state. On pageshow, focus, online or visible restoration, immediately restore the remembered geometry, continue the bounded trusted-origin handshake and reload a non-responsive iframe after the existing timeout. Ignore false closed acknowledgements while an open request is pending, but accept an explicit close action from the exact trusted iframe window. Preserve expired-access recovery, client-preview exclusion and the first-tap connecting behavior.',
      summary:
        'Persistent website Codex panel test package: keeps an open cached chat accessible across phone foreground recovery and prevents transient synchronization from closing it.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the three-dot-only return state and random-looking panel collapse without caching private transcript content in the website host or weakening the owner-only iframe boundary.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localResponsiveComparisonReviewPackage: AgentPackage = {
      ...localPersistentWebsiteCodexPanelPackage,
      id: localResponsiveComparisonReviewPackageId,
      version: 34.1,
      status: 'test_ready',
      basePackageId: localPersistentWebsiteCodexPanelPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.1',
      contractAddendum:
        'The first introduction links every website comparison affordance to one revocable Made Solid review capability. The review opens in desktop comparison mode, offers exact phone, tablet and desktop evidence plus an interactive redesign preview, and keeps full-size viewport geometry when the host device is narrower.',
      instructionsAddendum:
        'Create comparison evidence from independent 375 by 812 phone, 768 by 1024 tablet and 1440 by 900 browser contexts. Keep the current-site URL private behind a signed Clientspace capability, return only short-lived private evidence URLs, and never accept an arbitrary comparison origin in Inspect. Make the reveal slider mouse, touch and keyboard operable. Full screen must hide mode, device and zoom choices, request browser fullscreen where supported, retain a CSS fallback and persistent exit control, restore on Escape, preserve the selected device and mode, and keep the underlying redesign interactive in Preview mode.',
      summary:
        'Responsive comparison review test package: sends the first email to a signed phone-ready before-and-after viewer with exact device sizes, a touch slider and focused full screen.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Lets a prospect understand the redesign against verified current-site evidence on any device without iframe dependence, stretched desktop captures or a public arbitrary-URL proxy.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localConciseClientspaceAccessPackage: AgentPackage = {
      ...localResponsiveComparisonReviewPackage,
      id: localConciseClientspaceAccessPackageId,
      version: 34.2,
      status: 'test_ready',
      basePackageId: localResponsiveComparisonReviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.2',
      contractAddendum:
        'The dedicated Clientspace access email is a short entry message rather than a second proposal. Its primary Open your Clientspace action appears immediately after one concise workspace summary, followed by one passwordless-return note. The public Made Solid FAQ links to the real client login and explains initial confirmation, later passwordless access, expired links and new devices.',
      instructionsAddendum:
        'Keep cold outreach separate from Clientspace access. In the access email, put the one-time confirmation action before secondary explanation, omit repeated website and report sections, and explain passwordless return access once without weakening the scanner-safe confirmation or exact-recipient boundary. Keep the public login guidance accurate, actionable and keyboard accessible.',
      summary:
        'Concise Clientspace access test package: moves the secure workspace action to the top of a shorter email and documents passwordless return access in the public FAQ.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Reduces friction at the moment an interested client enters Clientspace while making the real passwordless login route and recovery path easy to find later.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localReliableComparisonReviewEmailPackage: AgentPackage = {
      ...localConciseClientspaceAccessPackage,
      id: localReliableComparisonReviewEmailPackageId,
      version: 34.3,
      status: 'test_ready',
      basePackageId: localConciseClientspaceAccessPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.3',
      contractAddendum:
        'A first-introduction email is ready only when its exact capture includes the signed responsive comparison review URL as well as both email animations. A legacy animation-only capture must be replaced automatically and may never fall back to the direct redesign preview link.',
      instructionsAddendum:
        'Treat the signed comparison review URL as part of the immutable first-email capture result. When a saved capture predates responsive comparison evidence, regenerate it before enabling preview, copy or send actions. Do not cache an animation-only result as current, and reject any capture response that omits the signed review capability.',
      summary:
        'Reliable comparison-review email test package: automatically upgrades legacy captures so every first-email link opens the signed before-and-after review.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the legacy-capture fallback that could leave an initial email pointing straight to the redesign instead of the responsive comparison experience.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localLiveSynchronizedComparisonPackage: AgentPackage = {
      ...localReliableComparisonReviewEmailPackage,
      id: localLiveSynchronizedComparisonPackageId,
      version: 34.4,
      status: 'test_ready',
      basePackageId: localReliableComparisonReviewEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.4',
      contractAddendum:
        'The signed before-and-after review renders the current public website and redesign as live sandboxed pages at exact phone, tablet and desktop widths. Both pages remain at the top while entrance animations finish, then travel down their full captured heights on one slow synchronized track. Wheel, vertical touch, or keyboard scrolling stops autoplay immediately. The centered reveal handle demonstrates horizontal dragging with a restrained reduced-motion-safe hint.',
      instructionsAddendum:
        'Persist each captured page height with its device evidence and require that height before issuing the review. Expose the verified current public URL only through the signed review configuration, allow only its exact origin in Inspect frame-src, and keep forms and direct page interaction blocked in Compare mode. Map one normalized scroll progress to each live page’s own full height so different page lengths reach their bottoms together without cropping. Preserve interactive redesign Preview mode separately.',
      summary:
        'Live synchronized comparison test package: replaces cropped screenshots with live pages, a centered animated reveal handle and user-cancellable slow scrolling.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the comparison feel like the real websites while retaining exact device geometry, bounded signed access, safe sandboxing and accessible manual control.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localInteractiveDeviceComparisonPackage: AgentPackage = {
      ...localLiveSynchronizedComparisonPackage,
      id: localInteractiveDeviceComparisonPackageId,
      version: 34.5,
      status: 'test_ready',
      basePackageId: localLiveSynchronizedComparisonPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.5',
      contractAddendum:
        'Compare mode uses a signed, bounded HTML relay to request the current and redesigned websites with the selected phone, tablet or desktop browser identity. The sandboxed live documents retain links, animation and native scrolling; a narrow centered divider is the only drag interception surface. A bridge synchronizes real document scroll positions and stops autoplay on the first page interaction.',
      instructionsAddendum:
        'Resolve both comparison documents only from the signed review configuration and exact approved preview target. Reject redirects, non-HTML responses, oversized documents, private-network destinations and unsigned relay requests. Keep form submission blocked. Reset reveal to 50 percent on compare entry, reload and device changes, and synchronize native document scrolling by normalized progress without replacing either document with captured imagery.',
      summary:
        'Interactive device-correct comparison test package: renders the actual desktop, tablet or phone websites inside Compare with live interaction, synchronized native scrolling and a reliably centered divider.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Fixes mobile browsers receiving the original site’s phone-only server rendering and removes the page-sized interaction blocker that made live websites behave like static images.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localPolishedWebsiteCodexRecoveryPackage: AgentPackage = {
      ...localInteractiveDeviceComparisonPackage,
      id: localPolishedWebsiteCodexRecoveryPackageId,
      version: 34.6,
      status: 'test_ready',
      basePackageId: localInteractiveDeviceComparisonPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.6',
      contractAddendum:
        'The authenticated development website never paints an embedded Studio document until the exact iframe window at the configured Studio origin reports ready. A host-owned, geometry-matched connecting surface covers first open, tab restoration and foreground recovery. Offline, frame and bounded no-response failures become a branded recoverable state, so browser failure pages, Railway responses and the standalone Studio loader remain hidden.',
      instructionsAddendum:
        'Keep the Studio iframe invisible and non-interactive until a ready-true message passes both exact-origin and exact-window validation. Preserve only the tab-scoped open or closed presentation state. While an open panel reconnects, render the accessible Clientspace-owned shell with a 44-pixel close control; after a bounded retry and deadline, show plain-language retry and close actions without exposing provider HTML. Retry with a fresh resume token, restore focus on host close, distinguish offline copy, respect reduced motion and remove the shell alongside the owner controls in nested client previews.',
      summary:
        'Polished website Codex recovery test package: replaces raw Studio, browser and Railway failure pages with a trusted-ready loading shell and actionable retry experience.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps unready cross-origin documents out of the owner experience while preserving automatic recovery, secure readiness validation and a clear manual retry path.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localProxySafeLiveComparisonPackage: AgentPackage = {
      ...localPolishedWebsiteCodexRecoveryPackage,
      id: localProxySafeLiveComparisonPackageId,
      version: 34.7,
      status: 'test_ready',
      basePackageId: localPolishedWebsiteCodexRecoveryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.7',
      contractAddendum:
        'The signed live-document relay is routed by its dedicated /inspect/live path even when a deployment proxy rewrites the upstream Host header. Review-token, exact-source, device, destination, response-type, size and private-network validation remain mandatory.',
      instructionsAddendum:
        'Recognize only the exact /inspect/live path before applying the signed Clientspace review configuration and destination checks. Do not use the proxy-facing Host header as a second authorization decision because managed deployment proxies may replace it. Preserve every existing signed-review, exact-target, device, redirect, HTML, size and private-network boundary.',
      summary:
        'Proxy-safe live comparison test package: keeps signed interactive comparison documents available through the deployed Inspect proxy instead of falling through to a static not-found page.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes the live before-and-after websites load reliably behind the production reverse proxy without weakening the signed comparison boundary.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localCompactChatFeatureHistoryPackage: AgentPackage = {
      ...localProxySafeLiveComparisonPackage,
      id: localCompactChatFeatureHistoryPackageId,
      version: 34.8,
      status: 'test_ready',
      basePackageId: localProxySafeLiveComparisonPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.8',
      contractAddendum:
        'The collapsed Feature history disclosure in the Codex chat is content-sized at phone, tablet and desktop widths. The transcript remains the flexible row that receives the available reading space, while an opened feature history remains bounded and independently scrollable.',
      instructionsAddendum:
        'Keep the selected-chat feature history as a compact disclosure above the transcript. When chat chrome gains or loses a direct grid child, preserve the transcript as the only flexible content row. Verify the collapsed and expanded states without shrinking labelled controls below their shared touch targets.',
      summary:
        'Compact chat feature history test package: prevents the collapsed feature disclosure from taking over the transcript area on mobile and larger viewports.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps feature context available without sacrificing the conversation area needed to read and continue the chat.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localExactRedesignComparisonPackage: AgentPackage = {
      ...localCompactChatFeatureHistoryPackage,
      id: localExactRedesignComparisonPackageId,
      version: 34.9,
      status: 'test_ready',
      basePackageId: localCompactChatFeatureHistoryPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v34.9',
      contractAddendum:
        'Compare mode renders the redesign from the exact signed private preview document used by Preview mode. The trusted preview host injects only the normalized-scroll comparison bridge, while the unrelated current public website remains isolated behind the bounded HTML relay.',
      instructionsAddendum:
        'Do not fetch and re-serve the generated redesign HTML through the public-site comparison relay. Load the signed preview capability directly with its inspect and comparison markers, preserve those markers during internal navigation, and inject the comparison bridge only while serving that exact private capability. Keep the redesign frame cross-origin from Inspect with scripts and same-origin enabled so its normal runtime, assets, hero reveal and hydration match Preview. Continue to relay the untrusted current public website without same-origin permission.',
      summary:
        'Exact redesign comparison test package: makes the desktop hero and complete redesign render identically in Preview and Compare while retaining synchronized scrolling.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the second HTML-proxy rendering path that could strand generated hero reveals, without weakening isolation for the original public website.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localSimplifiedWebsiteReviewPackage: AgentPackage = {
      ...localExactRedesignComparisonPackage,
      id: localSimplifiedWebsiteReviewPackageId,
      version: 35,
      status: 'test_ready',
      basePackageId: localExactRedesignComparisonPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.0',
      contractAddendum:
        'The signed website review presents one complete live page at a time behind explicit Old site and New site tabs. The selected site keeps its native scrolling and page interaction without a split reveal layer, synchronized autoplay or page-wide drag surface. Phone, tablet and desktop controls continue to render the selected exact viewport, including desktop geometry on a phone.',
      instructionsAddendum:
        'Default a signed review to New site and persist the selected site and device in the review URL. Load the old public website only through the signed device-aware HTML relay, and load the new website from the exact signed private preview document. Keep inactive versions mounted but hidden so switching is immediate and each page retains its own state. Full screen must hide all review controls and leave only the selected live page plus an accessible exit control.',
      summary:
        'Simplified website review test package: replaces the split slider with polished full-page Old site and New site tabs, compact responsive controls and focused full screen.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes before-and-after review obvious and usable on phones while retaining live websites, exact desktop dimensions and the signed review boundary.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localResponsivePreviewLaunchPackage: AgentPackage = {
      ...localSimplifiedWebsiteReviewPackage,
      id: localResponsivePreviewLaunchPackageId,
      version: 35.1,
      status: 'test_ready',
      basePackageId: localSimplifiedWebsiteReviewPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.1',
      contractAddendum:
        'Agent Studio device-preview launches immediately render a secure-access waiting document in the user-opened tab. Preview capability creation runs concurrently with selected-entry-page resolution, and the tab navigates only after the exact private URL is ready.',
      instructionsAddendum:
        'Keep private preview capability tokens out of Studio routes and visible loading copy. Open the waiting tab only from the reviewer gesture, announce that secure private access is being prepared, respect reduced motion, overlap independent capability and entry-page lookups, then replace that exact tab with the device preview URL.',
      summary:
        'Responsive preview launch test package: replaces the slow blank mobile tab with an accessible secure-preview loading state and concurrent private-access preparation.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Makes Agent Studio previews feel responsive on mobile without weakening popup handling or the private preview capability boundary.',
      stagedBehaviourIds: ['package-behaviour', 'client-url-release-contract'],
    };
    const localEvidenceLedHomepagePackage: AgentPackage = {
      ...localResponsivePreviewLaunchPackage,
      id: localEvidenceLedHomepagePackageId,
      version: 35.2,
      status: 'test_ready',
      basePackageId: localResponsivePreviewLaunchPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.2',
      contractAddendum:
        'Homepage art direction starts from an explicit evidence-grounded company context and a recorded hero decision. Hero media is optional: it must be reviewed photography or a verified dossier-content component, while logo-only builds use a deliberate typographic or information-led composition without decorative fallback media.',
      instructionsAddendum:
        'Read the complete staged homepage dossier before choosing typography or composition. Record what the organisation does, its audience, supported differentiators, primary visitor action, cited source evidence, hero concept, composition, media mode, and avoided generic formula in DESIGN_DECISIONS.json. Do not repeat the dark split, eyebrow, oversized serif-and-italic heading, CTA, and decorative media-panel formula without specific brand or content evidence. Omit hero media when no approved photograph or verified content component supports it; do not add effects or motion to satisfy a quota.',
      summary:
        'Evidence-led homepage art direction test package: grounds every hero in company context, makes photography availability explicit, and rejects decorative fallback media and unsubstantiated generic hero formulas.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Adds deterministic company-context and hero-media quality checks while removing composition quotas that caused unrelated homepage tests to converge.',
      stagedBehaviourIds: [
        'next-component-architecture',
        'motion-runtime',
        'framework-quality-gates',
      ],
    };
    const localInspectEmailReplyCtaPackage: AgentPackage = {
      ...localEvidenceLedHomepagePackage,
      id: localInspectEmailReplyCtaPackageId,
      version: 35.3,
      status: 'test_ready',
      basePackageId: localEvidenceLedHomepagePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.3',
      contractAddendum:
        'A signed first-email website review includes one restrained Made Solid response action outside the website viewport. The action uses contact details from the signed Clientspace review configuration, opens the visitor’s email application with a business-specific subject, and never accepts a recipient from editable Inspect URL parameters. It is absent from owner-only previews and hidden with every other review control in full screen.',
      instructionsAddendum:
        'Render Email Zac only when the signed website-review configuration supplies a validated contact email and subject. Keep the original-email reply as the preferred way to retain conversation threading, do not add a form or Clientspace gate, preserve the exact website viewport geometry, and hide the response bar in focused full screen. Accept the preceding signed comparison contract during the coordinated runtime rollout.',
      summary:
        'Inspect email reply CTA test package: adds a polished signed Email Zac action after the prospect reviews the redesign, without adding an account or feedback form.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Closes the cold-introduction review journey with a clear low-friction response path while preserving signed-review security and normal email replies.',
      stagedBehaviourIds: ['client-introduction-outreach', 'client-url-release-contract'],
    };
    const localRailwayOnlyProductReleasesPackage: AgentPackage = {
      ...localInspectEmailReplyCtaPackage,
      id: localRailwayOnlyProductReleasesPackageId,
      version: 35.4,
      status: 'test_ready',
      basePackageId: localInspectEmailReplyCtaPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.4',
      contractAddendum:
        'Made Solid Studio and the Made Solid website/Clientspace deploy only to their existing Railway projects and services. A synchronized release verifies and deploys the website receiver first, proves the signed runtime contract on madesolid.com.au, and deploys Studio only after that receiver is healthy.',
      instructionsAddendum:
        'Never use Vercel for Made Solid Studio or the Made Solid website/Clientspace runtime. Target the existing Railway project, service and explicit development or production environment; never create a replacement service during release. Preserve receiver-first synchronized verification and stop before Studio when any website deployment or contract check fails.',
      summary:
        'Railway-only product releases test package: moves website, Clientspace and Studio release automation onto their existing Railway services with receiver-first health gates.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Keeps every first-party Made Solid runtime on one documented deployment platform and prevents a future Codex release from silently falling back to Vercel.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localCompactInspectPackage: AgentPackage = {
      ...localRailwayOnlyProductReleasesPackage,
      id: 'agent-package-local-v35-5-compact-inspect',
      version: 35.5,
      status: 'test_ready',
      basePackageId: localRailwayOnlyProductReleasesPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.5',
      contractAddendum:
        'Inspect reserves more space for the website with a two-row mobile toolbar, accessible device icons, a compact zoom footer and a restrained canvas.',
      instructionsAddendum:
        'Keep 44px touch targets, signed Email Zac contact, exact preview dimensions, version switching and full-screen controls. Verify 320px and 375px phones, tablet and desktop without horizontal overflow.',
      summary:
        'Compact Inspect test package: gives phone previews more room with a two-row toolbar, device icons and a compact footer.',
      capabilityProposal:
        'Makes website review easier on phones without shrinking touch targets or changing the inspected website viewport.',
      stagedBehaviourIds: ['client-url-release-contract'],
    };
    const localStillHomepageEmailPackage: AgentPackage = {
      ...localCompactInspectPackage,
      id: 'agent-package-local-v35-6-still-homepage-email',
      version: 35.6,
      status: 'test_ready',
      basePackageId: localCompactInspectPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.6',
      contractAddendum:
        'The first introduction email embeds one still image of the new website homepage hero. The image comes from the saved verified desktop redesign comparison, and the signed Inspect link still opens the complete responsive old-and-new review.',
      instructionsAddendum:
        'Do not attach old or new website GIFs to the introduction email. Read the new homepage JPEG from the protected saved capture, attach it inline once, and keep the interactive review as a link. Other email templates and the plain-text reply path remain unchanged.',
      summary:
        'Still homepage email test package: replaces the paired introduction GIFs with one verified new-homepage hero image.',
      capabilityProposal:
        'Makes the first prospect email faster to understand while keeping the complete old-and-new website review one click away.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localContinuousClientEmailInboxPackage: AgentPackage = {
      ...localStillHomepageEmailPackage,
      id: 'agent-package-local-v35-7-continuous-client-email-inbox',
      version: 35.7,
      status: 'test_ready',
      basePackageId: localStillHomepageEmailPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.7',
      contractAddendum:
        'The supervised Studio runtime checks the protected Clientspace inbox receiver every minute. Clientspace saves email from exact project address matches once, prepares private review-only AI drafts, and exposes unread project email to admin Overview, Messages, and open-session notifications.',
      instructionsAddendum:
        'Keep inbound email private and project-scoped. Never send an AI reply automatically. Clear unread status only when staff open the matching email; keep the background check independent of whether the admin browser is open.',
      summary:
        'Continuous client email inbox test package: checks incoming mail in the background and alerts staff to new project-specific email.',
      capabilityProposal:
        'Makes the existing review desk timely and discoverable without changing the human approval boundary for replies.',
      stagedBehaviourIds: ['inbound-client-email-review'],
    };
    const localReliableCodexQueueHandoffPackage: AgentPackage = {
      ...localContinuousClientEmailInboxPackage,
      id: localReliableCodexQueueHandoffPackageId,
      version: 35.8,
      status: 'test_ready',
      basePackageId: localContinuousClientEmailInboxPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.8',
      contractAddendum:
        'The Studio Codex queue confirms an apparently active conversation against its latest turn before holding a message. A completed turn with a lagging active thread summary cannot strand later requests. Selecting Interrupt waits for the selected queued request to hand off when no active turn remains.',
      instructionsAddendum:
        'Use authoritative included turn state for dispatch when a thread summary is active. Leave genuinely in-progress turns queued, keep independent idle conversations parallel, and retain a durable request when current detail cannot be read. After an interrupt request finds no active turn, complete the selected queue hand-off before returning status.',
      summary:
        'Reliable Codex queue handoff test package: sends messages after completed turns despite stale active thread summaries and makes Interrupt advance the selected request.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Removes the false busy state that made completed Studio chats look permanently queued while preserving real active-turn and workspace-scope safeguards.',
      stagedBehaviourIds: ['visual-codex-feedback'],
    };
    const localRenderedEmailCapturePackage: AgentPackage = {
      ...localReliableCodexQueueHandoffPackage,
      id: 'agent-package-local-v35-9-rendered-email-capture',
      version: 35.9,
      status: 'test_ready',
      basePackageId: localReliableCodexQueueHandoffPackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v35.9',
      contractAddendum:
        'Email homepage images require loaded visible media, a dismissed intro, completed finite reveal animations and stable rendered geometry and opacity. A loading timeout fails capture instead of saving an incomplete image.',
      instructionsAddendum:
        'Use waitForHomepageCapture for every still homepage capture. Wait for visible images, backgrounds and videos, fonts, loader dismissal and finite animations. Leave infinite decorative motion alone. Never replace a loading timeout with a successful screenshot.',
      summary:
        'Rendered email capture test package: waits for the website intro, media and reveal animations before saving the email image.',
      capabilityProposal: 'Prevents blank homepage screenshots in client introduction emails.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    const localReliableAdminWebsitePreviewPackage: AgentPackage = {
      ...localRenderedEmailCapturePackage,
      id: 'agent-package-local-v36-0-reliable-admin-website-preview',
      version: 36.0,
      status: 'test_ready',
      basePackageId: localRenderedEmailCapturePackage.id,
      builderContractVersion: 'made-solid-studio-builder-agent-v36.0',
      contractAddendum:
        'Verified private website previews permit embedding by the explicitly configured Clientspace origin as well as the existing Studio and Inspect origins. Expiring capabilities, draft restrictions and all other preview protections remain enforced.',
      instructionsAddendum:
        'Keep the Admin email website preview project-scoped, show loading and delayed-load feedback, and offer a keyboard-accessible retry and the existing external website review. Never treat the iframe load event as proof that a cross-origin website rendered successfully or allow arbitrary framing origins.',
      summary:
        'Reliable admin website preview test package: fixes Clientspace framing permissions for private previews and adds loading feedback and retry to the email website preview.',
      capabilityAssessment: 'foundation_change_required',
      capabilityProposal:
        'Prevents supported private previews from being silently blocked in Clientspace Admin and lets staff recover from a delayed or blank embedded website.',
      stagedBehaviourIds: ['client-introduction-outreach'],
    };
    if (!localPackageRecord) {
      await this.put('meta', {
        id: localAgentPackageKey,
        value: JSON.stringify([
          localReliableAdminWebsitePreviewPackage,
          localRenderedEmailCapturePackage,
          localReliableCodexQueueHandoffPackage,
          localContinuousClientEmailInboxPackage,
          localStillHomepageEmailPackage,
          localCompactInspectPackage,
          localRailwayOnlyProductReleasesPackage,
          localInspectEmailReplyCtaPackage,
          localEvidenceLedHomepagePackage,
          localResponsivePreviewLaunchPackage,
          localSimplifiedWebsiteReviewPackage,
          localExactRedesignComparisonPackage,
          localCompactChatFeatureHistoryPackage,
          localProxySafeLiveComparisonPackage,
          localPolishedWebsiteCodexRecoveryPackage,
          localInteractiveDeviceComparisonPackage,
          localLiveSynchronizedComparisonPackage,
          localReliableComparisonReviewEmailPackage,
          localConciseClientspaceAccessPackage,
          localResponsiveComparisonReviewPackage,
          localPersistentWebsiteCodexPanelPackage,
          localContinuousFeatureReleaseReconciliationPackage,
          localRecoverableWebsiteCodexAccessPackage,
          localCompatibleIntroductionLedgerPackage,
          localResponsiveSplitComparisonEmailPackage,
          localDesktopOnlyComparisonEmailPackage,
          localPasswordlessClientspaceAccessPackage,
          localEmailSafePairedComparisonPackage,
          localPairedDeviceComparisonEmailPackage,
          localInstantCachedCodexAccessPackage,
          localTruthfulLiveCodexProgressPackage,
          localDirectReplyComparisonIntroductionPackage,
          localPrioritisedIntroductionStatusPackage,
          localReconciledIntroductionReceiptPackage,
          localRehearsalIntroductionResetPackage,
          localHeroAnimatedHomepageCapturePackage,
          localLiveAnimatedHomepageCapturePackage,
          localReliableSmoothHomepageCapturePackage,
          localSmoothHomepagePreviewLoopPackage,
          localPersistedAnimatedHomepagePreviewPackage,
          localAnimatedClientspaceHomepagePreviewPackage,
          localAutomaticClientspaceHomepageCapturePackage,
          localClientspaceDevelopmentQuoteReconfirmationPackage,
          localClientspaceQuoteReconfirmationPackage,
          localAccurateFeatureTitlesPackage,
          localUninterruptedStudioChatPackage,
          localAutomaticFeatureDevelopmentReleasePackage,
          localActionableReleasePipelinePackage,
          localMultiFeatureChatLineagePackage,
          localChatFeatureHistoryPackage,
          localReliableFeatureLedgerPackage,
          localLeceEmailAndQuoteRecoveryPackage,
          localProductReleaseOverviewPackage,
          localDurableAiChatTitlesPackage,
          localVisibleFeatureReleaseStatusPackage,
          localManagedFeatureWordingPackage,
          localAiInterpretedChatTitlesPackage,
          localCompactCodexChatChromePackage,
          localManualCodexUpdateRecoveryPackage,
          localFeatureReleaseManagementPackage,
          localPinnedTaggedCodexChatsPackage,
          localPolishedDevicePreviewToolbarPackage,
          localInterpretedChatDropdownTitlesPackage,
          localRecoverableQuoteExpiryPackage,
          localExpandedChatDropdownTitlesPackage,
          localValidatedCodexBranchActionsPackage,
          localRetrospectiveChatContextPackage,
          localContextAwareChatTitlesAndStatesPackage,
          localPurposeAwareCodexBranchingPackage,
          localVisibleChatGptCreditsPackage,
          localReadableAgentStudioRefinementPackage,
          localEditableClientspaceBalancePackage,
          localOwnerDevicePreviewPackage,
          localSettledEmailHomepageCapturePackage,
          localVisibleBuilderModelsPackage,
          localSettledNavigationQualityPackage,
          localCompactPhotoComposerPackage,
          localReliableBuilderRepairPackage,
          localAutomaticBuilderQualityRepairPackage,
          localVisibleBuilderCodexVersionPackage,
          localBuilderVersionDialogPackage,
          localPublicOnlyManifestSourcesPackage,
          localCompactCodexComposerNotificationsPackage,
          localEmailReadyHomepagePreviewPackage,
          localBrandedExactClientPreviewPackage,
          localImmediateRehearsalPipelineIsolationPackage,
          localVoiceDictatedCodexChatPackage,
          localResilientCodexRuntimeUpdatesPackage,
          localUniversalBuilderModelSettingsPackage,
          localGuidedClientspaceTestPackage,
          localRehearsalRecipientIsolationPackage,
          localOversizedCodexConversationRecoveryPackage,
          localCompatibleHandoffTimestampPackage,
          localVerifiedPreviewCompletionPackage,
          localAuthenticatedPreviewDeploymentPackage,
          localIsolatedExactPreviewPackage,
          localPublishedRepositoryFallbackPackage,
          localAutomaticRehearsalPreviewPackage,
          localContextualCodexChatTitlesPackage,
          localReliableRehearsalCreationPackage,
          localGuidedClientHandoffPackage,
          localClientspaceRehearsalPackage,
          localFailedChatContinuationPackage,
          localCompatibleCodexFailureDisplayPackage,
          localVisibleCodexFailuresPackage,
          localStableChatReconnectionPackage,
          localCompleteCodexReadPlaybackPackage,
          localRecoveringCodexTranscriptsPackage,
          localUnifiedProposalPackage,
          localImmediateWebsiteCodexOpenPackage,
          localClientPreviewCodexIsolationPackage,
          localAutomaticClientEmailHandoffPackage,
          localResilientWebsiteCodexResumePackage,
          localRecentRequestChatContextPackage,
          localRecoverStaleEmptyCodexChatPackage,
          localExplicitWebsiteEditVersionStatusPackage,
          localConciseCurrentWorkChatTitlesPackage,
          localDurableNewCodexChatPackage,
          localRestorableManagedCodexChatsPackage,
          localReliableNewCodexChatPackage,
          localAstraReadyCodexRuntimePackage,
          localAuthenticatedWebsiteCodexEmbedPackage,
          localOwnerOnlyWebsiteCodexPackage,
          localCodexUpdateCheckerPackage,
          localAutomaticCodexUpdatesPackage,
          localReliableNextWebsitePreviewPackage,
          localPersistentCodexPreferencesPackage,
          localGeneratedNextEnvironmentHygienePackage,
          localConfiguredFinalEditUpstreamPackage,
          localSeamlessStudioResumePackage,
          localContextualQuickQuestionsPackage,
          localCodexConversationStatusIndicatorsPackage,
          localEditorOnlyClientChatScopePackage,
          localUnambiguousWebsiteEditingPackage,
          localExactEditedSiteReleasePackage,
          localResponsiveDevelopmentRuntimePackage,
          localQueueableWorkingCodexMessagesPackage,
          localResumeAwareCodexProgressPackage,
          localReliableCodexEphemeralThreadsPackage,
          localFocusedProspectPreviewModesPackage,
          localResilientDevelopmentStudioRuntimePackage,
          localDedicatedClientWebsiteEditorPackage,
          localReliableCodexStopStatePackage,
          localRevocableReadyClientReviewsPackage,
          localClientUrlReleaseContractPackage,
          localStoppableCodexTurnsPackage,
          localResilientLiveCodexBranchingPackage,
          localDevelopmentReleaseUrlsPackage,
          localConciseCodexReadingPackage,
          localFocusedCodexSettingsPackage,
          localNaturalCodexReadingPackage,
          localLiveWorkspacePhoneNotificationsPackage,
          localLiveWorkspaceCodexBranchingPackage,
          localBranchableCodexConversationsPackage,
          localCodexPhoneNotificationsPackage,
          localSelectedCodexExcerptActionsPackage,
          localPersistentCodexChatSurfacesPackage,
          localRestoredCodexVoiceExperiencePackage,
          localWorkspaceDevelopmentStudioPackage,
          localCanonicalWorkspaceEntryPackage,
          localDeployedStudioShellPackage,
          localOwnerApiCreditsSwitchPackage,
          localExecutableNextWorkspaceRuntimePackage,
          localNextCompatibleWorkspaceRuntimePackage,
          localOpaqueWorkspaceFrameCapabilityPackage,
          localReliableWorkspaceDevelopmentSurfacesPackage,
          localLockedWorkspaceDevDependenciesPackage,
          localLiveCodexLauncherRecoveryPackage,
          localWorkspaceHostedEditorShellPackage,
          localClientScopedCodexChatsPackage,
          localStudioOwnedWorkspaceShellPackage,
          localRenderableRailwayStudioPackage,
          localResilientStudioSessionRecoveryPackage,
          localAuthenticatedGoogleVoiceCataloguePackage,
          localGlobalGoogleVoiceCataloguePackage,
          localLiveEditableStudioRuntimePackage,
          localImageOnlyCodexMessagePackage,
          localDurableCodexChatSessionPackage,
          localSelectableGoogleCodexVoicesPackage,
          localDeletableQueuedCodexMessagesPackage,
          localSeamlessStudioHydrationPackage,
          localReliableFullReplyReadingPackage,
          localEvidenceLinkedCodexActivityPackage,
          localCodexSubscriptionUsagePackage,
          localCodexConversationLoadingPackage,
          localDeviceVoiceReadAloudPackage,
          localObservableCodexActivityPackage,
          localAuthenticatedStudioControlsPackage,
          localRenderableWorkspacePreviewPackage,
          localRestartableWorkspacePreviewPackage,
          localStableWorkspacePreviewPackage,
          localAgentTeamClarityPackage,
          localMessageMotionCodexChatPackage,
          localPrivateWorkspacePreviewAccessPackage,
          localContextualCodexChatPackage,
          localInlineMultiImageCodexChatPackage,
          localAnimatedCodexChatPackage,
          localFastCodexChatPackage,
          localRailwayContainerAccessPackage,
          localRailwayPersistentCheckoutPackage,
          localRailwayWorkspaceWritePackage,
          localPermanentRailwayRuntimePackage,
          localSubscriptionSafeCodexRuntimePackage,
          localUninterruptedCodexRecoveryPackage,
          localTurnScopedAgentTeamsPackage,
          localSpaciousCodexChatPackage,
          localResumableAgentTeamPackage,
          localClientspaceAdminEmailReviewPackage,
          localInboundClientEmailReviewPackage,
          localColdProspectOffersPackage,
          localAgentTeamChatPackage,
          localDurableCodexTurnRecoveryPackage,
          localReliableUnmaterializedChatCleanupPackage,
          localCodexExperimentalWorkspaceCapabilityPackage,
          localDualRepositoryCodexWorkspacePackage,
          localCodespaceInterruptedChatRecoveryPackage,
          localRecentPromptChatTitlesPackage,
          localCameraRollPhotoUploadPackage,
          localSubscriptionBuilderPackage,
          localCompactCodexComposerPackage,
          localMarkdownCodexChatPackage,
          localConcurrentCodexActivityPackage,
          localCodexTranscriptPositionPackage,
          localPublicCodespacePortsPackage,
          localConcurrentCodexChatsPackage,
          localReliableLongPageCapturePackage,
          localExactVisualChatPackage,
          localMobileStudioCapturePackage,
          localExactStudioCapturePackage,
          localReliableCodexNewChatPackage,
          localCodespaceWorkspaceSuitePackage,
          localCodexCapturePreferencesPackage,
          localCodexIdeChatPackage,
          localCodexConversationCapturePackage,
          localCodexChatPackage,
          localVisualCodexFeedbackPackage,
          localReviewedPageDispositionsPackage,
          localEditableHandoffRecoveryPackage,
          localAutomaticProspectDomainPackage,
          localAutomaticClientspacePreviewPackage,
          localCapturedHandoffEmailPackage,
          localCanonicalAssetHandoffPackage,
          localCleanAlternateTestPackage,
          localHandoffWorkerLivenessPackage,
          localOptionalHandoffSchemaPackage,
          localMadeSolidHandoffPackage,
          localAgentStudioTonePackage,
          localAgentLearningInboxPackage,
          localEditVersionHistoryPackage,
          localResilientFinalEditPackage,
          localEditingHandoffPagesPackage,
          localResilientRefinementLedgerPackage,
          localLiveRefinementLedgerPackage,
          localCodespacesPreviewUrlPackage,
          localAutomaticWebsiteLaunchPackage,
          localImmediateSourceWorkspacePackage,
          localOneClickProspectWorkspacePackage,
          localEmbeddedProspectWorkspacePackage,
          localNoninteractiveCodexInstallPackage,
          localWebsiteToneDirectionPackage,
          localVisibleCodespaceSetupPackage,
          localCodespaceResumeStartupPackage,
          localOptionalSvgGenerationPackage,
          localPersistentCodespaceTmuxPackage,
          localBuilderDerivedColoursPackage,
          localCodespaceSetupOrderingPackage,
          localCodespaceStartupReliabilityPackage,
          localLogoAccentRegionsPackage,
          localCodespaceWorkspacePackage,
          localAccentOnlyBrandPackage,
          localRefinementHandoffPackage,
          localViewportChecksOnlyPackage,
          localBoundedBuilderRequestsPackage,
          localActionableBuilderFailurePackage,
          localMobileViewportIntegrityPackage,
          localImmediateNavigationSequencePackage,
          localSettledFactualEvidencePackage,
          localForcedFinalStatePackage,
          localReusableSectionRhythmPackage,
          localDeterministicEvidencePackage,
          localSettledAccessibilityPackage,
          localStableNavigationVisibilityPackage,
          localCheckpointQualityRecheckPackage,
          localReliableCompactNavigationPackage,
          localCompleteCheckpointRestorePackage,
          localSelectedRouteCompilePackage,
          localCreativeAutonomyPackage,
          localDecodedNavigationLogoPackage,
          localEfficientBuilderExecutionPackage,
          localImmediateBrandIntroductionPackage,
          localResponsiveIntroCraftPackage,
          localValidPreviewEntryPackage,
          localPreciseLogoHandoffPackage,
          localCleanTestStartPackage,
          localMeaningfulPageNamesPackage,
          localResilientResumePackage,
          localImmersiveMotionPackage,
          localResilientQualityPackage,
          localExpressivePackage,
          localCreativePackage,
          localPublishedPackage,
        ]),
      } satisfies MetaRecord);
    } else {
      try {
        const stored = JSON.parse(localPackageRecord.value) as AgentPackage | AgentPackage[];
        const packages = Array.isArray(stored) ? stored : [stored];
        const missingPackages = [
          localReliableAdminWebsitePreviewPackage,
          localRenderedEmailCapturePackage,
          localReliableCodexQueueHandoffPackage,
          localContinuousClientEmailInboxPackage,
          localStillHomepageEmailPackage,
          localCompactInspectPackage,
          localRailwayOnlyProductReleasesPackage,
          localInspectEmailReplyCtaPackage,
          localEvidenceLedHomepagePackage,
          localResponsivePreviewLaunchPackage,
          localSimplifiedWebsiteReviewPackage,
          localExactRedesignComparisonPackage,
          localCompactChatFeatureHistoryPackage,
          localProxySafeLiveComparisonPackage,
          localPolishedWebsiteCodexRecoveryPackage,
          localInteractiveDeviceComparisonPackage,
          localLiveSynchronizedComparisonPackage,
          localReliableComparisonReviewEmailPackage,
          localConciseClientspaceAccessPackage,
          localResponsiveComparisonReviewPackage,
          localPersistentWebsiteCodexPanelPackage,
          localContinuousFeatureReleaseReconciliationPackage,
          localRecoverableWebsiteCodexAccessPackage,
          localCompatibleIntroductionLedgerPackage,
          localResponsiveSplitComparisonEmailPackage,
          localDesktopOnlyComparisonEmailPackage,
          localPasswordlessClientspaceAccessPackage,
          localEmailSafePairedComparisonPackage,
          localPairedDeviceComparisonEmailPackage,
          localInstantCachedCodexAccessPackage,
          localTruthfulLiveCodexProgressPackage,
          localDirectReplyComparisonIntroductionPackage,
          localPrioritisedIntroductionStatusPackage,
          localReconciledIntroductionReceiptPackage,
          localRehearsalIntroductionResetPackage,
          localHeroAnimatedHomepageCapturePackage,
          localLiveAnimatedHomepageCapturePackage,
          localReliableSmoothHomepageCapturePackage,
          localSmoothHomepagePreviewLoopPackage,
          localPersistedAnimatedHomepagePreviewPackage,
          localAnimatedClientspaceHomepagePreviewPackage,
          localAutomaticClientspaceHomepageCapturePackage,
          localClientspaceDevelopmentQuoteReconfirmationPackage,
          localClientspaceQuoteReconfirmationPackage,
          localAccurateFeatureTitlesPackage,
          localUninterruptedStudioChatPackage,
          localAutomaticFeatureDevelopmentReleasePackage,
          localActionableReleasePipelinePackage,
          localMultiFeatureChatLineagePackage,
          localChatFeatureHistoryPackage,
          localReliableFeatureLedgerPackage,
          localLeceEmailAndQuoteRecoveryPackage,
          localProductReleaseOverviewPackage,
          localDurableAiChatTitlesPackage,
          localVisibleFeatureReleaseStatusPackage,
          localManagedFeatureWordingPackage,
          localAiInterpretedChatTitlesPackage,
          localCompactCodexChatChromePackage,
          localManualCodexUpdateRecoveryPackage,
          localFeatureReleaseManagementPackage,
          localPinnedTaggedCodexChatsPackage,
          localPolishedDevicePreviewToolbarPackage,
          localInterpretedChatDropdownTitlesPackage,
          localRecoverableQuoteExpiryPackage,
          localExpandedChatDropdownTitlesPackage,
          localValidatedCodexBranchActionsPackage,
          localRetrospectiveChatContextPackage,
          localContextAwareChatTitlesAndStatesPackage,
          localPurposeAwareCodexBranchingPackage,
          localVisibleChatGptCreditsPackage,
          localReadableAgentStudioRefinementPackage,
          localEditableClientspaceBalancePackage,
          localOwnerDevicePreviewPackage,
          localSettledEmailHomepageCapturePackage,
          localVisibleBuilderModelsPackage,
          localSettledNavigationQualityPackage,
          localCompactPhotoComposerPackage,
          localReliableBuilderRepairPackage,
          localAutomaticBuilderQualityRepairPackage,
          localVisibleBuilderCodexVersionPackage,
          localBuilderVersionDialogPackage,
          localPublicOnlyManifestSourcesPackage,
          localCompactCodexComposerNotificationsPackage,
          localEmailReadyHomepagePreviewPackage,
          localBrandedExactClientPreviewPackage,
          localImmediateRehearsalPipelineIsolationPackage,
          localVoiceDictatedCodexChatPackage,
          localResilientCodexRuntimeUpdatesPackage,
          localUniversalBuilderModelSettingsPackage,
          localGuidedClientspaceTestPackage,
          localRehearsalRecipientIsolationPackage,
          localOversizedCodexConversationRecoveryPackage,
          localCompatibleHandoffTimestampPackage,
          localVerifiedPreviewCompletionPackage,
          localAuthenticatedPreviewDeploymentPackage,
          localIsolatedExactPreviewPackage,
          localPublishedRepositoryFallbackPackage,
          localAutomaticRehearsalPreviewPackage,
          localContextualCodexChatTitlesPackage,
          localReliableRehearsalCreationPackage,
          localGuidedClientHandoffPackage,
          localClientspaceRehearsalPackage,
          localFailedChatContinuationPackage,
          localCompatibleCodexFailureDisplayPackage,
          localVisibleCodexFailuresPackage,
          localStableChatReconnectionPackage,
          localCompleteCodexReadPlaybackPackage,
          localRecoveringCodexTranscriptsPackage,
          localUnifiedProposalPackage,
          localImmediateWebsiteCodexOpenPackage,
          localClientPreviewCodexIsolationPackage,
          localAutomaticClientEmailHandoffPackage,
          localResilientWebsiteCodexResumePackage,
          localRecentRequestChatContextPackage,
          localRecoverStaleEmptyCodexChatPackage,
          localExplicitWebsiteEditVersionStatusPackage,
          localConciseCurrentWorkChatTitlesPackage,
          localDurableNewCodexChatPackage,
          localRestorableManagedCodexChatsPackage,
          localReliableNewCodexChatPackage,
          localAstraReadyCodexRuntimePackage,
          localAuthenticatedWebsiteCodexEmbedPackage,
          localOwnerOnlyWebsiteCodexPackage,
          localCodexUpdateCheckerPackage,
          localAutomaticCodexUpdatesPackage,
          localReliableNextWebsitePreviewPackage,
          localPersistentCodexPreferencesPackage,
          localGeneratedNextEnvironmentHygienePackage,
          localConfiguredFinalEditUpstreamPackage,
          localSeamlessStudioResumePackage,
          localContextualQuickQuestionsPackage,
          localCodexConversationStatusIndicatorsPackage,
          localEditorOnlyClientChatScopePackage,
          localUnambiguousWebsiteEditingPackage,
          localExactEditedSiteReleasePackage,
          localResponsiveDevelopmentRuntimePackage,
          localQueueableWorkingCodexMessagesPackage,
          localResumeAwareCodexProgressPackage,
          localReliableCodexEphemeralThreadsPackage,
          localFocusedProspectPreviewModesPackage,
          localResilientDevelopmentStudioRuntimePackage,
          localDedicatedClientWebsiteEditorPackage,
          localReliableCodexStopStatePackage,
          localRevocableReadyClientReviewsPackage,
          localClientUrlReleaseContractPackage,
          localStoppableCodexTurnsPackage,
          localResilientLiveCodexBranchingPackage,
          localDevelopmentReleaseUrlsPackage,
          localConciseCodexReadingPackage,
          localFocusedCodexSettingsPackage,
          localNaturalCodexReadingPackage,
          localLiveWorkspacePhoneNotificationsPackage,
          localLiveWorkspaceCodexBranchingPackage,
          localBranchableCodexConversationsPackage,
          localCodexPhoneNotificationsPackage,
          localSelectedCodexExcerptActionsPackage,
          localPersistentCodexChatSurfacesPackage,
          localRestoredCodexVoiceExperiencePackage,
          localWorkspaceDevelopmentStudioPackage,
          localCanonicalWorkspaceEntryPackage,
          localDeployedStudioShellPackage,
          localOwnerApiCreditsSwitchPackage,
          localExecutableNextWorkspaceRuntimePackage,
          localNextCompatibleWorkspaceRuntimePackage,
          localOpaqueWorkspaceFrameCapabilityPackage,
          localReliableWorkspaceDevelopmentSurfacesPackage,
          localLockedWorkspaceDevDependenciesPackage,
          localLiveCodexLauncherRecoveryPackage,
          localWorkspaceHostedEditorShellPackage,
          localClientScopedCodexChatsPackage,
          localStudioOwnedWorkspaceShellPackage,
          localRenderableRailwayStudioPackage,
          localResilientStudioSessionRecoveryPackage,
          localAuthenticatedGoogleVoiceCataloguePackage,
          localGlobalGoogleVoiceCataloguePackage,
          localLiveEditableStudioRuntimePackage,
          localImageOnlyCodexMessagePackage,
          localDurableCodexChatSessionPackage,
          localSelectableGoogleCodexVoicesPackage,
          localDeletableQueuedCodexMessagesPackage,
          localSeamlessStudioHydrationPackage,
          localReliableFullReplyReadingPackage,
          localEvidenceLinkedCodexActivityPackage,
          localCodexSubscriptionUsagePackage,
          localCodexConversationLoadingPackage,
          localDeviceVoiceReadAloudPackage,
          localObservableCodexActivityPackage,
          localAuthenticatedStudioControlsPackage,
          localRenderableWorkspacePreviewPackage,
          localRestartableWorkspacePreviewPackage,
          localStableWorkspacePreviewPackage,
          localAgentTeamClarityPackage,
          localMessageMotionCodexChatPackage,
          localPrivateWorkspacePreviewAccessPackage,
          localContextualCodexChatPackage,
          localInlineMultiImageCodexChatPackage,
          localAnimatedCodexChatPackage,
          localFastCodexChatPackage,
          localRailwayContainerAccessPackage,
          localRailwayPersistentCheckoutPackage,
          localRailwayWorkspaceWritePackage,
          localPermanentRailwayRuntimePackage,
          localSubscriptionSafeCodexRuntimePackage,
          localUninterruptedCodexRecoveryPackage,
          localTurnScopedAgentTeamsPackage,
          localSpaciousCodexChatPackage,
          localResumableAgentTeamPackage,
          localClientspaceAdminEmailReviewPackage,
          localInboundClientEmailReviewPackage,
          localColdProspectOffersPackage,
          localAgentTeamChatPackage,
          localDurableCodexTurnRecoveryPackage,
          localReliableUnmaterializedChatCleanupPackage,
          localCodexExperimentalWorkspaceCapabilityPackage,
          localDualRepositoryCodexWorkspacePackage,
          localCodespaceInterruptedChatRecoveryPackage,
          localRecentPromptChatTitlesPackage,
          localCameraRollPhotoUploadPackage,
          localSubscriptionBuilderPackage,
          localCompactCodexComposerPackage,
          localMarkdownCodexChatPackage,
          localConcurrentCodexActivityPackage,
          localCodexTranscriptPositionPackage,
          localPublicCodespacePortsPackage,
          localConcurrentCodexChatsPackage,
          localReliableLongPageCapturePackage,
          localExactVisualChatPackage,
          localMobileStudioCapturePackage,
          localExactStudioCapturePackage,
          localReliableCodexNewChatPackage,
          localCodespaceWorkspaceSuitePackage,
          localCodexCapturePreferencesPackage,
          localCodexIdeChatPackage,
          localCodexConversationCapturePackage,
          localCodexChatPackage,
          localVisualCodexFeedbackPackage,
          localReviewedPageDispositionsPackage,
          localEditableHandoffRecoveryPackage,
          localAutomaticProspectDomainPackage,
          localAutomaticClientspacePreviewPackage,
          localCapturedHandoffEmailPackage,
          localCanonicalAssetHandoffPackage,
          localCleanAlternateTestPackage,
          localHandoffWorkerLivenessPackage,
          localOptionalHandoffSchemaPackage,
          localMadeSolidHandoffPackage,
          localAgentStudioTonePackage,
          localAgentLearningInboxPackage,
          localEditVersionHistoryPackage,
          localResilientFinalEditPackage,
          localEditingHandoffPagesPackage,
          localResilientRefinementLedgerPackage,
          localLiveRefinementLedgerPackage,
          localCodespacesPreviewUrlPackage,
          localAutomaticWebsiteLaunchPackage,
          localImmediateSourceWorkspacePackage,
          localOneClickProspectWorkspacePackage,
          localEmbeddedProspectWorkspacePackage,
          localNoninteractiveCodexInstallPackage,
          localWebsiteToneDirectionPackage,
          localVisibleCodespaceSetupPackage,
          localCodespaceResumeStartupPackage,
          localOptionalSvgGenerationPackage,
          localPersistentCodespaceTmuxPackage,
          localBuilderDerivedColoursPackage,
          localCodespaceSetupOrderingPackage,
          localCodespaceStartupReliabilityPackage,
          localLogoAccentRegionsPackage,
          localCodespaceWorkspacePackage,
          localAccentOnlyBrandPackage,
          localRefinementHandoffPackage,
          localViewportChecksOnlyPackage,
          localBoundedBuilderRequestsPackage,
          localActionableBuilderFailurePackage,
          localMobileViewportIntegrityPackage,
          localImmediateNavigationSequencePackage,
          localSettledFactualEvidencePackage,
          localForcedFinalStatePackage,
          localReusableSectionRhythmPackage,
          localDeterministicEvidencePackage,
          localSettledAccessibilityPackage,
          localStableNavigationVisibilityPackage,
          localCheckpointQualityRecheckPackage,
          localReliableCompactNavigationPackage,
          localCompleteCheckpointRestorePackage,
          localSelectedRouteCompilePackage,
          localCreativeAutonomyPackage,
          localDecodedNavigationLogoPackage,
          localEfficientBuilderExecutionPackage,
          localImmediateBrandIntroductionPackage,
          localResponsiveIntroCraftPackage,
          localValidPreviewEntryPackage,
          localPreciseLogoHandoffPackage,
          localCleanTestStartPackage,
          localMeaningfulPageNamesPackage,
          localResilientResumePackage,
          localImmersiveMotionPackage,
          localResilientQualityPackage,
          localExpressivePackage,
          localCreativePackage,
        ].filter((candidate) => !packages.some((agentPackage) => agentPackage.id === candidate.id));
        if (missingPackages.length) {
          await this.put('meta', {
            id: localAgentPackageKey,
            value: JSON.stringify([...missingPackages, ...packages]),
          } satisfies MetaRecord);
        }
      } catch {
        await this.put('meta', {
          id: localAgentPackageKey,
          value: JSON.stringify([
            localReliableAdminWebsitePreviewPackage,
            localRenderedEmailCapturePackage,
            localReliableCodexQueueHandoffPackage,
            localContinuousClientEmailInboxPackage,
            localStillHomepageEmailPackage,
            localCompactInspectPackage,
            localRailwayOnlyProductReleasesPackage,
            localInspectEmailReplyCtaPackage,
            localEvidenceLedHomepagePackage,
            localResponsivePreviewLaunchPackage,
            localSimplifiedWebsiteReviewPackage,
            localExactRedesignComparisonPackage,
            localCompactChatFeatureHistoryPackage,
            localProxySafeLiveComparisonPackage,
            localPolishedWebsiteCodexRecoveryPackage,
            localInteractiveDeviceComparisonPackage,
            localLiveSynchronizedComparisonPackage,
            localReliableComparisonReviewEmailPackage,
            localConciseClientspaceAccessPackage,
            localResponsiveComparisonReviewPackage,
            localPersistentWebsiteCodexPanelPackage,
            localContinuousFeatureReleaseReconciliationPackage,
            localRecoverableWebsiteCodexAccessPackage,
            localCompatibleIntroductionLedgerPackage,
            localResponsiveSplitComparisonEmailPackage,
            localDesktopOnlyComparisonEmailPackage,
            localPasswordlessClientspaceAccessPackage,
            localEmailSafePairedComparisonPackage,
            localPairedDeviceComparisonEmailPackage,
            localInstantCachedCodexAccessPackage,
            localTruthfulLiveCodexProgressPackage,
            localDirectReplyComparisonIntroductionPackage,
            localPrioritisedIntroductionStatusPackage,
            localReconciledIntroductionReceiptPackage,
            localRehearsalIntroductionResetPackage,
            localHeroAnimatedHomepageCapturePackage,
            localLiveAnimatedHomepageCapturePackage,
            localReliableSmoothHomepageCapturePackage,
            localSmoothHomepagePreviewLoopPackage,
            localPersistedAnimatedHomepagePreviewPackage,
            localAnimatedClientspaceHomepagePreviewPackage,
            localAutomaticClientspaceHomepageCapturePackage,
            localClientspaceDevelopmentQuoteReconfirmationPackage,
            localClientspaceQuoteReconfirmationPackage,
            localAccurateFeatureTitlesPackage,
            localUninterruptedStudioChatPackage,
            localAutomaticFeatureDevelopmentReleasePackage,
            localActionableReleasePipelinePackage,
            localMultiFeatureChatLineagePackage,
            localChatFeatureHistoryPackage,
            localReliableFeatureLedgerPackage,
            localLeceEmailAndQuoteRecoveryPackage,
            localProductReleaseOverviewPackage,
            localDurableAiChatTitlesPackage,
            localAiInterpretedChatTitlesPackage,
            localCompactCodexChatChromePackage,
            localManualCodexUpdateRecoveryPackage,
            localFeatureReleaseManagementPackage,
            localPinnedTaggedCodexChatsPackage,
            localPolishedDevicePreviewToolbarPackage,
            localInterpretedChatDropdownTitlesPackage,
            localRecoverableQuoteExpiryPackage,
            localExpandedChatDropdownTitlesPackage,
            localValidatedCodexBranchActionsPackage,
            localRetrospectiveChatContextPackage,
            localContextAwareChatTitlesAndStatesPackage,
            localPurposeAwareCodexBranchingPackage,
            localVisibleChatGptCreditsPackage,
            localReadableAgentStudioRefinementPackage,
            localEditableClientspaceBalancePackage,
            localOwnerDevicePreviewPackage,
            localSettledEmailHomepageCapturePackage,
            localVisibleBuilderModelsPackage,
            localSettledNavigationQualityPackage,
            localCompactPhotoComposerPackage,
            localReliableBuilderRepairPackage,
            localAutomaticBuilderQualityRepairPackage,
            localVisibleBuilderCodexVersionPackage,
            localBuilderVersionDialogPackage,
            localPublicOnlyManifestSourcesPackage,
            localCompactCodexComposerNotificationsPackage,
            localEmailReadyHomepagePreviewPackage,
            localBrandedExactClientPreviewPackage,
            localImmediateRehearsalPipelineIsolationPackage,
            localVoiceDictatedCodexChatPackage,
            localResilientCodexRuntimeUpdatesPackage,
            localUniversalBuilderModelSettingsPackage,
            localGuidedClientspaceTestPackage,
            localRehearsalRecipientIsolationPackage,
            localOversizedCodexConversationRecoveryPackage,
            localCompatibleHandoffTimestampPackage,
            localVerifiedPreviewCompletionPackage,
            localAuthenticatedPreviewDeploymentPackage,
            localIsolatedExactPreviewPackage,
            localPublishedRepositoryFallbackPackage,
            localAutomaticRehearsalPreviewPackage,
            localContextualCodexChatTitlesPackage,
            localReliableRehearsalCreationPackage,
            localGuidedClientHandoffPackage,
            localClientspaceRehearsalPackage,
            localFailedChatContinuationPackage,
            localCompatibleCodexFailureDisplayPackage,
            localVisibleCodexFailuresPackage,
            localStableChatReconnectionPackage,
            localCompleteCodexReadPlaybackPackage,
            localRecoveringCodexTranscriptsPackage,
            localUnifiedProposalPackage,
            localImmediateWebsiteCodexOpenPackage,
            localClientPreviewCodexIsolationPackage,
            localAutomaticClientEmailHandoffPackage,
            localResilientWebsiteCodexResumePackage,
            localRecentRequestChatContextPackage,
            localRecoverStaleEmptyCodexChatPackage,
            localExplicitWebsiteEditVersionStatusPackage,
            localConciseCurrentWorkChatTitlesPackage,
            localDurableNewCodexChatPackage,
            localRestorableManagedCodexChatsPackage,
            localReliableNewCodexChatPackage,
            localAstraReadyCodexRuntimePackage,
            localAuthenticatedWebsiteCodexEmbedPackage,
            localOwnerOnlyWebsiteCodexPackage,
            localCodexUpdateCheckerPackage,
            localAutomaticCodexUpdatesPackage,
            localReliableNextWebsitePreviewPackage,
            localPersistentCodexPreferencesPackage,
            localGeneratedNextEnvironmentHygienePackage,
            localConfiguredFinalEditUpstreamPackage,
            localSeamlessStudioResumePackage,
            localContextualQuickQuestionsPackage,
            localCodexConversationStatusIndicatorsPackage,
            localEditorOnlyClientChatScopePackage,
            localUnambiguousWebsiteEditingPackage,
            localExactEditedSiteReleasePackage,
            localResponsiveDevelopmentRuntimePackage,
            localQueueableWorkingCodexMessagesPackage,
            localResumeAwareCodexProgressPackage,
            localReliableCodexEphemeralThreadsPackage,
            localFocusedProspectPreviewModesPackage,
            localResilientDevelopmentStudioRuntimePackage,
            localDedicatedClientWebsiteEditorPackage,
            localReliableCodexStopStatePackage,
            localRevocableReadyClientReviewsPackage,
            localClientUrlReleaseContractPackage,
            localStoppableCodexTurnsPackage,
            localResilientLiveCodexBranchingPackage,
            localDevelopmentReleaseUrlsPackage,
            localConciseCodexReadingPackage,
            localFocusedCodexSettingsPackage,
            localNaturalCodexReadingPackage,
            localLiveWorkspacePhoneNotificationsPackage,
            localLiveWorkspaceCodexBranchingPackage,
            localBranchableCodexConversationsPackage,
            localCodexPhoneNotificationsPackage,
            localSelectedCodexExcerptActionsPackage,
            localPersistentCodexChatSurfacesPackage,
            localRestoredCodexVoiceExperiencePackage,
            localWorkspaceDevelopmentStudioPackage,
            localCanonicalWorkspaceEntryPackage,
            localDeployedStudioShellPackage,
            localOwnerApiCreditsSwitchPackage,
            localExecutableNextWorkspaceRuntimePackage,
            localNextCompatibleWorkspaceRuntimePackage,
            localOpaqueWorkspaceFrameCapabilityPackage,
            localReliableWorkspaceDevelopmentSurfacesPackage,
            localLockedWorkspaceDevDependenciesPackage,
            localLiveCodexLauncherRecoveryPackage,
            localWorkspaceHostedEditorShellPackage,
            localClientScopedCodexChatsPackage,
            localStudioOwnedWorkspaceShellPackage,
            localRenderableRailwayStudioPackage,
            localResilientStudioSessionRecoveryPackage,
            localAuthenticatedGoogleVoiceCataloguePackage,
            localGlobalGoogleVoiceCataloguePackage,
            localLiveEditableStudioRuntimePackage,
            localImageOnlyCodexMessagePackage,
            localDurableCodexChatSessionPackage,
            localSelectableGoogleCodexVoicesPackage,
            localDeletableQueuedCodexMessagesPackage,
            localSeamlessStudioHydrationPackage,
            localReliableFullReplyReadingPackage,
            localEvidenceLinkedCodexActivityPackage,
            localCodexSubscriptionUsagePackage,
            localCodexConversationLoadingPackage,
            localDeviceVoiceReadAloudPackage,
            localObservableCodexActivityPackage,
            localAuthenticatedStudioControlsPackage,
            localRenderableWorkspacePreviewPackage,
            localRestartableWorkspacePreviewPackage,
            localStableWorkspacePreviewPackage,
            localAgentTeamClarityPackage,
            localMessageMotionCodexChatPackage,
            localPrivateWorkspacePreviewAccessPackage,
            localContextualCodexChatPackage,
            localInlineMultiImageCodexChatPackage,
            localAnimatedCodexChatPackage,
            localFastCodexChatPackage,
            localRailwayContainerAccessPackage,
            localRailwayPersistentCheckoutPackage,
            localRailwayWorkspaceWritePackage,
            localPermanentRailwayRuntimePackage,
            localSubscriptionSafeCodexRuntimePackage,
            localUninterruptedCodexRecoveryPackage,
            localTurnScopedAgentTeamsPackage,
            localSpaciousCodexChatPackage,
            localResumableAgentTeamPackage,
            localClientspaceAdminEmailReviewPackage,
            localInboundClientEmailReviewPackage,
            localColdProspectOffersPackage,
            localAgentTeamChatPackage,
            localDurableCodexTurnRecoveryPackage,
            localReliableUnmaterializedChatCleanupPackage,
            localCodexExperimentalWorkspaceCapabilityPackage,
            localDualRepositoryCodexWorkspacePackage,
            localCodespaceInterruptedChatRecoveryPackage,
            localRecentPromptChatTitlesPackage,
            localCameraRollPhotoUploadPackage,
            localSubscriptionBuilderPackage,
            localCompactCodexComposerPackage,
            localMarkdownCodexChatPackage,
            localConcurrentCodexActivityPackage,
            localCodexTranscriptPositionPackage,
            localPublicCodespacePortsPackage,
            localConcurrentCodexChatsPackage,
            localReliableLongPageCapturePackage,
            localExactVisualChatPackage,
            localMobileStudioCapturePackage,
            localExactStudioCapturePackage,
            localReliableCodexNewChatPackage,
            localCodespaceWorkspaceSuitePackage,
            localCodexCapturePreferencesPackage,
            localCodexIdeChatPackage,
            localCodexConversationCapturePackage,
            localCodexChatPackage,
            localVisualCodexFeedbackPackage,
            localReviewedPageDispositionsPackage,
            localEditableHandoffRecoveryPackage,
            localAutomaticProspectDomainPackage,
            localAutomaticClientspacePreviewPackage,
            localCapturedHandoffEmailPackage,
            localCanonicalAssetHandoffPackage,
            localCleanAlternateTestPackage,
            localHandoffWorkerLivenessPackage,
            localOptionalHandoffSchemaPackage,
            localMadeSolidHandoffPackage,
            localAgentStudioTonePackage,
            localAgentLearningInboxPackage,
            localEditVersionHistoryPackage,
            localResilientFinalEditPackage,
            localEditingHandoffPagesPackage,
            localResilientRefinementLedgerPackage,
            localLiveRefinementLedgerPackage,
            localCodespacesPreviewUrlPackage,
            localAutomaticWebsiteLaunchPackage,
            localImmediateSourceWorkspacePackage,
            localOneClickProspectWorkspacePackage,
            localEmbeddedProspectWorkspacePackage,
            localNoninteractiveCodexInstallPackage,
            localWebsiteToneDirectionPackage,
            localVisibleCodespaceSetupPackage,
            localCodespaceResumeStartupPackage,
            localOptionalSvgGenerationPackage,
            localPersistentCodespaceTmuxPackage,
            localBuilderDerivedColoursPackage,
            localCodespaceSetupOrderingPackage,
            localCodespaceStartupReliabilityPackage,
            localLogoAccentRegionsPackage,
            localCodespaceWorkspacePackage,
            localAccentOnlyBrandPackage,
            localRefinementHandoffPackage,
            localViewportChecksOnlyPackage,
            localBoundedBuilderRequestsPackage,
            localActionableBuilderFailurePackage,
            localMobileViewportIntegrityPackage,
            localImmediateNavigationSequencePackage,
            localSettledFactualEvidencePackage,
            localForcedFinalStatePackage,
            localReusableSectionRhythmPackage,
            localDeterministicEvidencePackage,
            localSettledAccessibilityPackage,
            localStableNavigationVisibilityPackage,
            localCheckpointQualityRecheckPackage,
            localReliableCompactNavigationPackage,
            localCompleteCheckpointRestorePackage,
            localSelectedRouteCompilePackage,
            localCreativeAutonomyPackage,
            localDecodedNavigationLogoPackage,
            localEfficientBuilderExecutionPackage,
            localImmediateBrandIntroductionPackage,
            localResponsiveIntroCraftPackage,
            localValidPreviewEntryPackage,
            localPreciseLogoHandoffPackage,
            localCleanTestStartPackage,
            localMeaningfulPageNamesPackage,
            localResilientResumePackage,
            localImmersiveMotionPackage,
            localResilientQualityPackage,
            localExpressivePackage,
            localCreativePackage,
            localPublishedPackage,
          ]),
        } satisfies MetaRecord);
      }
    }
  }

  async listAgentPackages() {
    const packageRecord = await this.get<MetaRecord>('meta', localAgentPackageKey);
    if (!packageRecord) return [];
    try {
      const parsed = JSON.parse(packageRecord.value) as AgentPackage | AgentPackage[];
      const packages = Array.isArray(parsed) ? parsed : parsed?.id ? [parsed] : [];
      return packages
        .filter((agentPackage) => Boolean(agentPackage?.id))
        .map((agentPackage) => {
          const version = Number(agentPackage.version);
          return {
            ...agentPackage,
            version: Number.isFinite(version) ? version : 0,
            builderContractVersion: `made-solid-studio-builder-agent-v${
              Number.isFinite(version) ? version.toFixed(1) : '0.0'
            }`,
          };
        });
    } catch {
      return [];
    }
  }

  async listAgentPackageProposals(): Promise<AgentPackageProposal[]> {
    return [];
  }

  async requestAgentPackageProposal(): Promise<AgentPackageProposal | undefined> {
    throw new Error('Agent package proposals require the protected Supabase refinement worker.');
  }

  async approveAgentPackageForTesting(): Promise<AgentPackage | undefined> {
    throw new Error('Agent package approval requires the protected Supabase refinement worker.');
  }

  async approveAgentPackageForProduction(): Promise<AgentPackage | undefined> {
    throw new Error('Agent package approval requires the protected Supabase refinement worker.');
  }

  async stageAgentPackageBehaviours(): Promise<AgentPackage | undefined> {
    throw new Error('Behaviour staging requires the protected Supabase refinement worker.');
  }

  async promoteAgentPackage(): Promise<AgentPackage | undefined> {
    throw new Error('Agent package promotion requires the protected Supabase refinement worker.');
  }

  private async migrateLegacyRecords() {
    try {
      const raw = window.localStorage.getItem(legacyStorageKey);
      const records = raw
        ? (JSON.parse(raw) as Array<{ businessName?: string; websiteUrl?: string }>)
        : [];
      for (const record of records) {
        if (record.websiteUrl) {
          await this.createProspect(record.websiteUrl, record.businessName);
        }
      }
    } catch {
      // Legacy browser data remains untouched when it cannot be safely interpreted.
    }
  }

  private async seedDemoWorkspace() {
    const now = new Date().toISOString();
    const businessId = 'business-demo-local-services';
    const websiteId = 'website-demo-local-services';

    const business: Business = {
      id: businessId,
      kind: 'prospect',
      name: 'Demo Local Services',
      stage: 'researching',
      reviewState: 'needs_review',
      opportunityScore: 61,
      createdAt: now,
      updatedAt: now,
    };
    const website: Website = {
      id: websiteId,
      businessId,
      url: 'https://demo-local-services.example',
      domain: 'demo-local-services.example',
      crawlStatus: 'not_requested',
      createdAt: now,
      updatedAt: now,
    };
    const audit: Audit = {
      id: 'audit-demo-local-services',
      businessId,
      status: 'research_pending',
      findings: [],
      totalItems: 0,
      completedItems: 0,
      createdAt: now,
      updatedAt: now,
    };
    const concept: RedesignConcept = {
      id: 'concept-demo-local-services',
      businessId,
      status: 'not_started',
      version: 1,
      summary: 'A concept is created only after research evidence has been reviewed.',
      createdAt: now,
      updatedAt: now,
    };
    const report: DecisionReport = {
      id: 'report-demo-local-services',
      businessId,
      status: 'not_started',
      version: 1,
      summary:
        'A client-facing report is created only from approved evidence and design decisions.',
      createdAt: now,
      updatedAt: now,
    };
    const task: Task = {
      id: 'task-demo-verify',
      businessId,
      body: 'Verify business identity, services, and contact details.',
      state: 'open',
      createdAt: now,
      updatedAt: now,
    };
    const activity: Activity = {
      id: 'activity-demo-created',
      businessId,
      type: 'created',
      message: 'Demo prospect workspace created. Research has not run.',
      createdAt: now,
    };

    await this.putMany([
      ['businesses', business],
      ['websites', website],
      ['audits', audit],
      ['concepts', concept],
      ['reports', report],
      ['tasks', task],
      ['activities', activity],
    ]);
  }

  async listBusinesses() {
    return (await this.getAll<Business>('businesses')).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async getWorkspace(businessId: string): Promise<ProspectWorkspace | undefined> {
    const business = await this.get<Business>('businesses', businessId);
    if (!business) return undefined;

    const [
      websites,
      contacts,
      facts,
      captures,
      pages,
      artifacts,
      audits,
      auditSpecialistTasks,
      auditObservations,
      briefs,
      buildManifests,
      builderRuns,
      concepts,
      reports,
      reportVersions,
      sourceReleaseAttestations,
      tasks,
      activity,
      outreachCompliance,
    ] = await Promise.all([
      this.getAllForBusiness<Website>('websites', businessId),
      this.getAllForBusiness<Contact>('contacts', businessId),
      this.getAllForBusiness<EvidenceFact>('facts', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
      this.getAllForBusiness<CapturedPage>('crawlPages', businessId),
      this.getAllForBusiness<ResearchArtifact>('artifacts', businessId),
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<AuditSpecialistTask>('auditSpecialistTasks', businessId),
      this.getAllForBusiness<AuditObservation>('auditObservations', businessId),
      this.getAllForBusiness<RedesignBrief>('briefs', businessId),
      this.getAllForBusiness<BuildManifest>('buildManifests', businessId),
      this.getAllForBusiness<BuilderRun>('builderRuns', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
      this.getAllForBusiness<DecisionReport>('reports', businessId),
      this.getAllForBusiness<DecisionReport>('reportVersions', businessId),
      this.getAllForBusiness<SourceReleaseAttestation>('sourceReleaseAttestations', businessId),
      this.getAllForBusiness<Task>('tasks', businessId),
      this.getAllForBusiness<Activity>('activities', businessId),
      this.getAllForBusiness<OutreachCompliance>('outreachCompliance', businessId),
    ]);

    const orderedCaptures = captures.sort((left, right) =>
      right.requestedAt.localeCompare(left.requestedAt),
    );
    const latestCapture = orderedCaptures[0];
    const previousCapture =
      latestCapture?.status === 'failed'
        ? orderedCaptures.find(
            (capture) => capture.id !== latestCapture.id && capture.status === 'ready',
          )
        : undefined;
    const currentAudit = audits.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )[0];
    const orderedReportVersions = reportVersions.sort(
      (left, right) => right.version - left.version,
    );

    return {
      business,
      website: websites[0],
      captures: orderedCaptures,
      contacts,
      outreachCompliance: outreachCompliance[0],
      facts:
        latestCapture?.status === 'ready'
          ? facts.filter((fact) => fact.crawlRunId === latestCapture.id)
          : [],
      latestCapture,
      capturedPages: latestCapture
        ? pages.filter((page) => page.crawlRunId === latestCapture.id)
        : [],
      artifacts: latestCapture
        ? artifacts.filter((artifact) => artifact.crawlRunId === latestCapture.id)
        : [],
      assetAnnotations: [],
      assetAnalysisJobs: [],
      visualContentCandidates: [],
      visualContentJob: undefined,
      brandColourEvidence: [],
      previousCapture,
      previousFacts: previousCapture
        ? facts.filter((fact) => fact.crawlRunId === previousCapture.id)
        : [],
      previousArtifacts: previousCapture
        ? artifacts.filter((artifact) => artifact.crawlRunId === previousCapture.id)
        : [],
      audit: currentAudit,
      auditSpecialistTasks: auditSpecialistTasks.filter(
        (task) => task.auditId === currentAudit?.id,
      ),
      auditObservations: auditObservations.filter(
        (observation) => observation.auditId === currentAudit?.id,
      ),
      redesignBrief: briefs.sort((left, right) => right.version - left.version)[0],
      redesignBriefs: briefs.sort((left, right) => right.version - left.version),
      buildManifest: buildManifests.sort((left, right) =>
        right.generatedAt.localeCompare(left.generatedAt),
      )[0],
      buildManifests: buildManifests.sort((left, right) =>
        right.generatedAt.localeCompare(left.generatedAt),
      ),
      builderArtifacts: [],
      builderEvents: [],
      clientPreviewPublications: [],
      madeSolidHandoffs: [],
      madeSolidHandoffWorkerAvailable: false,
      githubWorkspacePublications: [],
      githubWorkspaceWorkerAvailable: false,
      latestBuilderRun: builderRuns.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )[0],
      builderRuns: builderRuns.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      aiUsageRecords: [],
      concept: concepts[0],
      report: orderedReportVersions[0] ?? reports[0],
      reportVersions: orderedReportVersions,
      sourceReleaseAttestations: sourceReleaseAttestations.sort((left, right) =>
        right.verifiedAt.localeCompare(left.verifiedAt),
      ),
      sourceReleaseAttestationAvailability: 'available',
      reportGenerationJobs: [],
      reportGenerationWorkerAvailable: false,
      reportPreviewJobs: [],
      reportPreviewWorkerAvailable: false,
      tasks: tasks.sort((left, right) => left.state.localeCompare(right.state)),
      activity: activity.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    };
  }

  async listWorkspaces() {
    const businesses = await this.listBusinesses();
    const workspaces = await Promise.all(
      businesses.map((business) => this.getWorkspace(business.id)),
    );
    return workspaces.filter((workspace): workspace is ProspectWorkspace => Boolean(workspace));
  }

  async getBuilderRunEvidence(): Promise<BuilderRunEvidence> {
    // Local mode cannot create protected builder output, so there is no history to retrieve.
    return { artifacts: [], events: [] };
  }

  async createProspect(rawUrl: string, providedName?: string) {
    const now = new Date().toISOString();
    const domain = domainFromUrl(rawUrl);
    const canonicalUrl = canonicalWebsiteUrl(rawUrl);
    const existingWebsites = await this.getAll<Website>('websites');
    if (existingWebsites.some((website) => canonicalWebsiteUrl(website.url) === canonicalUrl)) {
      throw new Error('You already have this website as a prospect.');
    }
    const businessId = id('business');
    const websiteUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const business: Business = {
      id: businessId,
      kind: 'prospect',
      name: providedName?.trim() || displayName(domain) || domain,
      stage: 'researching',
      reviewState: 'needs_review',
      createdAt: now,
      updatedAt: now,
    };
    const website: Website = {
      id: id('website'),
      businessId,
      url: websiteUrl,
      domain,
      crawlStatus: 'not_requested',
      createdAt: now,
      updatedAt: now,
    };
    const audit: Audit = {
      id: id('audit'),
      businessId,
      status: 'research_pending',
      findings: [],
      totalItems: 0,
      completedItems: 0,
      createdAt: now,
      updatedAt: now,
    };
    const concept: RedesignConcept = {
      id: id('concept'),
      businessId,
      status: 'not_started',
      version: 1,
      summary: 'Awaiting verified research before a redesign concept can be drafted.',
      createdAt: now,
      updatedAt: now,
    };
    const report: DecisionReport = {
      id: id('report'),
      businessId,
      status: 'not_started',
      version: 1,
      summary: 'Awaiting approved evidence and design decisions.',
      createdAt: now,
      updatedAt: now,
    };
    const tasks: Task[] = [
      {
        id: id('task'),
        businessId,
        body: 'Verify business identity, services, and contact details.',
        state: 'open',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: id('task'),
        businessId,
        body: 'Run research and capture evidence before approving any claims.',
        state: 'open',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const activity: Activity = {
      id: id('activity'),
      businessId,
      type: 'research_requested',
      message: `Prospect created from ${domain}. Research is awaiting a crawler connection.`,
      createdAt: now,
    };

    await this.putMany([
      ['businesses', business],
      ['websites', website],
      ['audits', audit],
      ['concepts', concept],
      ['reports', report],
      ...tasks.map((task) => ['tasks', task] as [StoreName, Task]),
      ['activities', activity],
    ]);
    await this.requestResearchCapture(businessId);
    return this.getWorkspace(businessId);
  }

  async requestResearchCapture(businessId: string) {
    const [business, websites, captures] = await Promise.all([
      this.get<Business>('businesses', businessId),
      this.getAllForBusiness<Website>('websites', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
    ]);
    const website = websites[0];
    if (!business || !website) throw new Error('A website is required before research can begin.');

    const activeCapture = captures
      .filter((capture) => capture.status === 'queued' || capture.status === 'running')
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (activeCapture) return activeCapture;

    const now = new Date().toISOString();
    const capture: ResearchCapture = {
      id: id('crawl'),
      businessId,
      websiteId: website.id,
      targetUrl: website.url,
      scope: 'all_pages',
      status: 'queued',
      requestedAt: now,
      discoveredPageCount: 0,
      capturedPageCount: 0,
      failedPageCount: 0,
      progressPhase: 'queued',
      progressDetail: 'Waiting for the protected worker to begin.',
    };
    const activity: Activity = {
      id: id('activity'),
      businessId,
      type: 'research_requested',
      message:
        'Website capture requested. Discoverable public pages will remain private until a worker completes it.',
      createdAt: now,
    };
    await this.putMany([
      ['crawlRuns', capture],
      ['websites', { ...website, crawlStatus: 'queued', updatedAt: now }],
      ['businesses', { ...business, updatedAt: now }],
      ['activities', activity],
    ]);
    return capture;
  }

  async continueResearchCapture(businessId: string) {
    const captures = await this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId);
    const capture = captures
      .filter((candidate) => candidate.status === 'failed' && !candidate.cancelRequestedAt)
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (!capture) throw new Error('There is no failed website capture to continue.');
    const now = new Date().toISOString();
    const continued = {
      ...capture,
      status: 'queued',
      requestedAt: now,
      startedAt: undefined,
      completedAt: undefined,
      errorSummary: undefined,
      failurePhase: undefined,
      failureUrl: undefined,
      failureDetail: undefined,
      progressPhase: 'queued',
      progressDetail: 'Continuation requested. The worker will retry the incomplete capture step.',
      currentUrl: capture.failureUrl ?? capture.currentUrl ?? capture.targetUrl,
    } satisfies ResearchCapture;
    await this.put('crawlRuns', continued);
    return continued;
  }

  async cancelResearchCapture(businessId: string) {
    const [website, captures] = await Promise.all([
      this.getAllForBusiness<Website>('websites', businessId).then((websites) => websites[0]),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
    ]);
    const capture = captures
      .filter((candidate) => candidate.status === 'queued' || candidate.status === 'running')
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (!capture) throw new Error('There is no active website capture to cancel.');
    const now = new Date().toISOString();
    await this.put('crawlRuns', {
      ...capture,
      status: 'cancelled',
      cancelRequestedAt: now,
      completedAt: now,
      progressPhase: 'cancelled',
      progressDetail: 'Capture cancelled before a protected worker completed it.',
      errorSummary: 'Capture cancelled by a workspace user.',
    } satisfies ResearchCapture);
    if (website) {
      await this.put('websites', { ...website, crawlStatus: 'not_requested', updatedAt: now });
    }
    await this.put('activities', {
      id: id('activity'),
      businessId,
      type: 'note',
      message: 'Website capture cancelled in local mode.',
      createdAt: now,
    } satisfies Activity);
  }

  async requestWebsiteAudit(businessId: string) {
    const [business, audits, captures] = await Promise.all([
      this.get<Business>('businesses', businessId),
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
    ]);
    const completedCapture = captures
      .filter((capture) => capture.status === 'ready')
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (!business || !completedCapture) {
      throw new Error('A completed website capture is required before an audit can be generated.');
    }
    const activeAudit = audits
      .filter(
        (audit) =>
          audit.crawlRunId === completedCapture.id &&
          (audit.status === 'research_pending' || audit.status === 'running'),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (activeAudit) return activeAudit;
    const now = new Date().toISOString();
    const audit: Audit = {
      id: id('audit'),
      businessId,
      version: Math.max(0, ...audits.map((candidate) => candidate.version ?? 0)) + 1,
      crawlRunId: completedCapture.id,
      status: 'research_pending',
      findings: [],
      progressPhase: 'queued',
      progressDetail: 'Six specialist sections are waiting for the protected audit workers.',
      totalItems: 6,
      completedItems: 0,
      createdAt: now,
      updatedAt: now,
    };
    const specialistKinds: AuditSpecialistTask['specialistKind'][] = [
      'responsive_ui',
      'accessibility',
      'performance_engineering',
      'technical_seo',
      'conversion_journey',
      'platform_integrations',
    ];
    const specialistTasks: AuditSpecialistTask[] = specialistKinds.map((specialistKind) => ({
      id: id('audit-specialist-task'),
      businessId,
      auditId: audit.id,
      crawlRunId: completedCapture.id,
      specialistKind,
      status: 'research_pending',
      progressPhase: 'queued',
      progressDetail: 'Waiting for the protected specialist worker.',
      totalItems: 0,
      completedItems: 0,
      createdAt: now,
      updatedAt: now,
    }));
    await this.putMany([
      ['audits', audit],
      ...specialistTasks.map(
        (task) => ['auditSpecialistTasks', task] as [StoreName, AuditSpecialistTask],
      ),
      [
        'activities',
        {
          id: id('activity'),
          businessId,
          type: 'note',
          message:
            'Audit requested in local mode. Connect the protected audit worker to generate findings from saved evidence.',
          createdAt: now,
        } satisfies Activity,
      ],
    ]);
    return audit;
  }

  async cancelWebsiteAudit(businessId: string) {
    const audits = await this.getAllForBusiness<Audit>('audits', businessId);
    const audit = audits.find(
      (candidate) => candidate.status === 'research_pending' || candidate.status === 'running',
    );
    if (!audit) throw new Error('There is no active website audit to cancel.');
    await this.put('audits', {
      ...audit,
      status: 'cancelled',
      cancelRequestedAt: new Date().toISOString(),
      progressPhase: 'cancelled',
      progressDetail: 'Audit cancelled in local mode.',
    });
    const specialistTasks = await this.getAllForBusiness<AuditSpecialistTask>(
      'auditSpecialistTasks',
      businessId,
    );
    await Promise.all(
      specialistTasks
        .filter((task) => task.auditId === audit.id)
        .map((task) =>
          this.put('auditSpecialistTasks', {
            ...task,
            status: 'cancelled',
            cancelRequestedAt: new Date().toISOString(),
            progressPhase: 'cancelled',
            progressDetail: 'Audit cancelled in local mode.',
          }),
        ),
    );
  }

  async retryAuditSpecialist(taskId: string) {
    const task = await this.get<AuditSpecialistTask>('auditSpecialistTasks', taskId);
    if (!task || task.status !== 'failed') {
      throw new Error('Only a failed specialist section can be retried.');
    }
    const now = new Date().toISOString();
    await this.put('auditSpecialistTasks', {
      ...task,
      status: 'research_pending',
      progressPhase: 'retry_queued',
      progressDetail: 'Retry requested. Only this specialist section will run again.',
      totalItems: 0,
      completedItems: 0,
      errorSummary: undefined,
      errorCode: undefined,
      retryable: undefined,
      recoveryAction: undefined,
      attemptCount: 0,
      updatedAt: now,
    });
    const audit = await this.get<Audit>('audits', task.auditId);
    if (audit) {
      await this.put('audits', {
        ...audit,
        status: 'running',
        progressPhase: 'specialist_analysis',
        progressDetail: `Retrying ${task.specialistKind.replaceAll('_', ' ')}. Completed specialist results are retained.`,
        errorSummary: undefined,
        updatedAt: now,
      });
    }
  }

  async updateAuditFinding(
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) {
    const audits = await this.getAll<Audit>('audits');
    const audit = audits.find((candidate) =>
      candidate.findings.some((candidateFinding) => candidateFinding.id === finding.id),
    );
    if (!audit) throw new Error('The audit finding could not be found.');
    const now = new Date().toISOString();
    await this.put('audits', {
      ...audit,
      findings: audit.findings.map((candidate) =>
        candidate.id === finding.id ? { ...candidate, ...patch } : candidate,
      ),
      updatedAt: now,
    });
  }

  async updateAuditObservation(
    observationId: string,
    reviewState: AuditObservation['reviewState'],
  ) {
    const observation = await this.get<AuditObservation>('auditObservations', observationId);
    if (!observation) throw new Error('The specialist observation could not be found.');
    await this.put('auditObservations', {
      ...observation,
      reviewState,
      updatedAt: new Date().toISOString(),
    });
  }

  async createDecisionReport(businessId: string, auditId: string): Promise<void> {
    const [
      business,
      audits,
      captures,
      specialistTasks,
      observations,
      facts,
      artifacts,
      buildManifests,
      builderRuns,
      releaseAttestations,
      reportVersions,
    ] = await Promise.all([
      this.get<Business>('businesses', businessId),
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
      this.getAllForBusiness<AuditSpecialistTask>('auditSpecialistTasks', businessId),
      this.getAllForBusiness<AuditObservation>('auditObservations', businessId),
      this.getAllForBusiness<EvidenceFact>('facts', businessId),
      this.getAllForBusiness<ResearchArtifact>('artifacts', businessId),
      this.getAllForBusiness<BuildManifest>('buildManifests', businessId),
      this.getAllForBusiness<BuilderRun>('builderRuns', businessId),
      this.getAllForBusiness<SourceReleaseAttestation>('sourceReleaseAttestations', businessId),
      this.getAllForBusiness<DecisionReport>('reportVersions', businessId),
    ]);
    const audit = audits.find((candidate) => candidate.id === auditId);
    if (!business || !audit || audit.status !== 'ready' || !audit.crawlRunId) {
      throw new Error('A completed specialist audit is required.');
    }
    const latestCapture = captures
      .filter((capture) => capture.status === 'ready')
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (!latestCapture || latestCapture.id !== audit.crawlRunId) {
      throw new Error('The specialist audit must reference the latest completed website capture.');
    }
    const release = releaseAttestations
      .filter(
        (candidate) =>
          /^[a-f0-9]{40}$/.test(candidate.sourceCommit) &&
          candidate.sourceEditVersion > 0 &&
          candidate.checks.length > 0 &&
          candidate.checks.every((check) => check.status === 'passed'),
      )
      .sort((left, right) => right.verifiedAt.localeCompare(left.verifiedAt))[0];
    if (!release) {
      throw new Error('Verify the exact current edited website before creating its value report.');
    }
    const sourceBuilder = builderRuns.find(
      (run) =>
        run.id === release.sourceBuilderRunId &&
        run.buildManifestId === release.sourceManifestId &&
        run.buildMode === 'full_site',
    );
    const sourceManifest = buildManifests.find(
      (manifest) => manifest.id === release.sourceManifestId && manifest.businessId === businessId,
    );
    if (!sourceBuilder || !sourceManifest) {
      throw new Error(
        'The verified edited website does not have complete full-site build lineage.',
      );
    }
    const reportTasks = specialistTasks.filter((task) => task.auditId === audit.id);
    if (
      reportTasks.length !== 6 ||
      reportTasks.some((task) => task.status !== 'ready' || task.crawlRunId !== audit.crawlRunId)
    ) {
      throw new Error(
        'All six required specialist sections must complete against the report capture.',
      );
    }
    const existing = reportVersions
      .filter(
        (report) =>
          report.auditId === audit.id &&
          report.crawlRunId === audit.crawlRunId &&
          report.schemaVersion === 8 &&
          report.data?.generatorRevision === 'verified-ready-design-comparison-v2' &&
          report.data?.reportKind === 'verified_redesign_value' &&
          (report.data?.redesign as Record<string, unknown> | undefined)?.attestationRowId ===
            release.id,
      )
      .sort((left, right) => right.version - left.version)[0];
    if (existing) return;

    const taskIds = new Set(reportTasks.map((task) => task.id));
    const evidenceFactIds = new Set(
      facts.filter((fact) => fact.crawlRunId === audit.crawlRunId).map((fact) => fact.id),
    );
    const evidenceArtifacts = artifacts.filter(
      (artifact) => artifact.crawlRunId === audit.crawlRunId,
    );
    const evidenceArtifactIds = new Set(evidenceArtifacts.map((artifact) => artifact.id));
    const eligible = observations.filter(
      (observation) =>
        observation.auditId === audit.id &&
        observation.crawlRunId === audit.crawlRunId &&
        observation.area !== 'Platform' &&
        observation.severity === 'high' &&
        observation.confidence !== 'low' &&
        observation.reviewState !== 'blocked' &&
        Boolean(observation.observation.trim()) &&
        Boolean(observation.recommendation.trim()) &&
        Boolean(observation.customerImpact.trim()) &&
        taskIds.has(observation.specialistTaskId) &&
        (observation.evidenceFactIds.some((factId) => evidenceFactIds.has(factId)) ||
          observation.evidenceArtifactIds.some((artifactId) =>
            evidenceArtifactIds.has(artifactId),
          )),
    );
    if (eligible.length === 0) {
      throw new Error(
        'The current audit has no evidence-backed, client-safe observations to report.',
      );
    }

    const severityRank = { high: 1, medium: 2, low: 3 } as const;
    const priorityScore = (observation: AuditObservation) => {
      const score = observation.measurement.priorityScore;
      return typeof score === 'number' && Number.isFinite(score) ? score : 0;
    };
    const ordered = [...eligible].sort(
      (left, right) =>
        severityRank[left.severity] - severityRank[right.severity] ||
        priorityScore(right) - priorityScore(left) ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
    const clientTheme = (area: AuditObservation['area']) =>
      area === 'Content' || area === 'SEO' || area === 'Trust'
        ? 'understand'
        : area === 'UX' || area === 'Conversion'
          ? 'enquire'
          : 'impression';
    const credibleScreenshot = (observation: AuditObservation) => {
      const viewport = observation.viewport;
      if (!viewport) return undefined;
      return evidenceArtifacts
        .filter((artifact) => {
          if (
            artifact.kind !== 'screenshot' ||
            !observation.evidenceArtifactIds.includes(artifact.id)
          ) {
            return false;
          }
          const sourceUrl =
            typeof artifact.metadata.sourceUrl === 'string' ? artifact.metadata.sourceUrl : '';
          const artifactViewport =
            artifact.metadata.viewport && typeof artifact.metadata.viewport === 'object'
              ? (artifact.metadata.viewport as Record<string, unknown>)
              : {};
          return (
            Boolean(sourceUrl) &&
            observation.sourceUrls.includes(sourceUrl) &&
            artifactViewport.width === viewport.width &&
            artifactViewport.height === viewport.height
          );
        })
        .sort(
          (left, right) =>
            left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
        )[0];
    };
    const screenshotBacked = ordered
      .map((observation) => ({ observation, evidence: credibleScreenshot(observation) }))
      .filter((item): item is { observation: AuditObservation; evidence: ResearchArtifact } =>
        Boolean(item.evidence),
      );
    const clientGroups = new Map<string, typeof screenshotBacked>();
    screenshotBacked.forEach((item) => {
      const key = clientTheme(item.observation.area);
      clientGroups.set(key, [...(clientGroups.get(key) ?? []), item]);
    });
    const groups = [...clientGroups.entries()]
      .sort(
        ([leftArea, left], [rightArea, right]) =>
          severityRank[left[0].observation.severity] -
            severityRank[right[0].observation.severity] ||
          right.length - left.length ||
          leftArea.localeCompare(rightArea),
      )
      .slice(0, 3);
    if (groups.length === 0) {
      throw new Error(
        'The current audit has no observations with an exact old-site screenshot, source URL and viewport match.',
      );
    }
    const clientLanguage = {
      impression: {
        area: 'First impression',
        title: 'Make a stronger first impression',
        before:
          'Important information on the existing website can be difficult to take in on the screen shown below.',
        value:
          'A clearer first impression helps visitors feel confident that they have found the right business.',
        whatToNotice: 'Notice how the page makes key information harder to scan at a glance.',
        designPriority:
          'Keep essential messages and contact details clear and readable across screen sizes.',
      },
      understand: {
        area: 'Clarity',
        title: `Help customers understand ${business.name} faster`,
        before:
          'The existing website does not always make the business, its services and the next useful detail immediately clear.',
        value:
          'Clearer information helps suitable customers recognise the value of the business sooner.',
        whatToNotice: 'Notice how much work a visitor must do to understand the important message.',
        designPriority:
          'Organise services and supporting information so visitors can understand the offer sooner.',
      },
      enquire: {
        area: 'Enquiries',
        title: 'Make it easier to take the next step',
        before:
          'The existing journey can make it harder than necessary for an interested visitor to know what to do next.',
        value:
          'A direct path to contact reduces friction between customer interest and a genuine enquiry.',
        whatToNotice:
          'Notice whether the next action is obvious without searching around the page.',
        designPriority:
          'Keep the next action visible and reduce the steps between customer interest and contact.',
      },
    } as const;
    const valueThemes = groups.flatMap(([clientArea, items], index) => {
      const evidence = items[0].evidence;
      const afterEvidence = evidenceArtifacts.find((artifact) => {
        const viewport = artifact.metadata.viewport as Record<string, unknown> | undefined;
        const oldViewport = evidence.metadata.viewport as Record<string, unknown> | undefined;
        return (
          artifact.kind === 'screenshot' &&
          artifact.metadata.evidenceKind === 'edited-site-comparison' &&
          artifact.metadata.captureContract === 'verified-comparison-page-ready-v1' &&
          artifact.metadata.captureStatus === 'passed' &&
          artifact.metadata.pageReady === true &&
          artifact.metadata.loaderVisible === false &&
          Number(artifact.metadata.horizontalOverflowPx ?? 0) <= 1 &&
          artifact.metadata.releaseAttestationId === release.id &&
          artifact.metadata.sourceUrl === evidence.metadata.sourceUrl &&
          viewport?.width === oldViewport?.width &&
          viewport?.height === oldViewport?.height
        );
      });
      if (!afterEvidence) return [];
      const afterViewport = (afterEvidence.metadata.viewport ?? {}) as Record<string, unknown>;
      const copy = clientLanguage[clientArea as keyof typeof clientLanguage];
      const sourceUrls = [evidence.metadata.sourceUrl as string];
      const artifactIds = [
        ...new Set(
          items
            .flatMap((item) => item.observation.evidenceArtifactIds)
            .filter((id) => evidenceArtifactIds.has(id)),
        ),
      ].sort();
      const comparison = {
        impression: {
          whatChanged:
            'The redesigned page replaces the original presentation with clearer hierarchy, spacing and responsive behaviour.',
          whyBetter:
            'Customers receive a calmer, clearer and more dependable first impression across screen sizes.',
        },
        understand: {
          whatChanged:
            'The redesigned page presents the supported information with clearer structure, spacing and emphasis.',
          whyBetter: 'Customers can find and understand the most useful information more quickly.',
        },
        enquire: {
          whatChanged:
            'The redesigned page groups decision-making content and the next action into a clearer customer journey.',
          whyBetter:
            'Customers can recognise the next step sooner and continue with less hesitation.',
        },
      }[clientArea as keyof typeof clientLanguage];
      return [
        {
          id: `theme-${index + 1}-${clientArea}`,
          area: copy.area,
          title: copy.title,
          before: copy.before,
          businessOpportunity: copy.value,
          value: copy.value,
          whatToNotice: copy.whatToNotice,
          designPriority: copy.designPriority,
          editedSiteProof: null,
          occurrenceCount: items.length,
          sourceObservationIds: items.map((item) => item.observation.id),
          sourceUrls,
          evidenceArtifactIds: artifactIds,
          evidence: {
            artifactId: evidence.id,
            storageBucket: evidence.storageBucket,
            storagePath: evidence.storagePath,
            caption: copy.whatToNotice,
            viewport: evidence.metadata.viewport,
            sourceUrl: evidence.metadata.sourceUrl,
          },
          afterEvidence: {
            artifactId: afterEvidence.id,
            storageBucket: afterEvidence.storageBucket,
            storagePath: afterEvidence.storagePath,
            caption: 'The verified redesigned website at the same page and viewport.',
            viewport: afterEvidence.metadata.viewport,
            sourceUrl: afterEvidence.metadata.sourceUrl,
            generatedRoute: afterEvidence.metadata.generatedRoute,
            verification: {
              status: 'passed',
              captureContract: afterEvidence.metadata.captureContract,
              pageReady: true,
              loaderVisible: false,
              sameViewport: true,
              originalHorizontalOverflowPx: Number(evidence.metadata.horizontalOverflowPx ?? 0),
              redesignedHorizontalOverflowPx: Number(
                afterEvidence.metadata.horizontalOverflowPx ?? 0,
              ),
            },
          },
          comparison: {
            ...comparison,
            customerValue: copy.value,
            evidenceBasis:
              'Matched source-page provenance, matched viewport and passed exact-commit verification.',
            verificationSummary: `Verified ${String(afterViewport.label ?? 'responsive')} comparison at ${String(afterViewport.width)} × ${String(afterViewport.height)} after the page loader completed.`,
          },
          internalEvidence: {
            observationIds: items.map((item) => item.observation.id),
            observations: items.map((item) => item.observation.observation),
            recommendations: items.map((item) => item.observation.recommendation),
            customerImpacts: items.map((item) => item.observation.customerImpact),
          },
        },
      ];
    });
    if (valueThemes.length === 0) {
      throw new Error(
        'The verified edited website has no matched comparison screenshots. Run release verification for the current commit again.',
      );
    }
    const nextVersion = Math.max(0, ...reportVersions.map((report) => report.version)) + 1;
    const now = new Date().toISOString();
    const deliveredWork = release.checks.map((check) => ({
      id: check.id,
      label:
        (
          {
            'source-verification': 'The complete website source passed verification',
            'responsive-layout': 'Every generated route was checked across required screen sizes',
            'responsive-navigation': 'Mobile and tablet navigation interactions were checked',
            accessibility: 'Automated accessibility checks passed across responsive views',
          } as Record<string, string>
        )[check.id] ?? check.label,
      detail: check.detail.slice(0, 600),
      status: 'passed',
    }));
    const report: DecisionReport = {
      id: `report-version-v8-ready-design-comparison-${audit.id}-${release.id}`,
      businessId,
      auditId: audit.id,
      crawlRunId: audit.crawlRunId,
      status: 'approved',
      version: nextVersion,
      schemaVersion: 8,
      reviewState: 'approved',
      summary: `${eligible.length} evidence-backed cases automatically consolidated into ${valueThemes.length} value themes and tied to verified edit v${release.sourceEditVersion}.`,
      data: {
        schemaVersion: 8,
        generatorRevision: 'verified-ready-design-comparison-v2',
        reportKind: 'verified_redesign_value',
        auditId: audit.id,
        crawlRunId: audit.crawlRunId,
        generatedAt: now,
        version: nextVersion,
        title: `See the difference for ${business.name}`,
        summary: `Compare the original ${business.name} website with the verified redesign, then see why each design decision creates a clearer customer experience.`,
        strengths: [
          {
            id: 'evidence-led-foundation',
            title: 'The useful parts of the existing website were treated as evidence',
            detail:
              'Captured source content and business facts informed the new website, so the redesign builds on what the organisation already knows.',
          },
          {
            id: 'working-redesign',
            title: 'There is already a complete website to review',
            detail:
              'The proposed solution is a working website—not a mock-up or a list of future recommendations.',
          },
        ],
        valueThemes,
        deliveredWork,
        redesign: {
          status: 'passed',
          attestationRowId: release.id,
          attestationId: release.attestationId,
          sourceBuilderRunId: release.sourceBuilderRunId,
          sourceManifestId: release.sourceManifestId,
          sourceCommit: release.sourceCommit,
          sourceTree: release.sourceTree,
          sourceBranch: release.sourceBranch,
          sourceEditVersion: release.sourceEditVersion,
          verificationProfile: release.verificationProfile,
          verifiedAt: release.verifiedAt,
          checks: release.checks,
        },
        methodology: [
          'The original website themes are curated automatically from current-capture observations with resolvable evidence and high or medium confidence.',
          'Explicitly blocked, low-confidence, unsupported and stale observations are excluded automatically.',
          'Repeated cases are consolidated into no more than three visitor-focused themes.',
          'Every client theme requires an old-site screenshot from the same capture, source URL and viewport as its selected observation.',
          'Raw technical evidence remains frozen internally and is not used as client-facing copy.',
          'A redesign outcome is shown only when it has exact edited-site proof; otherwise the report presents the supported opportunity without claiming that specific issue is resolved.',
        ],
        limitations: [
          'The report does not claim guaranteed traffic, rankings, enquiries or revenue. Those outcomes depend on launch, ongoing content, marketing and customer behaviour.',
          'Automated verification supports release confidence but does not replace client review of business accuracy and fit.',
        ],
        nextStep: `Review the completed ${business.name} website together, confirm it represents the business accurately, and choose the right path to launch.`,
      },
      createdAt: now,
      updatedAt: now,
    };
    await this.put('reportVersions', report);
  }

  async cancelReportGeneration(): Promise<void> {
    throw new Error('Local report generation completes synchronously and cannot be cancelled.');
  }

  async requestReportPreview(): Promise<ReportPreviewJob | undefined> {
    throw new Error('Private report previews require the protected cloud workspace.');
  }

  async cancelReportPreview(): Promise<void> {
    throw new Error('Private report previews require the protected cloud workspace.');
  }

  async requestAssetAnalysis(): Promise<AssetAnalysisJob | undefined> {
    throw new Error('Asset analysis requires the protected Supabase worker.');
  }

  async requestBrandColourRefresh(): Promise<AssetAnalysisJob | undefined> {
    throw new Error('Logo-colour refresh requires the protected Supabase worker.');
  }

  async requestEditableLogoRetry(): Promise<AssetAnalysisJob | undefined> {
    throw new Error('SVG retries require the protected Supabase workspace.');
  }

  async cancelAssetAnalysis(): Promise<void> {
    throw new Error('Asset analysis requires the protected Supabase worker.');
  }

  async requestAssetRefresh(): Promise<AssetRefreshJob | undefined> {
    throw new Error('Image-only refresh requires the protected Supabase worker.');
  }

  async cancelAssetRefresh(): Promise<void> {
    throw new Error('Image-only refresh requires the protected Supabase worker.');
  }

  async setAssetAnalysisSelected(asset: ResearchArtifact, selected: boolean): Promise<void> {
    await this.put('artifacts', {
      ...asset,
      metadata: { ...asset.metadata, analysisSelected: selected },
    } satisfies ResearchArtifact);
    const briefs = await this.getAllForBusiness<RedesignBrief>('briefs', asset.businessId);
    const brief = briefs.find((candidate) => candidate.status === 'draft');
    if (!brief) return;
    const toggle = (assetIds: string[]) =>
      selected
        ? [...new Set([...assetIds, asset.id])]
        : assetIds.filter((assetId) => assetId !== asset.id);
    await this.put('briefs', {
      ...brief,
      sourceSelections: {
        ...brief.sourceSelections,
        assetIds: toggle(brief.sourceSelections.assetIds),
        autoSelectedAssetIds: toggle(brief.sourceSelections.autoSelectedAssetIds),
      },
      updatedAt: new Date().toISOString(),
    } satisfies RedesignBrief);
  }

  async updateAssetAnnotation() {
    throw new Error('Asset annotations require the protected Supabase worker.');
  }

  async requestVisualContentExtraction(): Promise<VisualContentJob | undefined> {
    throw new Error('Visual content recovery requires the protected Supabase workspace.');
  }

  async cancelVisualContentExtraction(): Promise<void> {
    throw new Error('Visual content recovery requires the protected Supabase workspace.');
  }

  async updateVisualContentCandidate() {
    throw new Error('Visual content recovery requires the protected Supabase workspace.');
  }

  async saveDerivedSvgLogo() {
    throw new Error('Editable SVG logos require the protected Supabase workspace.');
  }

  async deleteDerivedSvgLogo() {
    throw new Error('Editable SVG logos require the protected Supabase workspace.');
  }

  async deleteLogoAsset() {
    throw new Error('Logo deletion requires the protected Supabase workspace.');
  }

  async saveBrandKit(): Promise<BrandKit | undefined> {
    throw new Error('Brand Kits require the protected Supabase workspace.');
  }

  async createBrandAwareBriefRevision(): Promise<RedesignBrief | undefined> {
    throw new Error('Brand-aware revisions require the protected Supabase workspace.');
  }

  async createRedesignBrief(businessId: string) {
    const workspace = await this.getWorkspace(businessId);
    if (
      !workspace?.researchPacket ||
      !workspace.latestCapture ||
      workspace.latestCapture.status !== 'ready'
    ) {
      throw new Error(
        'A completed Research Packet is required before a redesign brief can be drafted.',
      );
    }
    const existingBriefs = await this.getAllForBusiness<RedesignBrief>('briefs', businessId);
    const latestBrief = existingBriefs.sort((left, right) => right.version - left.version)[0];
    if (latestBrief?.status === 'draft' && Array.isArray(latestBrief.draft.capabilityInventory)) {
      return latestBrief;
    }
    if (
      latestBrief?.status === 'approved' &&
      manifestSourceMatchesBrief(workspace, latestBrief) &&
      Array.isArray(latestBrief.draft.capabilityInventory) &&
      visualContentMatchesBrief(workspace.visualContentCandidates, latestBrief) &&
      currentManifestContentMatchesBrief(workspace, latestBrief)
    ) {
      return latestBrief;
    }
    const now = new Date().toISOString();
    const generated = createBriefDraft(
      workspace.business.name,
      workspace.researchPacket,
      workspace.artifacts,
      workspace.assetAnnotations,
      undefined,
      workspace.capturedPages,
      undefined,
      workspace.visualContentCandidates,
    );
    generated.sourceSelections.assetIds = [
      ...new Set(
        workspace.artifacts
          .filter((artifact) => artifact.kind === 'asset')
          .map((artifact) => artifact.id),
      ),
    ];
    const isLegacyDraft = latestBrief?.status === 'draft';
    const brief: RedesignBrief = {
      id: id('brief'),
      businessId,
      researchPacketId: workspace.researchPacket.id,
      crawlRunId: workspace.latestCapture.id,
      status: 'draft',
      version: (latestBrief?.version ?? 0) + 1,
      sourceSelections: isLegacyDraft ? latestBrief.sourceSelections : generated.sourceSelections,
      draft: isLegacyDraft
        ? { ...latestBrief.draft, capabilityInventory: generated.draft.capabilityInventory }
        : generated.draft,
      createdAt: now,
      updatedAt: now,
    };
    await this.putMany([
      [
        'briefs',
        isLegacyDraft
          ? {
              ...brief,
              id: latestBrief.id,
              version: latestBrief.version,
              createdAt: latestBrief.createdAt,
            }
          : brief,
      ],
      ['businesses', { ...workspace.business, stage: 'awaiting_approval', updatedAt: now }],
      [
        'activities',
        {
          id: id('activity'),
          businessId,
          type: 'note',
          message: isLegacyDraft
            ? 'Capability inventory generated from saved capture evidence without a new website scrape.'
            : `Redesign brief v${(latestBrief?.version ?? 0) + 1} drafted from the reviewed Research Packet.`,
          createdAt: now,
        } satisfies Activity,
      ],
    ]);
    return isLegacyDraft
      ? {
          ...brief,
          id: latestBrief.id,
          version: latestBrief.version,
          createdAt: latestBrief.createdAt,
        }
      : brief;
  }

  async refreshRedesignBriefArchitecture(brief: RedesignBrief) {
    if (brief.status !== 'draft') {
      throw new Error(
        'Approved briefs cannot be changed. Create a new draft before refreshing it.',
      );
    }
    const workspace = await this.getWorkspace(brief.businessId);
    if (
      !workspace?.researchPacket ||
      !workspace.latestCapture ||
      workspace.latestCapture.id !== brief.crawlRunId
    ) {
      throw new Error(
        'This draft belongs to an earlier capture. Create a new brief revision instead.',
      );
    }
    const generated = createBriefDraft(
      workspace.business.name,
      workspace.researchPacket,
      workspace.artifacts,
      workspace.assetAnnotations,
      workspace.brandKit,
      workspace.capturedPages,
      brief.sourceSelections.pageUrls,
      workspace.visualContentCandidates,
    );
    const now = new Date().toISOString();
    const refreshed: RedesignBrief = {
      ...brief,
      draft: {
        ...brief.draft,
        strategy: generated.draft.strategy,
        proposedSitemap: generated.draft.proposedSitemap,
        pagePlans: generated.draft.pagePlans,
      },
      updatedAt: now,
    };
    await this.putMany([
      ['briefs', refreshed],
      [
        'activities',
        {
          id: id('activity'),
          businessId: brief.businessId,
          type: 'note',
          message: `Redesign brief v${brief.version} architecture regenerated from selected captured pages.`,
          createdAt: now,
        } satisfies Activity,
      ],
    ]);
    return refreshed;
  }

  async updateRedesignBrief(
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) {
    if (brief.status === 'approved') {
      throw new Error('Approved briefs cannot be changed. Create a new draft for further changes.');
    }
    await this.put('briefs', { ...brief, ...patch, updatedAt: new Date().toISOString() });
  }

  async approveRedesignBrief(brief: RedesignBrief) {
    const business = await this.get<Business>('businesses', brief.businessId);
    if (!business) throw new Error('The prospect could not be found.');
    if (brief.status === 'approved') return;
    if (unresolvedPageDispositions(brief).length) {
      throw new Error(
        'Review every selected page outcome and choose destinations for merges or redirects before approval.',
      );
    }
    const now = new Date().toISOString();
    await this.putMany([
      ['briefs', { ...brief, status: 'approved', approvedAt: now, updatedAt: now }],
      ['businesses', { ...business, stage: 'concept_ready', updatedAt: now }],
      [
        'activities',
        {
          id: id('activity'),
          businessId: brief.businessId,
          type: 'approved',
          message: 'Redesign brief approved. A builder can now use the approved strategy.',
          createdAt: now,
        } satisfies Activity,
      ],
    ]);
  }

  async createBuildManifest(businessId: string) {
    const workspace = await this.getWorkspace(businessId);
    const brief = workspace?.redesignBrief;
    if (!workspace || !brief || brief.status !== 'approved') {
      throw new Error('Approve the redesign brief before preparing a Build Manifest.');
    }
    if (!manifestSourceMatchesBrief(workspace, brief)) {
      throw new Error(
        'This approved brief belongs to an earlier capture. Create and approve a new brief before preparing a Build Manifest.',
      );
    }
    if (workspace.buildManifest) return workspace.buildManifest;

    const now = new Date().toISOString();
    const manifest: BuildManifest = {
      id: id('manifest'),
      businessId,
      redesignBriefId: brief.id,
      researchPacketId: brief.researchPacketId,
      crawlRunId: brief.crawlRunId,
      schemaVersion: buildManifestSchemaVersion,
      builderContractVersion: codexBuilderContractVersion,
      status: 'ready',
      data: createBuildManifestData(workspace, brief),
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.putMany([
      ['buildManifests', manifest],
      [
        'activities',
        {
          id: id('activity'),
          businessId,
          type: 'note',
          message:
            'Build Manifest prepared from the approved redesign brief for the future Codex builder.',
          createdAt: now,
        } satisfies Activity,
      ],
    ]);
    return manifest;
  }

  async requestWebsiteBuild(): Promise<BuilderRun | undefined> {
    throw new Error('Private preview builds require the protected Supabase builder worker.');
  }

  async requestBuilderQualityRecheck(): Promise<BuilderRun | undefined> {
    throw new Error('Saved-source quality rechecks require the protected Supabase builder worker.');
  }

  async moveBuilderRunToAgentStudio(builderRunId: string): Promise<BuilderRun | undefined> {
    const run = await this.get<BuilderRun>('builderRuns', builderRunId);
    if (!run) return undefined;
    if (run.status !== 'ready' && run.status !== 'review_required') {
      throw new Error('Only a completed private build can move into Agent Studio.');
    }
    const movedRun = {
      ...run,
      agentStudioSourceAt: run.agentStudioSourceAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.put('builderRuns', movedRun);
    return movedRun;
  }

  async requestAgentStudioSiteTest(): Promise<BuilderRun | undefined> {
    throw new Error('Multi-page Agent Studio tests require the protected Supabase builder worker.');
  }

  async resumeWebsiteBuild(): Promise<BuilderRun | undefined> {
    throw new Error('Private preview builds require the protected Supabase builder worker.');
  }

  async cancelWebsiteBuild(): Promise<void> {
    throw new Error('Private preview builds require the protected Supabase builder worker.');
  }

  async deleteWebsiteBuild(): Promise<void> {
    throw new Error('Private preview builds require the protected Supabase builder worker.');
  }

  async deleteWebsiteBuildHistory(): Promise<void> {
    throw new Error('Private preview builds require the protected Supabase builder worker.');
  }

  async deleteManagedRecord(
    kind: 'capture' | 'asset_analysis' | 'brief' | 'manifest' | 'build',
    id: string,
  ) {
    if (kind === 'capture') return this.deleteRecord('crawlRuns', id);
    if (kind === 'brief') return this.deleteRecord('briefs', id);
    if (kind === 'manifest') return this.deleteRecord('buildManifests', id);
    if (kind === 'asset_analysis' || kind === 'build') return;
  }

  async deleteBuildPackage(businessId: string, redesignBriefId: string) {
    const database = await this.database();
    const readTransaction = database.transaction('buildManifests', 'readonly');
    const manifests = await requestResult(
      readTransaction.objectStore('buildManifests').index('businessId').getAll(businessId),
    );
    const transaction = database.transaction(['briefs', 'buildManifests'], 'readwrite');
    const manifestStore = transaction.objectStore('buildManifests');
    const completed = transactionResult(transaction);
    for (const item of manifests) {
      if (item.redesignBriefId === redesignBriefId) {
        manifestStore.delete(item.id);
      }
    }
    transaction.objectStore('briefs').delete(redesignBriefId);
    await completed;
  }

  async createBuilderPreviewUrl(): Promise<string> {
    throw new Error('Private preview builds require the protected Supabase preview service.');
  }

  async requestClientPreviewPublication(): Promise<ClientPreviewPublication | undefined> {
    throw new Error('Client preview publishing requires the protected cloud workspace.');
  }

  async cancelClientPreviewPublication(): Promise<void> {
    throw new Error('Client preview publishing requires the protected cloud workspace.');
  }

  async requestMadeSolidHandoff(): Promise<MadeSolidHandoff | undefined> {
    throw new Error('Made Solid handoff requires the protected cloud workspace.');
  }

  async cancelMadeSolidHandoff(): Promise<void> {
    throw new Error('Made Solid handoff requires the protected cloud workspace.');
  }

  async requestGithubWorkspacePublication(): Promise<GithubWorkspacePublication | undefined> {
    throw new Error('GitHub publishing requires the protected cloud workspace.');
  }

  async cancelGithubWorkspacePublication(): Promise<void> {
    throw new Error('GitHub publishing requires the protected cloud workspace.');
  }

  async setTaskState(task: Task, state: Task['state']) {
    const now = new Date().toISOString();
    const updatedTask = { ...task, state, updatedAt: now };
    const business = await this.get<Business>('businesses', task.businessId);
    const activity: Activity = {
      id: id('activity'),
      businessId: task.businessId,
      type: 'task_completed',
      message: state === 'done' ? `Completed task: ${task.body}` : `Reopened task: ${task.body}`,
      createdAt: now,
    };
    await this.putMany([
      ['tasks', updatedTask],
      ['activities', activity],
      ...(business
        ? [['businesses', { ...business, updatedAt: now }] as [StoreName, Business]]
        : []),
    ]);
  }

  async approveForOutreach(businessId: string) {
    const business = await this.get<Business>('businesses', businessId);
    const [audits, concepts, contacts] = await Promise.all([
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
      this.getAllForBusiness<Contact>('contacts', businessId),
    ]);
    const compliance = (
      await this.getAllForBusiness<OutreachCompliance>('outreachCompliance', businessId)
    )[0];
    const phoneReady =
      compliance?.phoneAllowed &&
      contacts.some((contact) => Boolean(contact.phone)) &&
      compliance.doNotCallClear &&
      compliance.doNotCallCheckedAt;
    const emailReady =
      compliance?.emailAllowed &&
      contacts.some((contact) => Boolean(contact.email)) &&
      compliance.senderIdentificationConfirmed &&
      compliance.unsubscribeProcessConfirmed;
    if (
      !business ||
      audits[0]?.status !== 'ready' ||
      concepts[0]?.status !== 'ready' ||
      !compliance ||
      compliance.consentBasis === 'not_established' ||
      !compliance.sourceNote.trim() ||
      (compliance.consentBasis === 'public_role_relevant' && !compliance.sourceUrl?.trim()) ||
      compliance.suppressedAt ||
      (!emailReady && !phoneReady)
    )
      return false;
    const now = new Date().toISOString();
    const updatedBusiness: Business = {
      ...business,
      stage: 'outreach_pending',
      reviewState: 'approved',
      updatedAt: now,
    };
    const activity: Activity = {
      id: id('activity'),
      businessId,
      type: 'approved',
      message: 'Research review approved for the next human-controlled outreach step.',
      createdAt: now,
    };
    await this.putMany([
      ['businesses', updatedBusiness],
      ['activities', activity],
    ]);
    return true;
  }

  async saveOutreachCompliance(businessId: string, input: OutreachComplianceInput) {
    const existing = (
      await this.getAllForBusiness<OutreachCompliance>('outreachCompliance', businessId)
    )[0];
    const now = new Date().toISOString();
    const record: OutreachCompliance = {
      ...input,
      id: existing?.id ?? id('outreach-compliance'),
      businessId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.put('outreachCompliance', record);
    return record;
  }

  async deleteProspect(businessId: string) {
    const business = await this.get<Business>('businesses', businessId);
    if (!business || business.kind !== 'prospect') return false;

    const relatedRecords = await Promise.all([
      this.getAllForBusiness<Website>('websites', businessId),
      this.getAllForBusiness<Contact>('contacts', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
      this.getAllForBusiness<CapturedPage>('crawlPages', businessId),
      this.getAllForBusiness<ResearchArtifact>('artifacts', businessId),
      this.getAllForBusiness<EvidenceFact>('facts', businessId),
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<AuditSpecialistTask>('auditSpecialistTasks', businessId),
      this.getAllForBusiness<AuditObservation>('auditObservations', businessId),
      this.getAllForBusiness<BuildManifest>('buildManifests', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
      this.getAllForBusiness<DecisionReport>('reports', businessId),
      this.getAllForBusiness<DecisionReport>('reportVersions', businessId),
      this.getAllForBusiness<Task>('tasks', businessId),
      this.getAllForBusiness<Activity>('activities', businessId),
      this.getAllForBusiness<OutreachCompliance>('outreachCompliance', businessId),
    ]);
    const stores: StoreName[] = [
      'businesses',
      'websites',
      'contacts',
      'crawlRuns',
      'crawlPages',
      'artifacts',
      'facts',
      'audits',
      'auditSpecialistTasks',
      'auditObservations',
      'buildManifests',
      'concepts',
      'reports',
      'reportVersions',
      'tasks',
      'activities',
      'outreachCompliance',
    ];
    const database = await this.database();
    const transaction = database.transaction(stores, 'readwrite');
    const completed = transactionResult(transaction);
    transaction.objectStore('businesses').delete(businessId);
    const storesByRecord = [
      'websites',
      'contacts',
      'crawlRuns',
      'crawlPages',
      'artifacts',
      'facts',
      'audits',
      'auditSpecialistTasks',
      'auditObservations',
      'buildManifests',
      'concepts',
      'reports',
      'reportVersions',
      'tasks',
      'activities',
      'outreachCompliance',
    ] as const;
    relatedRecords.forEach((records, index) => {
      records.forEach((record) => transaction.objectStore(storesByRecord[index]).delete(record.id));
    });
    await completed;
    return true;
  }
}

export const siteforgeRepository = new SiteforgeRepository();
