export type BusinessKind = 'prospect' | 'client';

export type ProspectStage =
  | 'identified'
  | 'researching'
  | 'audit_ready'
  | 'concept_ready'
  | 'awaiting_approval'
  | 'outreach_pending'
  | 'responded'
  | 'proposal'
  | 'won'
  | 'lost'
  | 'paused';

export type ReviewState = 'needs_review' | 'approved' | 'blocked';
export type EvidenceState = 'captured' | 'not_collected' | 'inferred' | 'verified' | 'rejected';
export type AuditStatus =
  'not_started' | 'research_pending' | 'running' | 'ready' | 'failed' | 'cancelled';
export type DeliverableStatus = 'not_started' | 'draft' | 'ready' | 'approved';
export type RedesignBriefStatus = 'draft' | 'approved';
export type AssetAnalysisStatus =
  'not_started' | 'queued' | 'running' | 'ready' | 'failed' | 'cancelled';
export type AssetRole =
  | 'primary_logo'
  | 'secondary_mark'
  | 'worksite_photo'
  | 'team_photo'
  | 'project_photo'
  | 'partner_logo'
  | 'supplier_logo'
  | 'decorative'
  | 'unknown'
  | 'exclude';
export type AssetAssociation = 'target_business' | 'third_party' | 'unknown';
export type TaskState = 'open' | 'done';
export type CaptureStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled';
export type ArtifactKind =
  | 'html'
  | 'screenshot'
  | 'content'
  | 'performance'
  | 'accessibility'
  | 'asset'
  | 'report'
  | 'preview';

export type Business = {
  id: string;
  kind: BusinessKind;
  name: string;
  stage: ProspectStage;
  reviewState: ReviewState;
  opportunityScore?: number;
  createdAt: string;
  updatedAt: string;
};

