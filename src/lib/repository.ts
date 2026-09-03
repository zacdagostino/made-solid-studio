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

export type WorkspaceRepository = {
  bootstrap(): Promise<void>;
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
    if (!localPackageRecord) {
      await this.put('meta', {
        id: localAgentPackageKey,
        value: JSON.stringify([
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
    generated.sourceSelections.pageUrls = [
      ...new Set(workspace.capturedPages.map((page) => page.url)),
    ];
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
