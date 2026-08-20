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
  cancelWebsiteAudit(businessId: string): Promise<void>;
  updateAuditFinding(
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ): Promise<void>;
  updateAuditObservation(
    observationId: string,
    reviewState: AuditObservation['reviewState'],
  ): Promise<void>;
  createDecisionReport(businessId: string, auditId: string): Promise<DecisionReport | undefined>;
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
const databaseVersion = 8;
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
    if (!localPackageRecord) {
      await this.put('meta', {
        id: localAgentPackageKey,
        value: JSON.stringify([
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

  async createDecisionReport(businessId: string, auditId: string) {
    const audit = await this.get<Audit>('audits', auditId);
    const allObservations = (
      await this.getAllForBusiness<AuditObservation>('auditObservations', businessId)
    ).filter((observation) => observation.auditId === auditId);
    const observations = allObservations.filter(
      (observation) => observation.reviewState === 'approved',
    );
    const tasks = (
      await this.getAllForBusiness<AuditSpecialistTask>('auditSpecialistTasks', businessId)
    ).filter((task) => task.auditId === auditId);
    const latestCapture = (await this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId))
      .filter((capture) => capture.status === 'ready')
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
    if (!audit || audit.status !== 'ready' || audit.crawlRunId !== latestCapture?.id) {
      throw new Error('A completed specialist audit for the current capture is required.');
    }
    if (tasks.length !== 6 || tasks.some((task) => task.status !== 'ready')) {
      throw new Error('Every required specialist section must complete before preparing a report.');
    }
    if (!observations.length) {
      throw new Error(
        'Approve at least one evidence-linked observation before preparing a report.',
      );
    }
    if (observations.some((observation) => observation.confidence === 'low')) {
      throw new Error('Low-confidence observations need stronger evidence or exclusion.');
    }
    const [facts, artifacts, business] = await Promise.all([
      this.getAllForBusiness<EvidenceFact>('facts', businessId),
      this.getAllForBusiness<ResearchArtifact>('artifacts', businessId),
      this.get<Business>('businesses', businessId),
    ]);
    const currentEvidenceIds = new Set([
      ...facts.filter((fact) => fact.crawlRunId === audit.crawlRunId).map((fact) => fact.id),
      ...artifacts
        .filter((artifact) => artifact.crawlRunId === audit.crawlRunId)
        .map((artifact) => artifact.id),
    ]);
    if (
      observations.some((observation) =>
        [...observation.evidenceFactIds, ...observation.evidenceArtifactIds].every(
          (evidenceId) => !currentEvidenceIds.has(evidenceId),
        ),
      )
    ) {
      throw new Error('Every approved observation needs evidence from the current capture.');
    }
    const existing = await this.getAllForBusiness<DecisionReport>('reportVersions', businessId);
    const now = new Date().toISOString();
    const report: DecisionReport = {
      id: id('report-version'),
      businessId,
      auditId,
      crawlRunId: audit.crawlRunId,
      status: 'approved',
      version: Math.max(0, ...existing.map((candidate) => candidate.version)) + 1,
      schemaVersion: 1,
      reviewState: 'approved',
      summary: `${observations.length} approved website ${observations.length === 1 ? 'finding' : 'findings'} frozen in this reviewed report.`,
      data: {
        schemaVersion: 1,
        auditId,
        crawlRunId: audit.crawlRunId,
        generatedAt: now,
        title: `${business?.name ?? 'Client'} website report`,
        summary:
          'A practical, evidence-led review of the current website experience and the improvements worth prioritising.',
        scope: [
          'Responsive UI at 375 x 812, 768 x 1024, and 1440 x 900',
          'Accessibility and keyboard-relevant structure',
          'Performance engineering and page delivery',
          'Technical SEO and content structure',
          'Conversion journeys and visible trust',
          'Platform and integration signals',
        ],
        findings: observations.map((observation) => ({
          id: observation.id,
          area: observation.area,
          priority: observation.severity,
          title: observation.title,
          observation: observation.observation,
          impact: observation.customerImpact,
          recommendation: observation.recommendation,
          sourceUrls: observation.sourceUrls,
          evidenceFactIds: observation.evidenceFactIds,
          evidenceArtifactIds: observation.evidenceArtifactIds,
          viewport: observation.viewport,
          measurement: observation.measurement,
          confidence: observation.confidence,
        })),
        methodology: [
          'One bounded public-site capture supplied the immutable evidence used by independent specialist checks.',
          'Every client-facing finding was approved by a human reviewer before this report version was frozen.',
          'Unselected observations remain private audit material and are not presented to the client.',
        ],
        limitations: [
          'The review does not include private analytics, authenticated pages, submitted forms, or claims about future traffic, rankings, or revenue.',
        ],
        nextStep: 'Talk through which improvements best match the business and its customers.',
      },
      createdAt: now,
      updatedAt: now,
    };
    await this.put('reportVersions', report);
    return report;
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