export type Website = {
  id: string;
  businessId: string;
  url: string;
  domain: string;
  crawlStatus: 'not_requested' | 'queued' | 'captured' | 'failed';
  lastCapturedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  businessId: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  verificationState: EvidenceState;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceFact = {
  id: string;
  businessId: string;
  crawlRunId?: string;
  label: string;
  value: string;
  sourceUrl?: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  verificationState: EvidenceState;
  capturedAt: string;
};

export type ResearchCapture = {
  id: string;
  businessId: string;
  websiteId: string;
  targetUrl: string;
  scope: 'homepage' | 'key_pages' | 'all_pages';
  status: CaptureStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  discoveredPageCount: number;
  capturedPageCount: number;
  failedPageCount: number;
  errorSummary?: string;
  progressPhase?: string;
  progressDetail?: string;
  currentUrl?: string;
  cancelRequestedAt?: string;
  failurePhase?: string;
  failureUrl?: string;
  failureDetail?: string;
};

export type CapturedPage = {
  id: string;
  businessId: string;
  crawlRunId: string;
  url: string;
  canonicalUrl?: string;
  title?: string;
  statusCode?: number;
  captureStatus: CaptureStatus | 'not_requested';
  pageType?: string;
  metadata: Record<string, unknown>;
};

export type ResearchArtifact = {
  id: string;
  businessId: string;
  crawlRunId?: string;
  kind: ArtifactKind;
  label?: string;
  storageBucket: string;
  storagePath: string;
  contentType?: string;
  byteSize?: number;
  sha256?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ResearchPacket = {
  id: string;
  businessId: string;
  crawlRunId: string;
  schemaVersion: number;
  data: Record<string, unknown>;
  generatedAt: string;
};

export type AssetAnalysisJob = {
  id: string;
  runToken?: string;
  analysisScope?: 'full' | 'logo_versions' | 'brand_colours';
  businessId: string;
  crawlRunId: string;
  status: AssetAnalysisStatus;
  model?: string;
  errorSummary?: string;
  progressPhase?: string;
  progressDetail?: string;
  currentAssetId?: string;
  editableLogoRetryAssetId?: string;
  editableLogoRetryToken?: string;
  editableLogoGenerationEnabled?: boolean;
  editableLogoSimplificationEnabled?: boolean;
  editableLogoVectorizerProvider?: 'vtracer' | 'vectorizer_ai';
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetRefreshJob = {
  id: string;
  businessId: string;
  crawlRunId: string;
  status: AssetAnalysisStatus;
  errorSummary?: string;
  progressPhase?: string;
  progressDetail?: string;
  currentUrl?: string;
  totalItems: number;
  completedItems: number;
  discoveredItems: number;
  savedItems: number;
  cancelRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetAnnotation = {
  id: string;
  assetId: string;
  businessId: string;
  crawlRunId: string;
  analysisJobId?: string;
  analysisRunToken?: string;
  sourceContext: Record<string, unknown>;
  observedDescription: string;
  visibleText: string[];
  suggestedRole: AssetRole;
  businessAssociation: AssetAssociation;
  safeReuseNote: string;
  cautions: string[];
  confidence: 'high' | 'medium' | 'low';
  reviewState: ReviewState;
  humanNotes: string;
  model?: string;
  analyzedAt?: string;
  reviewedAt?: string;
};

export type VisualContentType =
  | 'testimonial'
  | 'service'
  | 'contact'
  | 'pricing'
  | 'faq'
  | 'process'
  | 'table'
  | 'list'
  | 'general';

export type StructuredVisualContent = {
  schemaVersion: 1;
  kind: VisualContentType;
  heading: string;
  body: string;
  testimonial: {
    quote: string;
    person: string;
    role: string;
    organisation: string;
  };
  table: {
    caption: string;
    columns: string[];
    rows: string[][];
    footnotes: string[];
  };
  items: Array<{ label: string; value: string; detail: string }>;
  faqs: Array<{ question: string; answer: string }>;
  uncertainties: Array<{ path: string; detail: string }>;
};

export type VisualContentJob = {
  id: string;
  businessId: string;
  crawlRunId: string;
  status: AssetAnalysisStatus;
  model?: string;
  errorSummary?: string;
  progressPhase?: string;
  progressDetail?: string;
  currentCandidateId?: string;
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisualContentCandidate = {
  id: string;
  assetId: string;
  businessId: string;
  crawlRunId: string;
  sourcePageUrl: string;
  sectionHeading: string;
  sourcePresentation: 'image' | 'carousel' | 'gallery' | 'unknown';
  contentType: VisualContentType;
  title: string;
  body: string;
  attribution: string;
  sourceContext: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  reviewState: ReviewState;
  humanTitle: string;
  humanBody: string;
  humanAttribution: string;
  humanNotes: string;
  structuredContent: StructuredVisualContent;
  humanStructuredContent: StructuredVisualContent | Record<string, never>;
  structureStatus: 'pending' | 'ready' | 'failed';
  structureError?: string;
  model?: string;
  analyzedAt?: string;
  reviewedAt?: string;
};

export type ApprovedVisualContent = {
  id: string;
  assetId: string;
  contentType: VisualContentType;
  title: string;
  body: string;
  attribution: string;
  sourcePageUrl: string;
  sectionHeading: string;
  sourcePresentation: VisualContentCandidate['sourcePresentation'];
  presentationInstruction: 'builder_decides';
  structuredContent: StructuredVisualContent;
};

export type ApprovedVisualContentGroup = {
  id: string;
  sourcePageUrl: string;
  sectionHeading: string;
  semanticRole: VisualContentType;
  itemIds: string[];
  items: ApprovedVisualContent[];
  sourcePresentations: VisualContentCandidate['sourcePresentation'][];
  coverageInstruction: 'all_items_required';
  integrationInstruction: 'builder_decides';
  presentationInstruction: 'builder_decides';
};

export type BrandColourEvidence = {
  id: string;
  assetId?: string;
  businessId: string;
  crawlRunId: string;
  sourceType: 'logo_vector' | 'logo_pixels' | 'website_css' | 'rendered_ui';
  sourceLabel: string;
  sourceUrl?: string;
  colour: string;
  occurrenceCount: number;
  confidence: 'high' | 'medium' | 'low';
  details: Record<string, unknown>;
  createdAt: string;
};

export type BrandPalette = {
  primary?: string;
  accent?: string;
  mode?: 'primary_and_accent' | 'accent_only' | 'primary_only' | 'builder_derived';
};

export type BrandKit = {
  id: string;
  businessId: string;
  crawlRunId: string;
  version: number;
  status: 'draft' | 'approved';
  primaryLogoAssetId?: string;
  editableLogoAssetId?: string;
  approvedAssetIds: string[];
  palette: BrandPalette;
  notes: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BriefSourceSelections = {
  pageUrls: string[];
  assetIds: string[];
  /** Assets the brief selected automatically, so later capture additions can be selected once. */
  autoSelectedAssetIds: string[];
  uncertainties: string[];
};

export type BriefSitemapEntry = {
  label: string;
  purpose: string;
  sourceUrl?: string;
};

export type PageDisposition =
  'needs_review' | 'build' | 'merge' | 'redirect' | 'workflow_state' | 'contextual' | 'exclude';

export type BriefPagePlan = {
  title: string;
  structure: string[];
  sourceUrl?: string;
  disposition: PageDisposition;
  dispositionReason: string;
  targetSourceUrl?: string;
};

export type BriefAssetGuidance = {
  assetId: string;
  role: AssetRole;
  observedDescription: string;
  visibleText: string[];
  safeReuseNote: string;
  cautions: string[];
};

export type CapabilityKind =
  | 'content_collection'
  | 'interactive_tool'
  | 'booking_workflow'
  | 'lead_form'
  | 'account_area'
  | 'commerce'
  | 'search_and_filter'
  | 'third_party_integration';

export type CapabilityDecision = 'needs_review' | 'include' | 'exclude';
export type CapabilityDelivery =
  'managed_content' | 'application' | 'workflow' | 'integration' | 'authenticated_application';

export type CapabilityInventoryItem = {
  id: string;
  kind: CapabilityKind;
  title: string;
  description: string;
  delivery: CapabilityDelivery;
  confidence: 'high' | 'medium' | 'low';
  evidence: Array<{ sourceUrl: string; detail: string }>;
  decision: CapabilityDecision;
  decisionQuestion: string;
};

export type RedesignBriefDraft = {
  strategy: string;
  proposedSitemap: BriefSitemapEntry[];
  pagePlans: BriefPagePlan[];
  assetGuidance: BriefAssetGuidance[];
  assumptions: string[];
  openQuestions: string[];
  capabilityInventory?: CapabilityInventoryItem[];
  approvedVisualContent?: ApprovedVisualContent[];
  brandKit?: {
    id: string;
    version: number;
    primaryLogoAssetId: string;
    editableLogoAssetId?: string;
    approvedAssetIds: string[];
    palette: BrandPalette;
  };
};

export type RedesignBrief = {
  id: string;
  businessId: string;
  researchPacketId: string;
  crawlRunId: string;
  status: RedesignBriefStatus;
  version: number;
  sourceSelections: BriefSourceSelections;
  draft: RedesignBriefDraft;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
};

export type BuildManifestStatus = 'ready';

export type BuildManifestFact = {
  id: string;
  label: string;
  value: string;
  sourceUrl?: string;
  evidence: string;
  confidence: EvidenceFact['confidence'];
  verificationState: EvidenceFact['verificationState'];
};

export type BuildManifestPage = {
  url: string;
  title?: string;
  pageType?: string;
  canonicalUrl?: string;
  routePath: string;
  publicPath: string;
  outputPath: string;
  sourcePath: string;
  sourceSelected: boolean;
  disposition: Exclude<PageDisposition, 'needs_review' | 'merge' | 'exclude'>;
  targetSourceUrl?: string;
};

export type BuildManifestPageCoverage = {
  url: string;
  title?: string;
  pageType?: string;
  canonicalUrl?: string;
  disposition: Exclude<PageDisposition, 'needs_review'>;
  dispositionReason: string;
  targetSourceUrl?: string;
  outputRequired: boolean;
};

export type BuildManifestAsset = {
  artifactId: string;
  label?: string;
  contentType?: string;
  storageBucket: string;
  storagePath: string;
  sourceSelected: boolean;
  sourcePageUrls: string[];
  sourceUrls: string[];
  duplicateArtifactIds: string[];
};

export type BuildRuntimeProfile = 'static-marketing' | 'managed-forms' | 'managed-next-runtime';

export type BuildCapabilityAdapter = {
  capabilityId: string;
  kind: CapabilityKind;
  previewMode: 'honest-interface';
  productionMode: 'static' | 'managed-adapter' | 'managed-next-runtime';
  requiresSecrets: boolean;
  requiresHumanConfiguration: boolean;
};

export type BuildArchitecture = {
  sourceFramework: 'next-app-router';
  language: 'typescript-strict';
  styling: 'tailwind-and-semantic-css-tokens';
  interactionFoundation: 'base-ui-and-native-html';
  iconSystem: 'lucide';
  previewRuntime: 'static-export';
  productionRuntime: BuildRuntimeProfile;
  componentLayers: ['tokens', 'ui', 'patterns', 'sections', 'site', 'layouts', 'pages'];
  generationPolicy: {
    agentOwnsVisualSystem: true;
    agentOwnsSiteComponents: true;
    lockedBehaviourNotAppearance: true;
    dependenciesPinnedByFoundation: true;
    nativeHtmlFirst: true;
  };
  capabilityAdapters: BuildCapabilityAdapter[];
  qualityProfile: {
    standard: 'wcag-2.2-aa';
    requiredViewports: Array<{
      id: 'mobile-small' | 'mobile' | 'tablet' | 'desktop';
      width: number;
      height: number;
    }>;
    checks: string[];
  };
};

export type BuildManifestData = {
  source: {
    businessName: string;
    websiteUrl?: string;
    researchPacketId: string;
    crawlRunId: string;
    redesignBriefId: string;
  };
  permittedFacts: BuildManifestFact[];
  selectedPages: BuildManifestPage[];
  pageCoverage: BuildManifestPageCoverage[];
  selectedAssets: BuildManifestAsset[];
  approvedAssetGuidance: BriefAssetGuidance[];
  approvedCapabilities: CapabilityInventoryItem[];
  approvedVisualContent: ApprovedVisualContent[];
  approvedVisualContentGroups: ApprovedVisualContentGroup[];
  architecture: BuildArchitecture;
  brandKit?: NonNullable<RedesignBriefDraft['brandKit']>;
  strategy: string;
  proposedSitemap: BriefSitemapEntry[];
  pagePlans: BriefPagePlan[];
  assumptions: string[];
  openQuestions: string[];
  uncertainties: string[];
  builderRules: string[];
};

export type BuildManifest = {
  id: string;
  businessId: string;
  redesignBriefId: string;
  researchPacketId: string;
  crawlRunId: string;
  schemaVersion: number;
  builderContractVersion: string;
  status: BuildManifestStatus;
  data: BuildManifestData;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BuilderRunStatus =
  'queued' | 'running' | 'paused' | 'ready' | 'review_required' | 'failed' | 'cancelled';
export type BuilderQualityStatus = 'passed' | 'needs_review' | 'failed' | 'not_run';
export type BuilderRunMode = 'homepage_test' | 'page_test' | 'site_test' | 'full_site';
export type AgentPackageStatus =
  'draft' | 'test_ready' | 'production_ready' | 'published' | 'superseded';
export type AgentPackageProposalStatus =
  'queued' | 'running' | 'ready' | 'failed' | 'accepted' | 'rejected';
export type AgentPackageCapabilityAssessment = 'policy_only' | 'foundation_change_required';

export type AgentPackage = {
  id: string;
  version: number;
  status: AgentPackageStatus;
  basePackageId?: string;
  builderContractVersion: string;
  foundationVersion: string;
  foundationChecksum?: string;
  contractAddendum: string;
  instructionsAddendum: string;
  summary: string;
  capabilityAssessment: AgentPackageCapabilityAssessment;
  capabilityProposal?: string;
  stagedBehaviourIds?: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
};

export type AgentPackageProposal = {
  id: string;
  basePackageId: string;
  draftPackageId?: string;
  direction: string;
  status: AgentPackageProposalStatus;
  summary?: string;
  capabilityAssessment?: AgentPackageCapabilityAssessment;
  capabilityProposal?: string;
  errorSummary?: string;
  createdAt: string;
  updatedAt: string;
};
export type BuilderPreviewMode = 'ready' | 'draft';
export type BuilderEventKind = 'stage' | 'activity' | 'file' | 'quality' | 'diagnostic' | 'error';

export type BuilderQualityCheck = {
  id: string;
  label: string;
  status: BuilderQualityStatus;
  detail: string;
  metadata?: Record<string, unknown>;
};

export type BuilderQualitySummary = {
  status: BuilderQualityStatus;
  checks: BuilderQualityCheck[];
  generatedAt?: string;
};

export type BuilderRun = {
  id: string;
  businessId: string;
  buildManifestId: string;
  parentBuilderRunId?: string;
  buildMode: BuilderRunMode;
  targetSourceUrl?: string;
  targetSourceUrls?: string[];
  buildInstruction?: string;
  agentPackageId?: string;
  agentPackageVersion?: number;
  agentStudioSourceAt?: string;
  agentStudioFeatureId?: string;
  sourceCheckpointAvailable?: boolean;
  localDevelopmentSourceAvailable?: boolean;
  status: BuilderRunStatus;
  templateVersion: string;
  model?: string;
  progressPhase: string;
  progressDetail?: string;
  totalItems: number;
  completedItems: number;
  attemptCount?: number;
  heartbeatAt?: string;
  cancelRequestedAt?: string;
  errorSummary?: string;
  failureCode?: string;
  failureStage?: string;
  failureAction?: string;
  failureContext: Record<string, unknown>;
  retryAfter?: string;
  qualitySummary: BuilderQualitySummary;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BuilderArtifactKind =
  'source_bundle' | 'site_file' | 'draft_file' | 'checkpoint' | 'screenshot' | 'log' | 'quality';

export type BuilderArtifact = {
  id: string;
  businessId: string;
  builderRunId: string;
  kind: BuilderArtifactKind;
  label: string;
  storageBucket: string;
  storagePath: string;
  contentType?: string;
  byteSize?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BuilderEvent = {
  id: string;
  businessId: string;
  builderRunId: string;
  sequence: number;
  kind: BuilderEventKind;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BuilderRunEvidence = {
  artifacts: BuilderArtifact[];
  events: BuilderEvent[];
};

export type ClientPreviewPublicationStatus =
  'queued' | 'running' | 'ready' | 'failed' | 'cancelled';

export type ClientPreviewPublication = {
  id: string;
  businessId: string;
  builderRunId: string;
  clientName: string;
  contactName: string;
  clientEmail: string;
  projectName: string;
  finalBalanceCents?: number;
  pricingSnapshot?: import('./pricing').PricingQuoteSnapshot;
  currency: string;
  handoffNotes: string;
  status: ClientPreviewPublicationStatus;
  progressPhase: string;
  progressDetail?: string;
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  deploymentUrl?: string;
  clientspaceHandoffId?: string;
  errorSummary?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};

export type ClientPreviewPublicationInput = {
  clientName: string;
  contactName: string;
  clientEmail: string;
  projectName: string;
  finalBalanceCents?: number;
  pricingSnapshot: import('./pricing').PricingQuoteSnapshot;
  currency: string;
  handoffNotes: string;
};

export type MadeSolidHandoffStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled';

export type MadeSolidHandoff = {
  id: string;
  businessId: string;
  builderRunId: string;
  sourceRepositoryUrl: string;
  sourceBranch: string;
  sourceCommit: string;
  sourceEditVersion: number;
  clientName: string;
  contactName: string;
  clientEmail: string;
  projectName: string;
  handoffNotes: string;
  pricingSnapshot?: import('./pricing').PricingQuoteSnapshot;
  status: MadeSolidHandoffStatus;
  progressPhase: string;
  progressDetail: string;
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  websiteHandoffId?: string;
  websiteAdminUrl?: string;
  errorSummary?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};

export type MadeSolidHandoffInput = {
  sourceRepositoryUrl: string;
  sourceBranch: string;
  sourceCommit: string;
  sourceEditVersion: number;
  clientName: string;
  contactName: string;
  clientEmail: string;
  projectName: string;
  handoffNotes: string;
  pricingSnapshot: import('./pricing').PricingQuoteSnapshot;
};

export type GithubWorkspacePublicationStatus =
  'queued' | 'running' | 'ready' | 'failed' | 'cancelled';

export type GithubWorkspacePublication = {
  id: string;
  businessId: string;
  builderRunId: string;
  repositoryOwner: string;
  repositoryName: string;
  repositoryDescription: string;
  visibility: 'private';
  status: GithubWorkspacePublicationStatus;
  progressPhase: string;
  progressDetail?: string;
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  repositoryUrl?: string;
  cloneUrl?: string;
  fullName?: string;
  defaultBranch?: string;
  errorSummary?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};

export type GithubWorkspacePublicationInput = {
  repositoryOwner: string;
  repositoryName: string;
  repositoryDescription: string;
};

export type AiUsageSource = 'asset_analysis' | 'capability_analysis' | 'codex_build';
export type AiUsageCostSource = 'provider_reported' | 'configured_rate' | 'unavailable';

export type AiUsageRecord = {
  id: string;
  businessId: string;
  builderRunId?: string;
  source: AiUsageSource;
  provider: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd?: number;
  costSource: AiUsageCostSource;
  pricingVersion?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TaxExpenseCategory =
  | 'software_subscriptions'
  | 'hosting_domains'
  | 'professional_services'
  | 'advertising_marketing'
  | 'equipment'
  | 'office_supplies'
  | 'travel_transport'
  | 'education_training'
  | 'insurance_fees'
  | 'phone_internet'
  | 'other';

export type TaxExpense = {
  id: string;
  incurredOn: string;
  supplier: string;
  description: string;
  category: TaxExpenseCategory;
  amountCents: number;
  gstCents: number;
  deductiblePercent: number;
  paymentMethod: string;
  receiptReference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxExpenseInput = Omit<TaxExpense, 'id' | 'createdAt' | 'updatedAt'>;

export type AuditFinding = {
  id: string;
  area:
    | 'UI'
    | 'UX'
    | 'Mobile'
    | 'Accessibility'
    | 'SEO'
    | 'Performance'
    | 'Content'
    | 'Trust'
    | 'Conversion';
  severity: 'high' | 'medium' | 'low';
  title: string;
  finding: string;
  recommendation: string;
  evidenceIds: string[];
  sourceUrls: string[];
  reviewState: ReviewState;
};

export type Audit = {
  id: string;
  businessId: string;
  crawlRunId?: string;
  status: AuditStatus;
  findings: AuditFinding[];
  progressPhase?: string;
  progressDetail?: string;
  totalItems: number;
  completedItems: number;
  cancelRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RedesignConcept = {
  id: string;
  businessId: string;
  status: DeliverableStatus;
  version: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type DecisionReport = {
  id: string;
  businessId: string;
  status: DeliverableStatus;
  version: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  businessId: string;
  body: string;
  dueAt?: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  businessId: string;
  type: 'created' | 'research_requested' | 'approved' | 'task_completed' | 'note';
  message: string;
  createdAt: string;
};

export type ProspectWorkspace = {
  business: Business;
  website?: Website;
  captures: ResearchCapture[];
  contacts: Contact[];
  facts: EvidenceFact[];
  latestCapture?: ResearchCapture;
  capturedPages: CapturedPage[];
  artifacts: ResearchArtifact[];
  researchPacket?: ResearchPacket;
  assetAnalysis?: AssetAnalysisJob;
  assetAnalysisJobs: AssetAnalysisJob[];
  assetRefresh?: AssetRefreshJob;
  assetAnnotations: AssetAnnotation[];
  visualContentCandidates: VisualContentCandidate[];
  visualContentJob?: VisualContentJob;
  brandColourEvidence: BrandColourEvidence[];
  brandKit?: BrandKit;
  redesignBrief?: RedesignBrief;
  redesignBriefs: RedesignBrief[];
  buildManifest?: BuildManifest;
  buildManifests: BuildManifest[];
  latestBuilderRun?: BuilderRun;
  builderRuns: BuilderRun[];
  builderArtifacts: BuilderArtifact[];
  builderEvents: BuilderEvent[];
  clientPreviewPublications: ClientPreviewPublication[];
  madeSolidHandoffs: MadeSolidHandoff[];
  madeSolidHandoffWorkerAvailable: boolean;
  githubWorkspacePublications: GithubWorkspacePublication[];
  githubWorkspaceWorkerAvailable: boolean;
  aiUsageRecords: AiUsageRecord[];
  previousCapture?: ResearchCapture;
  previousFacts: EvidenceFact[];
  previousArtifacts: ResearchArtifact[];
  audit?: Audit;
  concept?: RedesignConcept;
  report?: DecisionReport;
  tasks: Task[];
  activity: Activity[];
};

export const stageLabels: Record<ProspectStage, string> = {
  identified: 'Identified',
  researching: 'Researching',
  audit_ready: 'Audit ready',
  concept_ready: 'Concept ready',
  awaiting_approval: 'Awaiting approval',
  outreach_pending: 'Outreach pending',
  responded: 'Responded',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
  paused: 'Paused',
};

export function isOpenTask(task: Task) {
  return task.state === 'open';
}
