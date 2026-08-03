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
  BuildManifest,
  BuilderPreviewMode,
  BuilderRunEvidence,
  BuilderRunMode,
  BuilderRun,
  CapturedPage,
  Business,
  Contact,
  DecisionReport,
  EvidenceFact,
  ProspectWorkspace,
  ResearchArtifact,
  ResearchCapture,
  RedesignBrief,
  RedesignConcept,
  Task,
  Website,
} from './domain';
import {
  buildManifestSchemaVersion,
  codexBuilderContractVersion,
  createBuildManifestData,
  currentManifestContentMatchesBrief,
  manifestSourceMatchesBrief,
} from './build-manifest';
import { createBriefDraft, visualContentMatchesBrief } from './redesign-brief';

export type WorkspaceRepository = {
  bootstrap(): Promise<void>;
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
  requestAssetAnalysis(businessId: string): Promise<AssetAnalysisJob | undefined>;
  requestEditableLogoRetry(
    asset: ResearchArtifact,
    options?: { simplifyGeometry?: boolean; vectorizerProvider?: 'vtracer' | 'vectorizer_ai' },
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
  setTaskState(task: Task, state: Task['state']): Promise<void>;
  approveForOutreach(businessId: string): Promise<boolean>;
  deleteProspect(businessId: string): Promise<boolean>;
};

const databaseName = 'siteforge-os';
const databaseVersion = 5;
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

type StoreName =
  | 'activities'
  | 'audits'
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
  | 'reports'
  | 'tasks'
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
          'concepts',
          'reports',
          'tasks',
          'activities',
          'meta',
        ] as StoreName[]
      ).forEach((name) => {
        const store = database.objectStoreNames.contains(name)
          ? upgradeTransaction.objectStore(name)
          : database.createObjectStore(name, { keyPath: 'id' });
        if (name !== 'businesses' && name !== 'meta' && !store.indexNames.contains('businessId')) {
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
    if (!localPackageRecord) {
      await this.put('meta', {
        id: localAgentPackageKey,
        value: JSON.stringify([
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
      briefs,
      buildManifests,
      builderRuns,
      concepts,
      reports,
      tasks,
      activity,
    ] = await Promise.all([
      this.getAllForBusiness<Website>('websites', businessId),
      this.getAllForBusiness<Contact>('contacts', businessId),
      this.getAllForBusiness<EvidenceFact>('facts', businessId),
      this.getAllForBusiness<ResearchCapture>('crawlRuns', businessId),
      this.getAllForBusiness<CapturedPage>('crawlPages', businessId),
      this.getAllForBusiness<ResearchArtifact>('artifacts', businessId),
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<RedesignBrief>('briefs', businessId),
      this.getAllForBusiness<BuildManifest>('buildManifests', businessId),
      this.getAllForBusiness<BuilderRun>('builderRuns', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
      this.getAllForBusiness<DecisionReport>('reports', businessId),
      this.getAllForBusiness<Task>('tasks', businessId),
      this.getAllForBusiness<Activity>('activities', businessId),
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

    return {
      business,
      website: websites[0],
      captures: orderedCaptures,
      contacts,
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
      audit: audits[0],
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
      latestBuilderRun: builderRuns.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )[0],
      builderRuns: builderRuns.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      aiUsageRecords: [],
      concept: concepts[0],
      report: reports[0],
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
    const now = new Date().toISOString();
    const audit = audits[0] ?? {
      id: id('audit'),
      businessId,
      status: 'not_started' as const,
      findings: [],
      totalItems: 0,
      completedItems: 0,
      createdAt: now,
      updatedAt: now,
    };
    const updatedAudit: Audit = {
      ...audit,
      status: 'ready',
      findings: audit.findings,
      updatedAt: now,
    };
    await this.putMany([
      ['audits', updatedAudit],
      ['businesses', { ...business, stage: 'audit_ready', updatedAt: now }],
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
    return updatedAudit;
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

  async requestAssetAnalysis(): Promise<AssetAnalysisJob | undefined> {
    throw new Error('Asset analysis requires the protected Supabase worker.');
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
    const capabilityAnalysis = workspace.researchPacket.data.capabilityAnalysis;
    const capabilityAnalysisIsReady =
      capabilityAnalysis &&
      typeof capabilityAnalysis === 'object' &&
      (capabilityAnalysis as Record<string, unknown>).status === 'ready';
    if (!capabilityAnalysisIsReady && !Array.isArray(latestBrief?.draft.capabilityInventory)) {
      throw new Error(
        'AI capability analysis must complete from the saved capture before the first brief can be drafted.',
      );
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
    const [audits, concepts] = await Promise.all([
      this.getAllForBusiness<Audit>('audits', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
    ]);
    if (!business || audits[0]?.status !== 'ready' || concepts[0]?.status !== 'ready') return false;
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
      this.getAllForBusiness<BuildManifest>('buildManifests', businessId),
      this.getAllForBusiness<RedesignConcept>('concepts', businessId),
      this.getAllForBusiness<DecisionReport>('reports', businessId),
      this.getAllForBusiness<Task>('tasks', businessId),
      this.getAllForBusiness<Activity>('activities', businessId),
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
      'buildManifests',
      'concepts',
      'reports',
      'tasks',
      'activities',
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
      'buildManifests',
      'concepts',
      'reports',
      'tasks',
      'activities',
    ] as const;
    relatedRecords.forEach((records, index) => {
      records.forEach((record) => transaction.objectStore(storesByRecord[index]).delete(record.id));
    });
    await completed;
    return true;
  }
}

export const siteforgeRepository = new SiteforgeRepository();
