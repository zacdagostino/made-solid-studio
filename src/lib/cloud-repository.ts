import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Activity,
  AgentPackage,
  AgentPackageProposal,
  AiUsageRecord,
  ApprovedVisualContent,
  AssetAnalysisJob,
  AssetAnnotation,
  VisualContentCandidate,
  VisualContentJob,
  StructuredVisualContent,
  BrandColourEvidence,
  BrandKit,
  Audit,
  AuditFinding,
  AuditObservation,
  AuditSpecialistTask,
  BuildManifest,
  BuilderArtifact,
  BuilderEvent,
  BuilderPreviewMode,
  BuilderRunEvidence,
  BuilderRun,
  BuilderRunMode,
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
  SourceReleaseAttestation,
  ReportPreviewJob,
  EvidenceFact,
  ProspectWorkspace,
  ResearchArtifact,
  ResearchCapture,
  ResearchPacket,
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
import { canonicalWebsiteUrl, type WorkspaceRepository } from './repository';
import {
  assetGuidanceFromAnnotations,
  createBriefDraft,
  visualContentMatchesBrief,
} from './redesign-brief';
import { openAiApiFeaturesEnabled } from './ai-billing';

type DatabaseRow = Record<string, unknown>;

function readString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function readOptionalString(row: DatabaseRow, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : undefined;
}

function auditStatus(value: string): Audit['status'] {
  if (value === 'queued') return 'research_pending';
  if (value === 'running' || value === 'ready' || value === 'failed') return value;
  return 'not_started';
}

function crawlStatus(value: string): Website['crawlStatus'] {
  if (value === 'queued' || value === 'running') return 'queued';
  if (value === 'ready') return 'captured';
  if (value === 'failed') return 'failed';
  return 'not_requested';
}

function businessFromRow(row: DatabaseRow): Business {
  return {
    id: readString(row, 'id'),
    kind: readString(row, 'kind') as Business['kind'],
    name: readString(row, 'name'),
    stage: readString(row, 'stage') as Business['stage'],
    reviewState: readString(row, 'review_state') as Business['reviewState'],
    opportunityScore: typeof row.opportunity_score === 'number' ? row.opportunity_score : undefined,
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function websiteFromRow(row: DatabaseRow): Website {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    url: readString(row, 'url'),
    domain: readString(row, 'domain'),
    crawlStatus: crawlStatus(readString(row, 'crawl_status')),
    lastCapturedAt: readOptionalString(row, 'last_captured_at'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function contactFromRow(row: DatabaseRow): Contact {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    name: readOptionalString(row, 'name'),
    role: readOptionalString(row, 'role'),
    email: readOptionalString(row, 'email'),
    phone: readOptionalString(row, 'phone'),
    verificationState: readString(row, 'verification_state') as Contact['verificationState'],
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function factFromRow(row: DatabaseRow): EvidenceFact {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readOptionalString(row, 'crawl_run_id'),
    label: readString(row, 'label'),
    value: readString(row, 'value'),
    sourceUrl: readOptionalString(row, 'source_url'),
    evidence: readString(row, 'evidence'),
    confidence: readString(row, 'confidence') as EvidenceFact['confidence'],
    verificationState: readString(row, 'verification_state') as EvidenceFact['verificationState'],
    capturedAt: readString(row, 'captured_at'),
  };
}

function readNumber(row: DatabaseRow, key: string) {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function taxExpenseFromRow(row: DatabaseRow): TaxExpense {
  return {
    id: readString(row, 'id'),
    incurredOn: readString(row, 'incurred_on'),
    supplier: readString(row, 'supplier'),
    description: readString(row, 'description'),
    category: readString(row, 'category') as TaxExpense['category'],
    amountCents: readNumber(row, 'amount_cents'),
    gstCents: readNumber(row, 'gst_cents'),
    deductiblePercent: readNumber(row, 'deductible_percent'),
    paymentMethod: readString(row, 'payment_method'),
    receiptReference: readString(row, 'receipt_reference'),
    notes: readString(row, 'notes'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function taxExpenseRecord(input: TaxExpenseInput) {
  return {
    incurred_on: input.incurredOn,
    supplier: input.supplier.trim(),
    description: input.description.trim(),
    category: input.category,
    amount_cents: input.amountCents,
    gst_cents: input.gstCents,
    deductible_percent: input.deductiblePercent,
    payment_method: input.paymentMethod.trim(),
    receipt_reference: input.receiptReference.trim(),
    notes: input.notes.trim(),
  };
}

function readOptionalNumber(row: DatabaseRow, key: string) {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function plainHtmlText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function imageSourceToken(sourceUrl: string) {
  try {
    const pathParts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
    const mediaIndex = pathParts.indexOf('media');
    const mediaName = mediaIndex >= 0 ? pathParts[mediaIndex + 1] : pathParts.at(-1);
    return mediaName?.split('~')[0] ?? '';
  } catch {
    return sourceUrl.split('/').at(-1)?.split('~')[0] ?? '';
  }
}

function visualSourceLocation(html: string, sourceImageUrl: string) {
  const token = imageSourceToken(sourceImageUrl);
  const imageIndex = token ? html.indexOf(token) : -1;
  if (imageIndex < 0) return undefined;
  const beforeImage = html.slice(0, imageIndex);
  const headingExpression = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let heading = '';
  for (const match of beforeImage.matchAll(headingExpression)) {
    const candidate = plainHtmlText(match[1] ?? '');
    if (candidate) heading = candidate;
  }
  const presentationMarkup = html.slice(Math.max(0, imageIndex - 5_000), imageIndex + 5_000);
  const sourcePresentation = /\b(carousel|slider|slideshow)\b/i.test(presentationMarkup)
    ? 'carousel'
    : /\bgallery\b/i.test(presentationMarkup)
      ? 'gallery'
      : 'image';
  return { heading: heading.slice(0, 180), sourcePresentation };
}

function captureFromRow(row: DatabaseRow, businessId: string, website?: Website): ResearchCapture {
  const status = readString(row, 'status');
  const cancelRequestedAt = readOptionalString(row, 'cancel_requested_at');
  return {
    id: readString(row, 'id'),
    businessId,
    websiteId: readString(row, 'website_id'),
    targetUrl: readOptionalString(row, 'target_url') ?? website?.url ?? '',
    scope:
      readString(row, 'capture_scope') === 'all_pages'
        ? 'all_pages'
        : readString(row, 'capture_scope') === 'key_pages'
          ? 'key_pages'
          : 'homepage',
    status:
      cancelRequestedAt && status === 'failed'
        ? 'cancelled'
        : status === 'running' || status === 'ready' || status === 'failed'
          ? status
          : 'queued',
    requestedAt: readString(row, 'requested_at'),
    startedAt: readOptionalString(row, 'started_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    discoveredPageCount: readNumber(row, 'discovered_page_count'),
    capturedPageCount: readNumber(row, 'captured_page_count'),
    failedPageCount: readNumber(row, 'failed_page_count'),
    errorSummary: readOptionalString(row, 'error_summary'),
    progressPhase: readOptionalString(row, 'progress_phase'),
    progressDetail: readOptionalString(row, 'progress_detail'),
    currentUrl: readOptionalString(row, 'current_url'),
    cancelRequestedAt,
    failurePhase: readOptionalString(row, 'failure_phase'),
    failureUrl: readOptionalString(row, 'failure_url'),
    failureDetail: readOptionalString(row, 'failure_detail'),
  };
}

function pageFromRow(row: DatabaseRow, businessId: string): CapturedPage {
  const status = readString(row, 'capture_status');
  return {
    id: readString(row, 'id'),
    businessId,
    crawlRunId: readString(row, 'crawl_run_id'),
    url: readString(row, 'url'),
    canonicalUrl: readOptionalString(row, 'canonical_url'),
    title: readOptionalString(row, 'title'),
    statusCode: typeof row.status_code === 'number' ? row.status_code : undefined,
    captureStatus:
      status === 'queued' || status === 'running' || status === 'ready' || status === 'failed'
        ? status
        : 'not_requested',
    pageType: readOptionalString(row, 'page_type'),
    metadata:
      typeof row.metadata === 'object' && row.metadata !== null && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

function artifactFromRow(row: DatabaseRow): ResearchArtifact {
  const metadata =
    typeof row.metadata === 'object' && row.metadata !== null && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readOptionalString(row, 'crawl_run_id'),
    kind: readString(row, 'kind') as ResearchArtifact['kind'],
    label: readOptionalString(row, 'label'),
    storageBucket: readOptionalString(row, 'storage_bucket') ?? 'siteforge-artifacts',
    storagePath: readString(row, 'storage_path'),
    contentType: readOptionalString(row, 'content_type'),
    byteSize: typeof row.byte_size === 'number' ? row.byte_size : undefined,
    sha256: readOptionalString(row, 'sha256'),
    metadata,
    createdAt: readString(row, 'created_at'),
  };
}

function researchPacketFromRow(row: DatabaseRow): ResearchPacket {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    schemaVersion: readNumber(row, 'schema_version') || 1,
    data:
      typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {},
    generatedAt: readString(row, 'generated_at'),
  };
}

function assetAnalysisFromRow(row: DatabaseRow): AssetAnalysisJob {
  const status = readString(row, 'status');
  const cancelRequestedAt = readOptionalString(row, 'cancel_requested_at');
  return {
    id: readString(row, 'id'),
    runToken: readOptionalString(row, 'run_token'),
    analysisScope:
      row.analysis_scope === 'brand_colours' || row.analysis_scope === 'logo_versions'
        ? row.analysis_scope
        : 'full',
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    status:
      cancelRequestedAt && status === 'failed'
        ? 'cancelled'
        : status === 'queued' || status === 'running' || status === 'ready' || status === 'failed'
          ? status
          : 'not_started',
    model: readOptionalString(row, 'model'),
    errorSummary: readOptionalString(row, 'error_summary'),
    progressPhase: readOptionalString(row, 'progress_phase'),
    progressDetail: readOptionalString(row, 'progress_detail'),
    currentAssetId: readOptionalString(row, 'current_asset_id'),
    editableLogoRetryAssetId: readOptionalString(row, 'editable_logo_retry_asset_id'),
    editableLogoRetryToken: readOptionalString(row, 'editable_logo_retry_token'),
    editableLogoGenerationEnabled: row.editable_logo_generation_enabled === true,
    editableLogoSimplificationEnabled: row.editable_logo_simplification_enabled === true,
    editableLogoVectorizerProvider:
      row.editable_logo_vectorizer_provider === 'vectorizer_ai' ? 'vectorizer_ai' : 'vtracer',
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt,
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function visualContentCandidateFromRow(row: DatabaseRow): VisualContentCandidate {
  const structuredContent = recordValue(row.structured_content);
  const humanStructuredContent = recordValue(row.human_structured_content);
  return {
    id: readString(row, 'id'),
    assetId: readString(row, 'asset_id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    sourcePageUrl: readString(row, 'source_page_url'),
    sectionHeading: readString(row, 'section_heading'),
    sourcePresentation: readString(
      row,
      'source_presentation',
    ) as VisualContentCandidate['sourcePresentation'],
    contentType: readString(row, 'content_type') as VisualContentCandidate['contentType'],
    title: readString(row, 'title'),
    body: readString(row, 'body'),
    attribution: readString(row, 'attribution'),
    sourceContext:
      typeof row.source_context === 'object' &&
      row.source_context !== null &&
      !Array.isArray(row.source_context)
        ? (row.source_context as Record<string, unknown>)
        : {},
    confidence: readString(row, 'confidence') as VisualContentCandidate['confidence'],
    reviewState: readString(row, 'review_state') as VisualContentCandidate['reviewState'],
    humanTitle: readString(row, 'human_title'),
    humanBody: readString(row, 'human_body'),
    humanAttribution: readString(row, 'human_attribution'),
    humanNotes: readString(row, 'human_notes'),
    structuredContent: structuredContent as StructuredVisualContent,
    humanStructuredContent: humanStructuredContent as
      StructuredVisualContent | Record<string, never>,
    structureStatus:
      readString(row, 'structure_status') === 'ready'
        ? 'ready'
        : readString(row, 'structure_status') === 'failed'
          ? 'failed'
          : 'pending',
    structureError: readOptionalString(row, 'structure_error'),
    model: readOptionalString(row, 'model'),
    analyzedAt: readOptionalString(row, 'analyzed_at'),
    reviewedAt: readOptionalString(row, 'reviewed_at'),
  };
}

function visualContentJobFromRow(row: DatabaseRow): VisualContentJob {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    status:
      row.cancel_requested_at && status === 'failed'
        ? 'cancelled'
        : status === 'queued' || status === 'running' || status === 'ready' || status === 'failed'
          ? status
          : 'failed',
    model: readOptionalString(row, 'model'),
    errorSummary: readOptionalString(row, 'error_summary'),
    progressPhase: readOptionalString(row, 'progress_phase'),
    progressDetail: readOptionalString(row, 'progress_detail'),
    currentCandidateId: readOptionalString(row, 'current_candidate_id'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function assetAnnotationFromRow(row: DatabaseRow): AssetAnnotation {
  return {
    id: readString(row, 'id'),
    assetId: readString(row, 'asset_id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    analysisJobId: readOptionalString(row, 'analysis_job_id'),
    analysisRunToken: readOptionalString(row, 'analysis_run_token'),
    sourceContext: recordValue(row.source_context),
    observedDescription: readString(row, 'observed_description'),
    visibleText: Array.isArray(row.visible_text)
      ? row.visible_text.filter((value): value is string => typeof value === 'string')
      : [],
    suggestedRole: readString(row, 'suggested_role') as AssetAnnotation['suggestedRole'],
    businessAssociation: readString(
      row,
      'business_association',
    ) as AssetAnnotation['businessAssociation'],
    safeReuseNote: readString(row, 'safe_reuse_note'),
    cautions: Array.isArray(row.cautions)
      ? row.cautions.filter((value): value is string => typeof value === 'string')
      : [],
    confidence: readString(row, 'confidence') as AssetAnnotation['confidence'],
    reviewState: readString(row, 'review_state') as AssetAnnotation['reviewState'],
    humanNotes: readString(row, 'human_notes'),
    model: readOptionalString(row, 'model'),
    analyzedAt: readOptionalString(row, 'analyzed_at'),
    reviewedAt: readOptionalString(row, 'reviewed_at'),
  };
}

function brandPaletteFrom(value: unknown): BrandKit['palette'] {
  const palette = recordValue(value);
  return Object.fromEntries(
    ['primary', 'accent', 'mode']
      .filter((key) => typeof palette[key] === 'string')
      .map((key) => [key, palette[key] as string]),
  ) as BrandKit['palette'];
}

function brandColourEvidenceFromRow(row: DatabaseRow): BrandColourEvidence {
  return {
    id: readString(row, 'id'),
    assetId: readOptionalString(row, 'asset_id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    sourceType: readString(row, 'source_type') as BrandColourEvidence['sourceType'],
    sourceLabel: readString(row, 'source_label'),
    sourceUrl: readOptionalString(row, 'source_url'),
    colour: readString(row, 'colour'),
    occurrenceCount: readNumber(row, 'occurrence_count') || 1,
    confidence: readString(row, 'confidence') as BrandColourEvidence['confidence'],
    details: recordValue(row.details),
    createdAt: readString(row, 'created_at'),
  };
}

function brandKitFromRow(row: DatabaseRow): BrandKit {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    version: readOptionalNumber(row, 'version') ?? 0,
    status: readString(row, 'status') as BrandKit['status'],
    primaryLogoAssetId: readOptionalString(row, 'primary_logo_artifact_id'),
    editableLogoAssetId: readOptionalString(row, 'editable_logo_artifact_id'),
    approvedAssetIds: Array.isArray(row.approved_asset_ids)
      ? row.approved_asset_ids.filter((value): value is string => typeof value === 'string')
      : [],
    palette: brandPaletteFrom(row.palette),
    notes: readString(row, 'notes'),
    approvedAt: readOptionalString(row, 'approved_at'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function recordValue(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function briefFromRow(row: DatabaseRow): RedesignBrief {
  const sourceSelections = recordValue(row.source_selections);
  const draft = recordValue(row.draft);
  const brandKit = recordValue(draft.brandKit);
  const primaryLogoAssetId = readOptionalString(brandKit, 'primaryLogoAssetId');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    researchPacketId: readString(row, 'research_packet_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    status: readString(row, 'status') as RedesignBrief['status'],
    version: readNumber(row, 'version') || 1,
    sourceSelections: {
      pageUrls: Array.isArray(sourceSelections.pageUrls)
        ? sourceSelections.pageUrls.filter((value): value is string => typeof value === 'string')
        : [],
      assetIds: Array.isArray(sourceSelections.assetIds)
        ? sourceSelections.assetIds.filter((value): value is string => typeof value === 'string')
        : [],
      autoSelectedAssetIds: Array.isArray(sourceSelections.autoSelectedAssetIds)
        ? sourceSelections.autoSelectedAssetIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      uncertainties: Array.isArray(sourceSelections.uncertainties)
        ? sourceSelections.uncertainties.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
    },
    draft: {
      strategy: readOptionalString(draft, 'strategy') ?? '',
      proposedSitemap: Array.isArray(draft.proposedSitemap) ? draft.proposedSitemap : [],
      pagePlans: Array.isArray(draft.pagePlans) ? draft.pagePlans : [],
      assetGuidance: Array.isArray(draft.assetGuidance) ? draft.assetGuidance : [],
      brandKit:
        readOptionalString(brandKit, 'id') && primaryLogoAssetId
          ? {
              id: readString(brandKit, 'id'),
              version: readNumber(brandKit, 'version'),
              primaryLogoAssetId,
              editableLogoAssetId: readOptionalString(brandKit, 'editableLogoAssetId'),
              approvedAssetIds: Array.isArray(brandKit.approvedAssetIds)
                ? brandKit.approvedAssetIds.filter(
                    (value): value is string => typeof value === 'string',
                  )
                : [],
              palette: brandPaletteFrom(brandKit.palette),
            }
          : undefined,
      assumptions: Array.isArray(draft.assumptions) ? draft.assumptions : [],
      openQuestions: Array.isArray(draft.openQuestions) ? draft.openQuestions : [],
      ...(Array.isArray(draft.capabilityInventory)
        ? { capabilityInventory: draft.capabilityInventory }
        : {}),
      approvedVisualContent: Array.isArray(draft.approvedVisualContent)
        ? (draft.approvedVisualContent as ApprovedVisualContent[])
        : [],
    } as RedesignBrief['draft'],
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
    approvedAt: readOptionalString(row, 'approved_at'),
  };
}

function buildManifestFromRow(row: DatabaseRow): BuildManifest {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    redesignBriefId: readString(row, 'redesign_brief_id'),
    researchPacketId: readString(row, 'research_packet_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    schemaVersion: readNumber(row, 'schema_version') || 1,
    builderContractVersion: readString(row, 'builder_contract_version'),
    status: 'ready',
    data: recordValue(row.data) as BuildManifest['data'],
    generatedAt: readString(row, 'generated_at'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function builderQualitySummary(value: unknown): BuilderRun['qualitySummary'] {
  const summary = recordValue(value);
  const checks = Array.isArray(summary.checks)
    ? summary.checks
        .filter(
          (check): check is Record<string, unknown> => Boolean(check) && typeof check === 'object',
        )
        .map((check) => ({
          id: typeof check.id === 'string' ? check.id : 'check',
          label: typeof check.label === 'string' ? check.label : 'Quality check',
          status:
            check.status === 'passed' ||
            check.status === 'needs_review' ||
            check.status === 'failed'
              ? check.status
              : ('not_run' as BuilderRun['qualitySummary']['checks'][number]['status']),
          detail: typeof check.detail === 'string' ? check.detail : '',
          metadata: recordValue(check.metadata),
        }))
    : [];
  return {
    status:
      summary.status === 'passed' ||
      summary.status === 'needs_review' ||
      summary.status === 'failed'
        ? summary.status
        : 'not_run',
    checks,
    generatedAt: typeof summary.generatedAt === 'string' ? summary.generatedAt : undefined,
  };
}

function agentPackageFromRow(row: DatabaseRow): AgentPackage {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    version: readNumber(row, 'version'),
    status:
      status === 'draft' ||
      status === 'test_ready' ||
      status === 'production_ready' ||
      status === 'published' ||
      status === 'superseded'
        ? status
        : 'draft',
    basePackageId: readOptionalString(row, 'base_package_id'),
    builderContractVersion: readString(row, 'builder_contract_version'),
    foundationVersion: readString(row, 'foundation_version'),
    foundationChecksum: readOptionalString(row, 'foundation_checksum'),
    contractAddendum: readOptionalString(row, 'contract_addendum') ?? '',
    instructionsAddendum: readOptionalString(row, 'instructions_addendum') ?? '',
    summary: readOptionalString(row, 'summary') ?? '',
    capabilityAssessment:
      readString(row, 'capability_assessment') === 'foundation_change_required'
        ? 'foundation_change_required'
        : 'policy_only',
    capabilityProposal: readOptionalString(row, 'capability_proposal'),
    stagedBehaviourIds: Array.isArray(row.staged_behaviour_ids)
      ? row.staged_behaviour_ids.filter((value): value is string => typeof value === 'string')
      : [],
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
    approvedAt: readOptionalString(row, 'approved_at'),
    publishedAt: readOptionalString(row, 'published_at'),
  };
}

function agentPackageProposalFromRow(row: DatabaseRow): AgentPackageProposal {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    basePackageId: readString(row, 'base_package_id'),
    draftPackageId: readOptionalString(row, 'draft_package_id'),
    direction: readString(row, 'direction'),
    status:
      status === 'queued' ||
      status === 'running' ||
      status === 'ready' ||
      status === 'failed' ||
      status === 'accepted' ||
      status === 'rejected'
        ? status
        : 'failed',
    summary: readOptionalString(row, 'summary'),
    capabilityAssessment:
      readString(row, 'capability_assessment') === 'foundation_change_required'
        ? 'foundation_change_required'
        : readString(row, 'capability_assessment') === 'policy_only'
          ? 'policy_only'
          : undefined,
    capabilityProposal: readOptionalString(row, 'capability_proposal'),
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function builderRunFromRow(row: DatabaseRow): BuilderRun {
  const status = readString(row, 'status');
  const agentPackage = recordValue(row.agent_packages);
  const builderArtifacts = Array.isArray(row.builder_artifacts)
    ? (row.builder_artifacts as DatabaseRow[])
    : undefined;
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    buildManifestId: readString(row, 'build_manifest_id'),
    parentBuilderRunId: readOptionalString(row, 'parent_builder_run_id'),
    buildMode:
      readString(row, 'build_mode') === 'full_site'
        ? 'full_site'
        : readString(row, 'build_mode') === 'site_test'
          ? 'site_test'
          : readString(row, 'build_mode') === 'page_test'
            ? 'page_test'
            : 'homepage_test',
    targetSourceUrl: readOptionalString(row, 'target_source_url'),
    targetSourceUrls: Array.isArray(row.target_source_urls)
      ? row.target_source_urls.filter(
          (sourceUrl): sourceUrl is string => typeof sourceUrl === 'string' && Boolean(sourceUrl),
        )
      : undefined,
    buildInstruction: readOptionalString(row, 'build_instruction'),
    agentPackageId: readOptionalString(row, 'agent_package_id'),
    agentPackageVersion: readOptionalNumber(agentPackage, 'version'),
    agentStudioSourceAt: readOptionalString(row, 'agent_studio_source_at'),
    agentStudioFeatureId: readOptionalString(row, 'agent_studio_feature_id'),
    sourceCheckpointAvailable: builderArtifacts
      ? builderArtifacts.some((artifact) => readString(artifact, 'kind') === 'checkpoint')
      : undefined,
    localDevelopmentSourceAvailable: builderArtifacts
      ? builderArtifacts.some((artifact) => {
          const kind = readString(artifact, 'kind');
          const metadata = recordValue(artifact.metadata);
          return (
            (kind === 'source_bundle' &&
              typeof metadata.localDevelopmentHandoffVersion === 'number') ||
            (kind === 'draft_file' && metadata.state === 'final_source')
          );
        })
      : undefined,
    status:
      status === 'queued' ||
      status === 'running' ||
      status === 'paused' ||
      status === 'ready' ||
      status === 'review_required' ||
      status === 'failed' ||
      status === 'cancelled'
        ? status
        : 'queued',
    templateVersion: readString(row, 'template_version'),
    model: readOptionalString(row, 'model'),
    progressPhase: readString(row, 'progress_phase') || 'queued',
    progressDetail: readOptionalString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    attemptCount: readNumber(row, 'attempt_count'),
    heartbeatAt: readOptionalString(row, 'heartbeat_at'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    errorSummary: readOptionalString(row, 'error_summary'),
    failureCode: readOptionalString(row, 'failure_code'),
    failureStage: readOptionalString(row, 'failure_stage'),
    failureAction: readOptionalString(row, 'failure_action'),
    failureContext: recordValue(row.failure_context),
    retryAfter: readOptionalString(row, 'retry_after'),
    qualitySummary: builderQualitySummary(row.quality_summary),
    startedAt: readOptionalString(row, 'started_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function builderArtifactFromRow(row: DatabaseRow): BuilderArtifact {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readString(row, 'builder_run_id'),
    kind: readString(row, 'kind') as BuilderArtifact['kind'],
    label: readString(row, 'label'),
    storageBucket: readOptionalString(row, 'storage_bucket') ?? 'siteforge-artifacts',
    storagePath: readString(row, 'storage_path'),
    contentType: readOptionalString(row, 'content_type'),
    byteSize: typeof row.byte_size === 'number' ? row.byte_size : undefined,
    metadata: recordValue(row.metadata),
    createdAt: readString(row, 'created_at'),
  };
}

function clientPreviewPublicationFromRow(row: DatabaseRow): ClientPreviewPublication {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readString(row, 'builder_run_id'),
    clientName: readString(row, 'client_name'),
    contactName: readString(row, 'contact_name'),
    clientEmail: readString(row, 'client_email'),
    projectName: readString(row, 'project_name'),
    finalBalanceCents: readOptionalNumber(row, 'final_balance_cents'),
    pricingSnapshot: Object.keys(recordValue(row.pricing_snapshot)).length
      ? (recordValue(row.pricing_snapshot) as ClientPreviewPublication['pricingSnapshot'])
      : undefined,
    currency: readString(row, 'currency') || 'AUD',
    handoffNotes: readString(row, 'handoff_notes'),
    status:
      status === 'running' || status === 'ready' || status === 'failed' || status === 'cancelled'
        ? status
        : 'queued',
    progressPhase: readString(row, 'progress_phase') || 'queued',
    progressDetail: readOptionalString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    deploymentUrl: readOptionalString(row, 'deployment_url'),
    clientspaceHandoffId: readOptionalString(row, 'clientspace_handoff_id'),
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function madeSolidHandoffFromRow(row: DatabaseRow): MadeSolidHandoff {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readString(row, 'builder_run_id'),
    sourceRepositoryUrl: readString(row, 'source_repository_url'),
    sourceBranch: readString(row, 'source_branch'),
    sourceCommit: readString(row, 'source_commit'),
    sourceEditVersion: readNumber(row, 'source_edit_version'),
    clientName: readString(row, 'client_name'),
    contactName: readString(row, 'contact_name'),
    clientEmail: readString(row, 'client_email'),
    projectName: readString(row, 'project_name'),
    handoffNotes: readString(row, 'handoff_notes'),
    pricingSnapshot: Object.keys(recordValue(row.pricing_snapshot)).length
      ? (recordValue(row.pricing_snapshot) as MadeSolidHandoff['pricingSnapshot'])
      : undefined,
    status:
      status === 'running' || status === 'ready' || status === 'failed' || status === 'cancelled'
        ? status
        : 'queued',
    progressPhase: readString(row, 'progress_phase') || 'queued',
    progressDetail: readString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    websiteHandoffId: readOptionalString(row, 'website_handoff_id'),
    websiteAdminUrl: readOptionalString(row, 'website_admin_url'),
    releaseAttestationId: readOptionalString(row, 'release_attestation_id'),
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function sourceReleaseAttestationFromRow(row: DatabaseRow): SourceReleaseAttestation {
  const checks = Array.isArray(row.checks)
    ? row.checks.flatMap((raw) => {
        const check = recordValue(raw);
        const id = readString(check, 'id');
        const label = readString(check, 'label');
        const detail = readString(check, 'detail');
        return id && label && detail && check.status === 'passed'
          ? [{ id, label, detail, status: 'passed' as const }]
          : [];
      })
    : [];
  return {
    id: readString(row, 'id'),
    attestationId: readString(row, 'attestation_id'),
    businessId: readString(row, 'business_id'),
    sourceBuilderRunId: readString(row, 'source_builder_run_id'),
    sourceManifestId: readString(row, 'source_manifest_id'),
    sourceRepositoryUrl: readString(row, 'source_repository_url'),
    sourceCommit: readString(row, 'source_commit'),
    sourceTree: readString(row, 'source_tree'),
    sourceBranch: readString(row, 'source_branch'),
    sourceEditVersion: readNumber(row, 'source_edit_version'),
    verificationProfile: readString(row, 'verification_profile'),
    verifiedAt: readString(row, 'verified_at'),
    checks,
    sourceBuilderStatus: readString(row, 'source_builder_status'),
    sourceBuilderQualitySummary: Object.keys(recordValue(row.source_builder_quality_summary)).length
      ? recordValue(row.source_builder_quality_summary)
      : undefined,
    createdAt: readString(row, 'created_at'),
  };
}

function githubWorkspacePublicationFromRow(row: DatabaseRow): GithubWorkspacePublication {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readString(row, 'builder_run_id'),
    repositoryOwner: readString(row, 'repository_owner'),
    repositoryName: readString(row, 'repository_name'),
    repositoryDescription: readString(row, 'repository_description'),
    visibility: 'private',
    status:
      status === 'running' || status === 'ready' || status === 'failed' || status === 'cancelled'
        ? status
        : 'queued',
    progressPhase: readString(row, 'progress_phase') || 'queued',
    progressDetail: readOptionalString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    repositoryUrl: readOptionalString(row, 'github_repository_url'),
    cloneUrl: readOptionalString(row, 'github_clone_url'),
    fullName: readOptionalString(row, 'github_full_name'),
    defaultBranch: readOptionalString(row, 'github_default_branch'),
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function builderEventFromRow(row: DatabaseRow): BuilderEvent {
  const kind = readString(row, 'kind');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readString(row, 'builder_run_id'),
    sequence: readNumber(row, 'sequence'),
    kind:
      kind === 'stage' ||
      kind === 'activity' ||
      kind === 'file' ||
      kind === 'quality' ||
      kind === 'diagnostic' ||
      kind === 'error'
        ? kind
        : 'activity',
    message: readString(row, 'message'),
    metadata: recordValue(row.metadata),
    createdAt: readString(row, 'created_at'),
  };
}

function aiUsageRecordFromRow(row: DatabaseRow): AiUsageRecord {
  const source = readString(row, 'source');
  const costSource = readString(row, 'cost_source');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    builderRunId: readOptionalString(row, 'builder_run_id'),
    source:
      source === 'asset_analysis' || source === 'capability_analysis' || source === 'codex_build'
        ? source
        : 'asset_analysis',
    provider: readString(row, 'provider'),
    model: readString(row, 'model'),
    inputTokens: readNumber(row, 'input_tokens'),
    cachedInputTokens: readNumber(row, 'cached_input_tokens'),
    outputTokens: readNumber(row, 'output_tokens'),
    reasoningTokens: readNumber(row, 'reasoning_tokens'),
    totalTokens: readNumber(row, 'total_tokens'),
    costUsd: readOptionalNumber(row, 'cost_usd'),
    costSource:
      costSource === 'provider_reported' || costSource === 'configured_rate'
        ? costSource
        : 'unavailable',
    pricingVersion: readOptionalString(row, 'pricing_version'),
    metadata: recordValue(row.metadata),
    createdAt: readString(row, 'created_at'),
  };
}

function auditFromRow(row: DatabaseRow, findings: AuditFinding[]): Audit {
  const cancelRequestedAt = readOptionalString(row, 'cancel_requested_at');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    version: readNumber(row, 'version'),
    crawlRunId: readOptionalString(row, 'crawl_run_id'),
    status:
      cancelRequestedAt && readString(row, 'status') === 'failed'
        ? 'cancelled'
        : auditStatus(readString(row, 'status')),
    findings,
    progressPhase: readOptionalString(row, 'progress_phase'),
    progressDetail: readOptionalString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt,
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function findingFromRow(row: DatabaseRow): AuditFinding {
  const evidenceIds = Array.isArray(row.evidence_fact_ids)
    ? row.evidence_fact_ids.filter((value): value is string => typeof value === 'string')
    : [];
  const evidenceArtifactIds = Array.isArray(row.evidence_artifact_ids)
    ? row.evidence_artifact_ids.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    id: readString(row, 'id'),
    area: readString(row, 'area') as AuditFinding['area'],
    severity: readString(row, 'severity') as AuditFinding['severity'],
    title: readString(row, 'title'),
    finding: readString(row, 'finding'),
    recommendation: readString(row, 'recommendation'),
    evidenceIds,
    evidenceArtifactIds,
    sourceUrls: Array.isArray(row.source_urls)
      ? row.source_urls.filter((value): value is string => typeof value === 'string')
      : [],
    specialistKind: readOptionalString(row, 'specialist_kind') as AuditFinding['specialistKind'],
    findingClass: readOptionalString(row, 'finding_class') as AuditFinding['findingClass'],
    customerImpact: readOptionalString(row, 'customer_impact'),
    confidence: readOptionalString(row, 'confidence') as AuditFinding['confidence'],
    reviewState: readString(row, 'review_state') as AuditFinding['reviewState'],
  };
}

function auditSpecialistTaskFromRow(row: DatabaseRow): AuditSpecialistTask {
  const cancelRequestedAt = readOptionalString(row, 'cancel_requested_at');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    auditId: readString(row, 'audit_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    specialistKind: readString(row, 'specialist_kind') as AuditSpecialistTask['specialistKind'],
    status:
      cancelRequestedAt && readString(row, 'progress_phase') === 'cancelled'
        ? 'cancelled'
        : auditStatus(readString(row, 'status')),
    progressPhase: readOptionalString(row, 'progress_phase'),
    progressDetail: readOptionalString(row, 'progress_detail'),
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt,
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function auditObservationFromRow(row: DatabaseRow): AuditObservation {
  const viewportRecord = recordValue(row.viewport);
  const width = readNumber(viewportRecord, 'width');
  const height = readNumber(viewportRecord, 'height');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    auditId: readString(row, 'audit_id'),
    specialistTaskId: readString(row, 'specialist_task_id'),
    crawlRunId: readString(row, 'crawl_run_id'),
    specialistKind: readString(row, 'specialist_kind') as AuditObservation['specialistKind'],
    area: readString(row, 'area') as AuditObservation['area'],
    findingClass: readString(row, 'finding_class') as AuditObservation['findingClass'],
    severity: readString(row, 'severity') as AuditObservation['severity'],
    title: readString(row, 'title'),
    observation: readString(row, 'observation'),
    customerImpact: readString(row, 'customer_impact'),
    recommendation: readString(row, 'recommendation'),
    sourceUrls: stringArray(row.source_urls),
    evidenceFactIds: stringArray(row.evidence_fact_ids),
    evidenceArtifactIds: stringArray(row.evidence_artifact_ids),
    viewport:
      width > 0 && height > 0
        ? { width, height, label: readOptionalString(viewportRecord, 'label') }
        : undefined,
    interactionState: readOptionalString(row, 'interaction_state'),
    selector: readOptionalString(row, 'selector'),
    measurement: recordValue(row.measurement),
    confidence: readString(row, 'confidence') as AuditObservation['confidence'],
    reviewState: readString(row, 'review_state') as AuditObservation['reviewState'],
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function conceptFromRow(row: DatabaseRow): RedesignConcept {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    status: readString(row, 'status') as RedesignConcept['status'],
    version: typeof row.version === 'number' ? row.version : 1,
    summary: readString(row, 'summary'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function reportFromRow(row: DatabaseRow): DecisionReport {
  const storedStatus = readString(row, 'status');
  const reviewState = readOptionalString(row, 'review_state') as DecisionReport['reviewState'];
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    auditId: readOptionalString(row, 'audit_id'),
    crawlRunId: readOptionalString(row, 'crawl_run_id'),
    status:
      storedStatus === 'not_started' ||
      storedStatus === 'draft' ||
      storedStatus === 'ready' ||
      storedStatus === 'approved'
        ? storedStatus
        : reviewState === 'approved'
          ? 'approved'
          : 'draft',
    version: typeof row.version === 'number' ? row.version : 1,
    schemaVersion: readOptionalNumber(row, 'schema_version'),
    reviewState,
    summary: readString(row, 'summary'),
    data: recordValue(row.data),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at') || readString(row, 'created_at'),
  };
}

function reportPreviewJobFromRow(row: DatabaseRow): ReportPreviewJob {
  const status = readString(row, 'status');
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    reportVersionId: readString(row, 'report_version_id'),
    status:
      status === 'running' || status === 'ready' || status === 'failed' || status === 'cancelled'
        ? status
        : 'queued',
    progressPhase: readString(row, 'progress_phase') || 'queued',
    progressDetail:
      readString(row, 'progress_detail') || 'Waiting for the protected report preview worker.',
    totalItems: readNumber(row, 'total_items'),
    completedItems: readNumber(row, 'completed_items'),
    cancelRequestedAt: readOptionalString(row, 'cancel_requested_at'),
    remotePreviewId: readOptionalString(row, 'remote_preview_id'),
    previewUrl: readOptionalString(row, 'preview_url'),
    previewExpiresAt: readOptionalString(row, 'preview_expires_at'),
    errorSummary: readOptionalString(row, 'error_summary'),
    createdAt: readString(row, 'created_at'),
    completedAt: readOptionalString(row, 'completed_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function taskFromRow(row: DatabaseRow): Task {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    body: readString(row, 'body'),
    dueAt: readOptionalString(row, 'due_at'),
    state: readString(row, 'state') as Task['state'],
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function activityFromRow(row: DatabaseRow): Activity {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    type: readString(row, 'type') as Activity['type'],
    message: readString(row, 'message'),
    createdAt: readString(row, 'created_at'),
  };
}

function outreachComplianceFromRow(row: DatabaseRow): OutreachCompliance {
  return {
    id: readString(row, 'id'),
    businessId: readString(row, 'business_id'),
    contactId: readOptionalString(row, 'contact_id'),
    consentBasis: readString(row, 'consent_basis') as OutreachCompliance['consentBasis'],
    sourceUrl: readOptionalString(row, 'source_url'),
    sourceNote: readString(row, 'source_note'),
    emailAllowed: row.email_allowed === true,
    phoneAllowed: row.phone_allowed === true,
    doNotCallCheckedAt: readOptionalString(row, 'do_not_call_checked_at'),
    doNotCallClear: row.do_not_call_clear === true,
    senderIdentificationConfirmed: row.sender_identification_confirmed === true,
    unsubscribeProcessConfirmed: row.unsubscribe_process_confirmed === true,
    suppressedAt: readOptionalString(row, 'suppressed_at'),
    suppressionReason: readOptionalString(row, 'suppression_reason'),
    campaignCohort: readOptionalString(row, 'campaign_cohort'),
    notes: readString(row, 'notes'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function domainFromUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).hostname.replace(/^www\./, '');
}

function displayName(domain: string) {
  return domain
    .split('.')[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function warnOptionalIntegrationError(integration: string, error: { message: string } | null) {
  if (!error) return;
  console.warn(`${integration} is unavailable; core workspace loading will continue.`, error);
}

function isMissingMadeSolidHandoffSchema(error: { code?: string; message: string } | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    ((error.message.includes('made_solid_handoffs') ||
      error.message.includes('request_made_solid_handoff') ||
      error.message.includes('cancel_made_solid_handoff')) &&
      error.message.includes('schema cache'))
  );
}

function isMissingSourceReleaseAttestationSchema(error: { code?: string; message: string } | null) {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    (error.message.includes('source_release_attestations') &&
      error.message.includes('schema cache'))
  );
}

function isDuplicateWebsiteError(error: { code?: string } | null) {
  return error?.code === '23505';
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
  ) {}

  async listAgentPackages() {
    const { data, error } = await this.client
      .from('agent_packages')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('version', { ascending: false });
    throwIfError(error);
    return (data ?? []).map((row) => agentPackageFromRow(row as DatabaseRow));
  }

  async listAgentPackageProposals() {
    const { data, error } = await this.client
      .from('agent_package_proposals')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false });
    throwIfError(error);
    return (data ?? []).map((row) => agentPackageProposalFromRow(row as DatabaseRow));
  }

  async requestAgentPackageProposal(basePackageId: string, direction: string) {
    const { data, error } = await this.client.rpc('request_agent_package_proposal', {
      target_base_package_id: basePackageId,
      requested_direction: direction.trim(),
    });
    throwIfError(error);
    const { data: proposal, error: proposalError } = await this.client
      .from('agent_package_proposals')
      .select('*')
      .eq('id', data)
      .single();
    throwIfError(proposalError);
    return agentPackageProposalFromRow(proposal as DatabaseRow);
  }

  async approveAgentPackageForTesting(packageId: string) {
    const { data, error } = await this.client.rpc('approve_agent_package_for_testing', {
      target_package_id: packageId,
    });
    throwIfError(error);
    return agentPackageFromRow(data as DatabaseRow);
  }

  async approveAgentPackageForProduction(packageId: string) {
    const { data, error } = await this.client.rpc('approve_agent_package_for_production', {
      target_package_id: packageId,
    });
    throwIfError(error);
    return agentPackageFromRow(data as DatabaseRow);
  }

  async stageAgentPackageBehaviours(packageId: string, behaviourIds: string[]) {
    const { data, error } = await this.client.rpc('stage_agent_package_behaviours', {
      target_package_id: packageId,
      requested_staged_behaviour_ids: behaviourIds,
    });
    throwIfError(error);
    return agentPackageFromRow(data as DatabaseRow);
  }

  async promoteAgentPackage(packageId: string) {
    const { data, error } = await this.client.rpc('promote_agent_package', {
      target_package_id: packageId,
    });
    throwIfError(error);
    return agentPackageFromRow(data as DatabaseRow);
  }

  async bootstrap() {
    // Authentication and organization membership are established before this adapter is created.
  }

  async listTaxExpenses() {
    const { data, error } = await this.client
      .from('tax_expenses')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('incurred_on', { ascending: false })
      .order('created_at', { ascending: false });
    throwIfError(error);
    return ((data ?? []) as DatabaseRow[]).map(taxExpenseFromRow);
  }

  async createTaxExpense(input: TaxExpenseInput) {
    const { data, error } = await this.client
      .from('tax_expenses')
      .insert({ organization_id: this.organizationId, ...taxExpenseRecord(input) })
      .select('*')
      .single();
    throwIfError(error);
    return taxExpenseFromRow(data as DatabaseRow);
  }

  async updateTaxExpense(expenseId: string, input: TaxExpenseInput) {
    const { data, error } = await this.client
      .from('tax_expenses')
      .update(taxExpenseRecord(input))
      .eq('id', expenseId)
      .eq('organization_id', this.organizationId)
      .select('*')
      .single();
    throwIfError(error);
    return taxExpenseFromRow(data as DatabaseRow);
  }

  async deleteTaxExpense(expenseId: string) {
    const { error } = await this.client
      .from('tax_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('organization_id', this.organizationId);
    throwIfError(error);
  }

  async listBusinesses() {
    const { data, error } = await this.client
      .from('businesses')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('updated_at', { ascending: false });
    throwIfError(error);
    return ((data ?? []) as DatabaseRow[]).map(businessFromRow);
  }

  async getWorkspace(
    businessId: string,
    reconcileBuilderLifecycle = true,
  ): Promise<ProspectWorkspace | undefined> {
    const { data: businessRow, error: businessError } = await this.client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('organization_id', this.organizationId)
      .maybeSingle();
    throwIfError(businessError);
    if (!businessRow) return undefined;

    if (reconcileBuilderLifecycle) {
      const { error: lifecycleError } = await this.client.rpc('reconcile_builder_run_lifecycle', {
        target_business_id: businessId,
      });
      throwIfError(lifecycleError);
      const { error: githubLifecycleError } = await this.client.rpc(
        'reconcile_github_workspace_publications',
        { target_business_id: businessId },
      );
      warnOptionalIntegrationError('GitHub workspace reconciliation', githubLifecycleError);
    }

    const [
      websites,
      contacts,
      facts,
      audits,
      auditSpecialistTasks,
      auditObservations,
      assetJobs,
      visualContentJobs,
      briefs,
      manifests,
      builderRuns,
      concepts,
      reports,
      reportVersions,
      reportPreviewJobs,
      sourceReleaseAttestations,
      tasks,
      activity,
      aiUsageRecords,
      clientPreviewPublications,
      madeSolidHandoffs,
      githubWorkspacePublications,
      githubWorkspaceWorkerAvailable,
      madeSolidHandoffWorkerAvailable,
      reportPreviewWorkerAvailable,
    ] = await Promise.all([
      this.client.from('websites').select('*').eq('business_id', businessId).limit(1),
      this.client.from('contacts').select('*').eq('business_id', businessId),
      this.client.from('evidence_facts').select('*').eq('business_id', businessId),
      this.client
        .from('audits')
        .select('*')
        .eq('business_id', businessId)
        .order('version', { ascending: false })
        .limit(1),
      this.client
        .from('audit_specialist_tasks')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at'),
      this.client
        .from('audit_observations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at'),
      this.client
        .from('asset_analysis_jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('visual_content_jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1),
      this.client
        .from('redesign_briefs')
        .select('*')
        .eq('business_id', businessId)
        .order('version', { ascending: false }),
      this.client
        .from('build_manifests')
        .select('*')
        .eq('business_id', businessId)
        .order('generated_at', { ascending: false }),
      this.client
        .from('builder_runs')
        .select('*, agent_packages(version)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('redesign_concepts')
        .select('*')
        .eq('business_id', businessId)
        .order('version', { ascending: false })
        .limit(1),
      this.client
        .from('decision_reports')
        .select('*')
        .eq('business_id', businessId)
        .order('version', { ascending: false })
        .limit(1),
      this.client
        .from('decision_report_versions')
        .select('*')
        .eq('business_id', businessId)
        .order('version', { ascending: false }),
      this.client
        .from('report_preview_jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('source_release_attestations')
        .select('*')
        .eq('business_id', businessId)
        .order('verified_at', { ascending: false }),
      this.client
        .from('tasks')
        .select('*')
        .eq('business_id', businessId)
        .order('state')
        .order('created_at'),
      this.client
        .from('activities')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('ai_usage_records')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('client_preview_publications')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('made_solid_handoffs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client
        .from('github_workspace_publications')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      this.client.rpc('github_workspace_worker_available'),
      this.client.rpc('made_solid_handoff_worker_available'),
      this.client.rpc('report_preview_worker_available'),
    ]);
    [
      websites,
      contacts,
      facts,
      audits,
      auditSpecialistTasks,
      auditObservations,
      assetJobs,
      visualContentJobs,
      briefs,
      manifests,
      builderRuns,
      concepts,
      reports,
      reportVersions,
      tasks,
      activity,
      aiUsageRecords,
      clientPreviewPublications,
    ].forEach((result) => throwIfError(result.error));
    warnOptionalIntegrationError('Private report preview history', reportPreviewJobs.error);
    warnOptionalIntegrationError(
      'Edited website release verification',
      sourceReleaseAttestations.error,
    );
    warnOptionalIntegrationError(
      'Private report preview worker status',
      reportPreviewWorkerAvailable.error,
    );
    warnOptionalIntegrationError('Made Solid handoff history', madeSolidHandoffs.error);
    warnOptionalIntegrationError(
      'GitHub workspace publication history',
      githubWorkspacePublications.error,
    );
    warnOptionalIntegrationError(
      'GitHub workspace worker availability',
      githubWorkspaceWorkerAvailable.error,
    );
    warnOptionalIntegrationError(
      'Made Solid handoff worker availability',
      madeSolidHandoffWorkerAvailable.error,
    );

    const builderRunRows = ((builderRuns.data ?? []) as DatabaseRow[]).map((row) => ({
      ...row,
      builder_artifacts: [] as DatabaseRow[],
    }));
    const builderRunIds = builderRunRows.map((row) => readString(row, 'id')).filter(Boolean);
    const compactBuilderEvidenceResult = builderRunIds.length
      ? await this.client
          .from('builder_artifacts')
          .select('builder_run_id,kind,metadata')
          .in('builder_run_id', builderRunIds)
          .in('kind', ['checkpoint', 'source_bundle'])
      : { data: [], error: null };
    warnOptionalIntegrationError('Builder source availability', compactBuilderEvidenceResult.error);
    const compactBuilderEvidence = (compactBuilderEvidenceResult.data ?? []) as DatabaseRow[];
    const sourceBundleRunIds = new Set(
      compactBuilderEvidence
        .filter((artifact) => {
          const metadata = recordValue(artifact.metadata);
          return (
            readString(artifact, 'kind') === 'source_bundle' &&
            typeof metadata.localDevelopmentHandoffVersion === 'number'
          );
        })
        .map((artifact) => readString(artifact, 'builder_run_id')),
    );
    const finalSourceFallbackResults = await Promise.all(
      builderRunIds
        .filter((builderRunId) => !sourceBundleRunIds.has(builderRunId))
        .map((builderRunId) =>
          this.client
            .from('builder_artifacts')
            .select('builder_run_id,kind,metadata')
            .eq('builder_run_id', builderRunId)
            .eq('kind', 'draft_file')
            .contains('metadata', { state: 'final_source' })
            .limit(1),
        ),
    );
    const finalSourceFallbackEvidence = finalSourceFallbackResults.flatMap((result) => {
      warnOptionalIntegrationError('Builder final-source availability', result.error);
      return (result.data ?? []) as DatabaseRow[];
    });
    const builderEvidenceByRun = new Map<string, DatabaseRow[]>();
    for (const artifact of [...compactBuilderEvidence, ...finalSourceFallbackEvidence]) {
      const builderRunId = readString(artifact, 'builder_run_id');
      if (!builderRunId) continue;
      const evidence = builderEvidenceByRun.get(builderRunId) ?? [];
      evidence.push(artifact);
      builderEvidenceByRun.set(builderRunId, evidence);
    }
    const hydratedBuilderRunRows = builderRunRows.map((row) => ({
      ...row,
      builder_artifacts: builderEvidenceByRun.get(readString(row, 'id')) ?? [],
    }));

    const website = (websites.data ?? [])[0]
      ? websiteFromRow((websites.data ?? [])[0] as DatabaseRow)
      : undefined;
    const captureResult = website
      ? await this.client
          .from('crawl_runs')
          .select('*')
          .eq('website_id', website.id)
          .order('requested_at', { ascending: false })
      : { data: [], error: null };
    throwIfError(captureResult.error);
    const orderedCaptures = ((captureResult.data ?? []) as DatabaseRow[]).map((row) =>
      captureFromRow(row, businessId, website),
    );
    const latestCapture = orderedCaptures[0];
    const previousCapture =
      latestCapture?.status === 'failed' || latestCapture?.status === 'cancelled'
        ? orderedCaptures.find(
            (capture) => capture.id !== latestCapture.id && capture.status === 'ready',
          )
        : undefined;
    const relevantCaptureIds = [latestCapture?.id, previousCapture?.id].filter((id): id is string =>
      Boolean(id),
    );
    const [
      pagesResult,
      artifactsResult,
      packetsResult,
      annotationsResult,
      visualContentResult,
      brandColourEvidenceResult,
      brandKitsResult,
    ] = relevantCaptureIds.length
      ? await Promise.all([
          this.client
            .from('crawl_pages')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('created_at'),
          this.client
            .from('artifacts')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('created_at'),
          this.client
            .from('research_packets')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('generated_at', { ascending: false }),
          this.client
            .from('asset_annotations')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('created_at'),
          this.client
            .from('visual_content_candidates')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('source_page_url')
            .order('created_at'),
          this.client
            .from('brand_colour_evidence')
            .select('*')
            .in('crawl_run_id', relevantCaptureIds)
            .order('created_at'),
          this.client
            .from('brand_kits')
            .select('*')
            .eq('business_id', businessId)
            .order('version', { ascending: false })
            .limit(1),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];
    throwIfError(pagesResult.error);
    throwIfError(artifactsResult.error);
    throwIfError(packetsResult.error);
    throwIfError(annotationsResult.error);
    throwIfError(visualContentResult.error);
    throwIfError(brandColourEvidenceResult.error);
    throwIfError(brandKitsResult.error);
    const logoArtifactsResult = await this.client
      .from('artifacts')
      .select('*')
      .eq('business_id', businessId)
      .eq('kind', 'asset')
      .contains('metadata', { preferredOrganisationLogo: true })
      .order('created_at', { ascending: false });
    throwIfError(logoArtifactsResult.error);
    const editableLogoArtifactsResult = await this.client
      .from('artifacts')
      .select('*')
      .eq('business_id', businessId)
      .eq('kind', 'asset')
      .contains('metadata', { logoVariant: 'editable' })
      .order('created_at', { ascending: false });
    throwIfError(editableLogoArtifactsResult.error);
    const aiEnhancedLogoArtifactsResult = await this.client
      .from('artifacts')
      .select('*')
      .eq('business_id', businessId)
      .eq('kind', 'asset')
      .contains('metadata', { logoVariant: 'ai_enhanced' })
      .order('created_at', { ascending: false });
    throwIfError(aiEnhancedLogoArtifactsResult.error);

    const latestAudit = (audits.data ?? [])[0] as DatabaseRow | undefined;
    const latestBuilderRun = hydratedBuilderRunRows[0];
    const findingResult = latestAudit
      ? await this.client
          .from('audit_findings')
          .select('*')
          .eq('audit_id', readString(latestAudit, 'id'))
      : { data: [], error: null };
    throwIfError(findingResult.error);
    const builderArtifactsResult = latestBuilderRun
      ? await this.client
          .from('builder_artifacts')
          .select('*')
          .eq('builder_run_id', readString(latestBuilderRun, 'id'))
          .order('created_at')
      : { data: [], error: null };
    const [
      builderEventsResult,
      builderCodexEventsResult,
      builderStageEventsResult,
      firstQualityEventResult,
    ] = latestBuilderRun
      ? await Promise.all([
          this.client
            .from('builder_events')
            .select('*')
            .eq('builder_run_id', readString(latestBuilderRun, 'id'))
            .order('sequence', { ascending: false })
            .limit(180),
          this.client
            .from('builder_events')
            .select('*')
            .eq('builder_run_id', readString(latestBuilderRun, 'id'))
            .contains('metadata', { stream: 'codex' })
            .order('sequence'),
          this.client
            .from('builder_events')
            .select('*')
            .eq('builder_run_id', readString(latestBuilderRun, 'id'))
            .eq('kind', 'stage')
            .order('sequence'),
          this.client
            .from('builder_events')
            .select('*')
            .eq('builder_run_id', readString(latestBuilderRun, 'id'))
            .eq('kind', 'quality')
            .order('sequence')
            .limit(1),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];
    throwIfError(builderArtifactsResult.error);
    throwIfError(builderEventsResult.error);
    throwIfError(builderCodexEventsResult.error);
    throwIfError(builderStageEventsResult.error);
    throwIfError(firstQualityEventResult.error);
    const latestBriefRow = (briefs.data ?? [])[0] as DatabaseRow | undefined;
    const briefDraft = recordValue(latestBriefRow?.draft);
    const briefGuidance = Array.isArray(briefDraft.assetGuidance) ? briefDraft.assetGuidance : [];
    const briefAssetIds = briefGuidance
      .map((item: unknown) => readOptionalString(recordValue(item), 'assetId'))
      .filter((id): id is string => Boolean(id));
    const referencedAssetsResult = briefAssetIds.length
      ? await this.client
          .from('artifacts')
          .select('*')
          .eq('business_id', businessId)
          .in('id', briefAssetIds)
      : { data: [], error: null };
    throwIfError(referencedAssetsResult.error);
    const workspaceArtifacts = [
      ...((artifactsResult.data ?? []) as DatabaseRow[])
        .map(artifactFromRow)
        .filter((artifact) => artifact.crawlRunId === latestCapture?.id),
      ...((logoArtifactsResult.data ?? []) as DatabaseRow[]).map(artifactFromRow),
      ...((editableLogoArtifactsResult.data ?? []) as DatabaseRow[]).map(artifactFromRow),
      ...((aiEnhancedLogoArtifactsResult.data ?? []) as DatabaseRow[]).map(artifactFromRow),
      ...((referencedAssetsResult.data ?? []) as DatabaseRow[]).map(artifactFromRow),
    ];
    const assetAnalysisJobs = ((assetJobs.data ?? []) as DatabaseRow[]).map(assetAnalysisFromRow);
    const currentAssetAnalysis = assetAnalysisJobs.find(
      (job) => job.crawlRunId === latestCapture?.id,
    );
    const outreachComplianceResult = await this.client
      .from('outreach_compliance')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();
    throwIfError(outreachComplianceResult.error);

    return {
      business: businessFromRow(businessRow as DatabaseRow),
      website,
      captures: orderedCaptures,
      contacts: ((contacts.data ?? []) as DatabaseRow[]).map(contactFromRow),
      outreachCompliance: outreachComplianceResult.data
        ? outreachComplianceFromRow(outreachComplianceResult.data as DatabaseRow)
        : undefined,
      facts:
        latestCapture?.status === 'ready' ||
        latestCapture?.status === 'running' ||
        latestCapture?.status === 'cancelled'
          ? ((facts.data ?? []) as DatabaseRow[])
              .map(factFromRow)
              .filter((fact) => fact.crawlRunId === latestCapture.id)
          : [],
      latestCapture,
      capturedPages: ((pagesResult.data ?? []) as DatabaseRow[])
        .map((page) => pageFromRow(page, businessId))
        .filter((page) => page.crawlRunId === latestCapture?.id),
      artifacts: [
        ...new Map(workspaceArtifacts.map((artifact) => [artifact.id, artifact])).values(),
      ],
      researchPacket: ((packetsResult.data ?? []) as DatabaseRow[])
        .map(researchPacketFromRow)
        .find((packet) => packet.crawlRunId === latestCapture?.id),
      assetAnalysis: currentAssetAnalysis,
      assetAnalysisJobs,
      assetAnnotations: ((annotationsResult.data ?? []) as DatabaseRow[])
        .map(assetAnnotationFromRow)
        .filter((annotation) => annotation.crawlRunId === latestCapture?.id),
      visualContentCandidates: ((visualContentResult.data ?? []) as DatabaseRow[])
        .map(visualContentCandidateFromRow)
        .filter((candidate) => candidate.crawlRunId === latestCapture?.id),
      visualContentJob: (visualContentJobs.data ?? [])[0]
        ? visualContentJobFromRow((visualContentJobs.data ?? [])[0] as DatabaseRow)
        : undefined,
      brandColourEvidence: ((brandColourEvidenceResult.data ?? []) as DatabaseRow[])
        .map(brandColourEvidenceFromRow)
        .filter((evidence) => evidence.crawlRunId === latestCapture?.id),
      brandKit: (brandKitsResult.data ?? [])[0]
        ? brandKitFromRow((brandKitsResult.data ?? [])[0] as DatabaseRow)
        : undefined,
      redesignBrief: (briefs.data ?? [])[0]
        ? briefFromRow((briefs.data ?? [])[0] as DatabaseRow)
        : undefined,
      redesignBriefs: ((briefs.data ?? []) as DatabaseRow[]).map(briefFromRow),
      buildManifest: (manifests.data ?? [])[0]
        ? buildManifestFromRow((manifests.data ?? [])[0] as DatabaseRow)
        : undefined,
      buildManifests: ((manifests.data ?? []) as DatabaseRow[]).map(buildManifestFromRow),
      latestBuilderRun: latestBuilderRun ? builderRunFromRow(latestBuilderRun) : undefined,
      builderRuns: hydratedBuilderRunRows.map(builderRunFromRow),
      builderArtifacts: ((builderArtifactsResult.data ?? []) as DatabaseRow[]).map(
        builderArtifactFromRow,
      ),
      builderEvents: (
        [
          ...new Map(
            [
              ...((builderEventsResult.data ?? []) as DatabaseRow[]),
              ...((builderCodexEventsResult.data ?? []) as DatabaseRow[]),
              ...((builderStageEventsResult.data ?? []) as DatabaseRow[]),
              ...((firstQualityEventResult.data ?? []) as DatabaseRow[]),
            ].map((event) => [readString(event, 'id'), event]),
          ).values(),
        ] as DatabaseRow[]
      )
        .sort((left, right) => readNumber(left, 'sequence') - readNumber(right, 'sequence'))
        .map(builderEventFromRow),
      clientPreviewPublications: ((clientPreviewPublications.data ?? []) as DatabaseRow[]).map(
        clientPreviewPublicationFromRow,
      ),
      reportPreviewJobs: ((reportPreviewJobs.data ?? []) as DatabaseRow[]).map(
        reportPreviewJobFromRow,
      ),
      reportPreviewWorkerAvailable: reportPreviewWorkerAvailable.data === true,
      madeSolidHandoffs: ((madeSolidHandoffs.data ?? []) as DatabaseRow[]).map(
        madeSolidHandoffFromRow,
      ),
      madeSolidHandoffWorkerAvailable: madeSolidHandoffWorkerAvailable.data === true,
      githubWorkspacePublications: ((githubWorkspacePublications.data ?? []) as DatabaseRow[]).map(
        githubWorkspacePublicationFromRow,
      ),
      githubWorkspaceWorkerAvailable: githubWorkspaceWorkerAvailable.data === true,
      aiUsageRecords: ((aiUsageRecords.data ?? []) as DatabaseRow[]).map(aiUsageRecordFromRow),
      previousCapture,
      previousFacts: previousCapture
        ? ((facts.data ?? []) as DatabaseRow[])
            .map(factFromRow)
            .filter((fact) => fact.crawlRunId === previousCapture.id)
        : [],
      previousArtifacts: previousCapture
        ? ((artifactsResult.data ?? []) as DatabaseRow[])
            .map(artifactFromRow)
            .filter((artifact) => artifact.crawlRunId === previousCapture.id)
        : [],
      audit: latestAudit
        ? auditFromRow(
            latestAudit,
            ((findingResult.data ?? []) as DatabaseRow[]).map(findingFromRow),
          )
        : undefined,
      auditSpecialistTasks: latestAudit
        ? ((auditSpecialistTasks.data ?? []) as DatabaseRow[])
            .map(auditSpecialistTaskFromRow)
            .filter((task) => task.auditId === readString(latestAudit, 'id'))
        : [],
      auditObservations: latestAudit
        ? ((auditObservations.data ?? []) as DatabaseRow[])
            .map(auditObservationFromRow)
            .filter((observation) => observation.auditId === readString(latestAudit, 'id'))
        : [],
      concept: (concepts.data ?? [])[0]
        ? conceptFromRow((concepts.data ?? [])[0] as DatabaseRow)
        : undefined,
      report: (reportVersions.data ?? [])[0]
        ? reportFromRow((reportVersions.data ?? [])[0] as DatabaseRow)
        : (reports.data ?? [])[0]
          ? reportFromRow((reports.data ?? [])[0] as DatabaseRow)
          : undefined,
      reportVersions: ((reportVersions.data ?? []) as DatabaseRow[]).map(reportFromRow),
      sourceReleaseAttestations: ((sourceReleaseAttestations.data ?? []) as DatabaseRow[]).map(
        sourceReleaseAttestationFromRow,
      ),
      sourceReleaseAttestationAvailability: sourceReleaseAttestations.error
        ? isMissingSourceReleaseAttestationSchema(sourceReleaseAttestations.error)
          ? 'schema_unavailable'
          : 'unavailable'
        : 'available',
      tasks: ((tasks.data ?? []) as DatabaseRow[]).map(taskFromRow),
      activity: ((activity.data ?? []) as DatabaseRow[]).map(activityFromRow),
    };
  }

  async listWorkspaces() {
    const { error: lifecycleError } = await this.client.rpc('reconcile_builder_run_lifecycle', {
      target_business_id: null,
    });
    throwIfError(lifecycleError);
    const businesses = await this.listBusinesses();
    const workspaces = await Promise.all(
      businesses.map((business) => this.getWorkspace(business.id, false)),
    );
    return workspaces.filter((workspace): workspace is ProspectWorkspace => Boolean(workspace));
  }

  async getBuilderRunEvidence(builderRunId: string): Promise<BuilderRunEvidence> {
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('id')
      .eq('id', builderRunId)
      .eq('organization_id', this.organizationId)
      .maybeSingle();
    throwIfError(runError);
    if (!run) throw new Error('This private build is unavailable.');

    const [artifacts, events] = await Promise.all([
      this.client
        .from('builder_artifacts')
        .select('*')
        .eq('builder_run_id', builderRunId)
        .order('created_at'),
      this.client
        .from('builder_events')
        .select('*')
        .eq('builder_run_id', builderRunId)
        .order('sequence', { ascending: false }),
    ]);
    throwIfError(artifacts.error);
    throwIfError(events.error);
    return {
      artifacts: ((artifacts.data ?? []) as DatabaseRow[]).map(builderArtifactFromRow),
      events: ((events.data ?? []) as DatabaseRow[]).map(builderEventFromRow).reverse(),
    };
  }

  async createProspect(rawUrl: string, providedName?: string) {
    const domain = domainFromUrl(rawUrl);
    const websiteUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const canonicalUrl = canonicalWebsiteUrl(websiteUrl);
    const { data: existingWebsites, error: existingWebsitesError } = await this.client
      .from('websites')
      .select('url')
      .eq('organization_id', this.organizationId);
    throwIfError(existingWebsitesError);
    if (
      (existingWebsites ?? []).some(
        (website) =>
          typeof website.url === 'string' && canonicalWebsiteUrl(website.url) === canonicalUrl,
      )
    ) {
      throw new Error('You already have this website as a prospect.');
    }
    const { data, error } = await this.client.rpc('create_prospect_workspace', {
      target_organization_id: this.organizationId,
      business_name: providedName?.trim() || displayName(domain) || domain,
      website_url: websiteUrl,
      website_domain: domain,
    });
    if (isDuplicateWebsiteError(error)) {
      throw new Error('You already have this website as a prospect.');
    }
    throwIfError(error);
    const businessId = data as string;
    await this.requestLogoRetrieval(businessId);
    return this.getWorkspace(businessId);
  }

  private async requestLogoRetrieval(businessId: string) {
    const { data, error } = await this.client.rpc('request_logo_retrieval', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The logo retrieval could not be queued.');
  }

  async requestResearchCapture(businessId: string) {
    const { data, error } = await this.client.rpc('request_website_capture', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') {
      throw new Error('The website capture could not be queued.');
    }
    const workspace = await this.getWorkspace(businessId);
    return workspace?.latestCapture;
  }

  async continueResearchCapture(businessId: string) {
    const { data, error } = await this.client.rpc('continue_website_capture', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The website capture could not be continued.');
    const workspace = await this.getWorkspace(businessId);
    return workspace?.latestCapture;
  }

  async cancelResearchCapture(businessId: string) {
    const { error } = await this.client.rpc('cancel_website_capture', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async requestWebsiteAudit(businessId: string) {
    const { data, error } = await this.client.rpc('request_website_audit', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The website audit could not be queued.');
    const workspace = await this.getWorkspace(businessId);
    return workspace?.audit;
  }

  async cancelWebsiteAudit(businessId: string) {
    const { error } = await this.client.rpc('cancel_website_audit', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async updateAuditFinding(
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) {
    const { error } = await this.client
      .from('audit_findings')
      .update({
        title: patch.title,
        finding: patch.finding,
        recommendation: patch.recommendation,
        severity: patch.severity,
        review_state: patch.reviewState,
      })
      .eq('id', finding.id);
    throwIfError(error);
  }

  async updateAuditObservation(
    observationId: string,
    reviewState: AuditObservation['reviewState'],
  ) {
    const { error } = await this.client
      .from('audit_observations')
      .update({ review_state: reviewState })
      .eq('id', observationId);
    throwIfError(error);
  }

  async createDecisionReport(businessId: string, auditId: string) {
    const { data, error } = await this.client.rpc('create_audit_report_version', {
      target_business_id: businessId,
      target_audit_id: auditId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The report draft could not be frozen.');
    const workspace = await this.getWorkspace(businessId);
    return workspace?.reportVersions?.find((report) => report.id === data) ?? workspace?.report;
  }

  async requestReportPreview(reportVersionId: string) {
    const { data, error } = await this.client.rpc('request_report_preview', {
      target_report_version_id: reportVersionId,
    });
    throwIfError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return row ? reportPreviewJobFromRow(row as DatabaseRow) : undefined;
  }

  async cancelReportPreview(jobId: string) {
    const { error } = await this.client.rpc('cancel_report_preview', {
      target_job_id: jobId,
    });
    throwIfError(error);
  }

  async requestAssetAnalysis(businessId: string) {
    const { data, error } = await this.client.rpc('request_asset_analysis', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The visual-asset analysis could not be queued.');
    const workspace = await this.getWorkspace(businessId);
    return workspace?.assetAnalysis;
  }

  async requestBrandColourRefresh(businessId: string) {
    const { data, error } = await this.client.rpc('request_brand_colour_refresh', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The logo-colour refresh could not be queued.');
    const workspace = await this.getWorkspace(businessId);
    return workspace?.assetAnalysis;
  }

  async requestEditableLogoRetry(
    asset: ResearchArtifact,
    options: {
      createEditableSvg?: boolean;
      simplifyGeometry?: boolean;
      vectorizerProvider?: 'vtracer' | 'vectorizer_ai';
    } = {},
  ) {
    const { data: deletionPaths, error: pathsError } = await this.client.rpc(
      'prospect_generated_logo_deletion_paths',
      { include_editable_svg: options.createEditableSvg === true, p_asset_id: asset.id },
    );
    throwIfError(pathsError);
    const pathsByBucket = new Map<string, string[]>();
    for (const row of (deletionPaths ?? []) as DatabaseRow[]) {
      const bucket = readString(row, 'storage_bucket');
      const path = readString(row, 'storage_path');
      if (!bucket || !path) continue;
      pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), path]);
    }
    for (const [bucket, paths] of pathsByBucket) {
      const { error: storageError } = await this.client.storage.from(bucket).remove(paths);
      throwIfError(storageError);
    }
    const { data, error } = await this.client.rpc('request_editable_logo_retry', {
      create_editable_svg: options.createEditableSvg === true,
      target_asset_id: asset.id,
      simplify_geometry: options.simplifyGeometry === true,
      vectorizer_provider:
        options.vectorizerProvider === 'vectorizer_ai' ? 'vectorizer_ai' : 'vtracer',
    });
    if (
      error?.message.includes('request_editable_logo_retry') &&
      error.message.includes('schema cache')
    ) {
      throw new Error(
        'SVG conversion options are not available yet because the editable-logo database migration has not been applied.',
      );
    }
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The SVG conversion retry could not be queued.');
    const workspace = await this.getWorkspace(asset.businessId);
    return workspace?.assetAnalysis;
  }

  async cancelAssetAnalysis(businessId: string) {
    const { error } = await this.client.rpc('cancel_asset_analysis', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async requestAssetRefresh(businessId: string) {
    const { data, error } = await this.client.rpc('request_asset_refresh', {
      target_business_id: businessId,
    });
    throwIfError(error);
    if (typeof data !== 'string') throw new Error('The image-only refresh could not be queued.');
    const workspace = await this.getWorkspace(businessId);
    return (
      workspace?.assetRefresh ?? {
        id: data,
        businessId,
        crawlRunId: '',
        status: 'queued',
        totalItems: 0,
        completedItems: 0,
        discoveredItems: 0,
        savedItems: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async cancelAssetRefresh(businessId: string) {
    const { error } = await this.client.rpc('cancel_asset_refresh', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async setAssetAnalysisSelected(asset: ResearchArtifact, selected: boolean) {
    const { error } = await this.client
      .from('artifacts')
      .update({ metadata: { ...asset.metadata, analysisSelected: selected } })
      .eq('id', asset.id)
      .eq('kind', 'asset');
    throwIfError(error);
    const workspace = await this.getWorkspace(asset.businessId);
    const brief = workspace?.redesignBrief;
    if (!brief || brief.status !== 'draft') return;
    const nextAssetIds = selected
      ? [...new Set([...brief.sourceSelections.assetIds, asset.id])]
      : brief.sourceSelections.assetIds.filter((assetId) => assetId !== asset.id);
    const nextAutoSelectedAssetIds = selected
      ? [...new Set([...brief.sourceSelections.autoSelectedAssetIds, asset.id])]
      : brief.sourceSelections.autoSelectedAssetIds.filter((assetId) => assetId !== asset.id);
    const { error: briefError } = await this.client
      .from('redesign_briefs')
      .update({
        source_selections: {
          ...brief.sourceSelections,
          assetIds: nextAssetIds,
          autoSelectedAssetIds: nextAutoSelectedAssetIds,
        },
      })
      .eq('id', brief.id)
      .eq('status', 'draft');
    throwIfError(briefError);
  }

  async updateAssetAnnotation(
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) {
    const { error } = await this.client
      .from('asset_annotations')
      .update({
        suggested_role: patch.suggestedRole,
        business_association: patch.businessAssociation,
        review_state: patch.reviewState,
        human_notes: patch.humanNotes,
        reviewed_at: patch.reviewState === 'needs_review' ? null : new Date().toISOString(),
      })
      .eq('id', annotation.id);
    throwIfError(error);

    const workspace = await this.getWorkspace(annotation.businessId);
    const brief = workspace?.redesignBrief;
    if (!workspace) return;

    const excludedAssetIds = new Set(
      workspace.assetAnnotations
        .filter(
          (candidate) =>
            candidate.reviewState === 'blocked' || candidate.suggestedRole === 'exclude',
        )
        .map((candidate) => candidate.assetId),
    );
    const brandKit = workspace.brandKit;
    if (brandKit?.status === 'draft' && excludedAssetIds.has(annotation.assetId)) {
      const { error: brandKitError } = await this.client
        .from('brand_kits')
        .update({
          primary_logo_artifact_id:
            brandKit.primaryLogoAssetId === annotation.assetId ? null : brandKit.primaryLogoAssetId,
          editable_logo_artifact_id:
            brandKit.editableLogoAssetId === annotation.assetId
              ? null
              : brandKit.editableLogoAssetId,
          approved_asset_ids: brandKit.approvedAssetIds.filter(
            (assetId) => !excludedAssetIds.has(assetId),
          ),
        })
        .eq('id', brandKit.id)
        .eq('status', 'draft');
      throwIfError(brandKitError);
    }
    if (!brief || brief.status !== 'draft') return;
    const { error: briefError } = await this.client
      .from('redesign_briefs')
      .update({
        source_selections: {
          ...brief.sourceSelections,
          assetIds: brief.sourceSelections.assetIds.filter(
            (assetId) => !excludedAssetIds.has(assetId),
          ),
        },
        draft: {
          ...brief.draft,
          assetGuidance: assetGuidanceFromAnnotations(workspace.assetAnnotations),
        },
      })
      .eq('id', brief.id);
    throwIfError(briefError);
  }

  async requestVisualContentExtraction(businessId: string) {
    const { error } = await this.client.rpc('request_visual_content_extraction', {
      target_business_id: businessId,
    });
    throwIfError(error);
    const { data: candidates, error: candidatesError } = await this.client
      .from('visual_content_candidates')
      .select('*')
      .eq('business_id', businessId)
      .eq('review_state', 'needs_review');
    throwIfError(candidatesError);
    const rows = (candidates ?? []) as DatabaseRow[];
    const crawlRunIds = [
      ...new Set(rows.map((row) => readString(row, 'crawl_run_id')).filter(Boolean)),
    ];
    const sourcePageUrls = new Set(rows.map((row) => readString(row, 'source_page_url')));
    if (crawlRunIds.length && sourcePageUrls.size) {
      const { data: htmlArtifacts, error: htmlArtifactsError } = await this.client
        .from('artifacts')
        .select('storage_bucket, storage_path, metadata')
        .in('crawl_run_id', crawlRunIds)
        .eq('kind', 'html');
      throwIfError(htmlArtifactsError);
      const htmlByPageUrl = new Map<string, string>();
      for (const artifact of (htmlArtifacts ?? []) as DatabaseRow[]) {
        const metadata =
          typeof artifact.metadata === 'object' &&
          artifact.metadata !== null &&
          !Array.isArray(artifact.metadata)
            ? (artifact.metadata as Record<string, unknown>)
            : {};
        const pageUrl = typeof metadata.sourceUrl === 'string' ? metadata.sourceUrl : '';
        if (!sourcePageUrls.has(pageUrl) || htmlByPageUrl.has(pageUrl)) continue;
        const { data: htmlBlob, error: htmlError } = await this.client.storage
          .from(readOptionalString(artifact, 'storage_bucket') ?? 'siteforge-artifacts')
          .download(readString(artifact, 'storage_path'));
        if (htmlError || !htmlBlob) continue;
        htmlByPageUrl.set(pageUrl, await htmlBlob.text());
      }
      await Promise.all(
        rows.map(async (row) => {
          const sourceContext =
            typeof row.source_context === 'object' &&
            row.source_context !== null &&
            !Array.isArray(row.source_context)
              ? (row.source_context as Record<string, unknown>)
              : {};
          const sourceImageUrl =
            typeof sourceContext.sourceImageUrl === 'string' ? sourceContext.sourceImageUrl : '';
          const location = visualSourceLocation(
            htmlByPageUrl.get(readString(row, 'source_page_url')) ?? '',
            sourceImageUrl,
          );
          if (!location) return;
          const { error: locationError } = await this.client
            .from('visual_content_candidates')
            .update({
              section_heading: location.heading,
              source_presentation: location.sourcePresentation,
              source_context: {
                ...sourceContext,
                sectionAssociation: location.heading
                  ? 'nearest_preceding_heading_in_saved_html'
                  : 'page_only',
              },
            })
            .eq('id', readString(row, 'id'))
            .eq('review_state', 'needs_review');
          throwIfError(locationError);
        }),
      );
    }
    const { data: jobId, error: queueError } = await this.client.rpc(
      'request_structured_visual_content',
      { target_business_id: businessId },
    );
    throwIfError(queueError);
    const { data: job, error: jobError } = await this.client
      .from('visual_content_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    throwIfError(jobError);
    return job ? visualContentJobFromRow(job as DatabaseRow) : undefined;
  }

  async cancelVisualContentExtraction(businessId: string) {
    const { error } = await this.client.rpc('cancel_structured_visual_content', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async updateVisualContentCandidate(
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
  ) {
    const { error } = await this.client
      .from('visual_content_candidates')
      .update({
        content_type: patch.contentType,
        review_state: patch.reviewState,
        human_title: patch.humanTitle,
        human_body: patch.humanBody,
        human_attribution: patch.humanAttribution,
        human_notes: patch.humanNotes,
        human_structured_content: patch.humanStructuredContent,
        reviewed_at: patch.reviewState === 'needs_review' ? null : new Date().toISOString(),
      })
      .eq('id', candidate.id);
    throwIfError(error);

    const workspace = await this.getWorkspace(candidate.businessId);
    const brief = workspace?.redesignBrief;
    if (!workspace || !brief || brief.status !== 'draft') return;
    const approvedVisualContent = workspace.visualContentCandidates
      .map((item) => (item.id === candidate.id ? { ...item, ...patch } : item))
      .filter((item) => item.reviewState === 'approved')
      .map((item) => ({
        id: item.id,
        assetId: item.assetId,
        contentType: item.contentType,
        title: item.humanTitle || item.title,
        body: item.humanBody || item.body,
        attribution: item.humanAttribution || item.attribution,
        sourcePageUrl: item.sourcePageUrl,
        sectionHeading: item.sectionHeading,
        sourcePresentation: item.sourcePresentation,
        presentationInstruction: 'builder_decides' as const,
        structuredContent:
          Object.keys(item.humanStructuredContent).length > 0
            ? (item.humanStructuredContent as StructuredVisualContent)
            : item.structuredContent,
      }));
    const { error: briefError } = await this.client
      .from('redesign_briefs')
      .update({ draft: { ...brief.draft, approvedVisualContent } })
      .eq('id', brief.id)
      .eq('status', 'draft');
    throwIfError(briefError);
  }

  async saveDerivedSvgLogo(asset: ResearchArtifact, svg: string) {
    if (asset.contentType !== 'image/svg+xml' || asset.metadata.logoVariant !== 'editable') {
      throw new Error('Only derived editable SVG logos can be changed.');
    }
    const content = new Blob([svg], { type: 'image/svg+xml' });
    const { error: uploadError } = await this.client.storage
      .from(asset.storageBucket)
      .upload(asset.storagePath, content, { contentType: 'image/svg+xml', upsert: true });
    throwIfError(uploadError);
    const digest = await crypto.subtle.digest('SHA-256', await content.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
    const { error } = await this.client
      .from('artifacts')
      .update({
        byte_size: content.size,
        sha256,
        metadata: { ...asset.metadata, editedAt: new Date().toISOString() },
      })
      .eq('id', asset.id);
    throwIfError(error);
  }

  async deleteDerivedSvgLogo(asset: ResearchArtifact) {
    if (asset.contentType !== 'image/svg+xml' || asset.metadata.vectorSuggestion !== true) {
      throw new Error('Only generated SVG logo variants can be deleted.');
    }
    const { error: storageError } = await this.client.storage
      .from(asset.storageBucket)
      .remove([asset.storagePath]);
    throwIfError(storageError);
    const { error } = await this.client.from('artifacts').delete().eq('id', asset.id);
    throwIfError(error);
  }

  async deleteLogoAsset(asset: ResearchArtifact) {
    if (asset.kind !== 'asset' || asset.metadata.assetType !== 'logo') {
      throw new Error('Only organisation logo assets can be permanently deleted.');
    }
    const { data: deletionPaths, error: pathsError } = await this.client.rpc(
      'prospect_logo_deletion_paths',
      { p_asset_id: asset.id },
    );
    throwIfError(pathsError);
    const pathsByBucket = new Map<string, string[]>();
    for (const row of (deletionPaths ?? []) as DatabaseRow[]) {
      const bucket = readString(row, 'storage_bucket');
      const path = readString(row, 'storage_path');
      if (!bucket || !path) continue;
      pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), path]);
    }
    if (!pathsByBucket.size) throw new Error('The organisation logo files could not be found.');
    for (const [bucket, paths] of pathsByBucket) {
      const { error: storageError } = await this.client.storage.from(bucket).remove(paths);
      throwIfError(storageError);
    }
    const { error } = await this.client.rpc('delete_prospect_logo_asset', {
      p_asset_id: asset.id,
    });
    throwIfError(error);
  }

  async saveBrandKit(
    businessId: string,
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve = false,
    recordActivity = true,
  ) {
    const workspace = await this.getWorkspace(businessId);
    if (!workspace?.latestCapture || workspace.latestCapture.status !== 'ready') {
      throw new Error('A completed website capture is required before a Brand Kit can be saved.');
    }
    const assetIds = [...new Set(draft.approvedAssetIds)];
    if (draft.primaryLogoAssetId && !assetIds.includes(draft.primaryLogoAssetId)) {
      assetIds.unshift(draft.primaryLogoAssetId);
    }
    if (draft.editableLogoAssetId && !assetIds.includes(draft.editableLogoAssetId)) {
      assetIds.push(draft.editableLogoAssetId);
    }
    if (approve) {
      if (!draft.primaryLogoAssetId)
        throw new Error('Choose the organisation logo before approval.');
      const primaryReviewed = !['accent_only', 'builder_derived'].includes(
        draft.palette.mode ?? 'primary_and_accent',
      );
      const accentReviewed = !['primary_only', 'builder_derived'].includes(
        draft.palette.mode ?? 'primary_and_accent',
      );
      if (primaryReviewed && !/^#[0-9a-f]{6}$/i.test(draft.palette.primary ?? '')) {
        throw new Error('Enter a reviewed six-digit primary brand colour before approval.');
      }
      if (accentReviewed && !/^#[0-9a-f]{6}$/i.test(draft.palette.accent ?? '')) {
        throw new Error('Enter a reviewed six-digit accent colour before approval.');
      }
    }
    const existing = workspace.brandKit;
    const payload = {
      primary_logo_artifact_id: draft.primaryLogoAssetId || null,
      ...(draft.editableLogoAssetId
        ? { editable_logo_artifact_id: draft.editableLogoAssetId }
        : {}),
      approved_asset_ids: assetIds,
      palette: draft.palette,
      notes: draft.notes.trim(),
      status: approve ? 'approved' : 'draft',
      approved_at: approve ? new Date().toISOString() : null,
    };
    const { data, error } =
      existing?.status === 'draft'
        ? await this.client
            .from('brand_kits')
            .update(payload)
            .eq('id', existing.id)
            .eq('status', 'draft')
            .select('*')
            .single()
        : await this.client
            .from('brand_kits')
            .insert({
              organization_id: this.organizationId,
              business_id: businessId,
              crawl_run_id: workspace.latestCapture.id,
              version: (existing?.version ?? 0) + 1,
              ...payload,
            })
            .select('*')
            .single();
    throwIfError(error);
    if (recordActivity) {
      const { error: activityError } = await this.client.from('activities').insert({
        organization_id: this.organizationId,
        business_id: businessId,
        type: approve ? 'approved' : 'note',
        message: approve
          ? `Brand Kit v${readNumber(data as DatabaseRow, 'version')} approved for future redesigns.`
          : 'Brand Kit saved as a private draft.',
      });
      throwIfError(activityError);
    }
    return brandKitFromRow(data as DatabaseRow);
  }

  async createBrandAwareBriefRevision(businessId: string) {
    const workspace = await this.getWorkspace(businessId);
    const brandKit = workspace?.brandKit;
    const previousBrief = workspace?.redesignBrief;
    if (
      !workspace?.researchPacket ||
      !workspace.latestCapture ||
      workspace.latestCapture.status !== 'ready' ||
      !brandKit ||
      brandKit.status !== 'approved' ||
      !brandKit.primaryLogoAssetId
    ) {
      throw new Error('Approve a complete Brand Kit before creating a brand-aware brief revision.');
    }
    const generated = createBriefDraft(
      workspace.business.name,
      workspace.researchPacket,
      workspace.artifacts,
      workspace.assetAnnotations,
      brandKit,
      workspace.capturedPages,
      undefined,
      workspace.visualContentCandidates,
    );
    if (!generated.draft.brandKit) {
      throw new Error('The approved Brand Kit could not be attached to the new brief revision.');
    }
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
    generated.sourceSelections.autoSelectedAssetIds = generated.sourceSelections.assetIds;
    const { data, error } = await this.client
      .from('redesign_briefs')
      .insert({
        organization_id: this.organizationId,
        business_id: businessId,
        research_packet_id: workspace.researchPacket.id,
        crawl_run_id: workspace.latestCapture.id,
        status: 'draft',
        version: (previousBrief?.version ?? 0) + 1,
        source_selections: generated.sourceSelections,
        draft: generated.draft,
      })
      .select('*')
      .single();
    throwIfError(error);
    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: businessId,
      type: 'note',
      message: `Brand-aware redesign brief v${(previousBrief?.version ?? 0) + 1} drafted from Brand Kit v${brandKit.version}.`,
    });
    throwIfError(activityError);
    return briefFromRow(data as DatabaseRow);
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
    const latestBrief = workspace.redesignBrief;
    const visualContentIsCurrent = visualContentMatchesBrief(
      workspace.visualContentCandidates,
      latestBrief,
    );
    if (latestBrief?.status === 'draft' && Array.isArray(latestBrief.draft.capabilityInventory)) {
      return latestBrief;
    }
    if (
      latestBrief?.status === 'approved' &&
      manifestSourceMatchesBrief(workspace, latestBrief) &&
      Array.isArray(latestBrief.draft.capabilityInventory) &&
      visualContentIsCurrent &&
      currentManifestContentMatchesBrief(workspace, latestBrief)
    ) {
      return latestBrief;
    }
    const hasReusableCapabilityInventory = Array.isArray(latestBrief?.draft.capabilityInventory);
    if (
      openAiApiFeaturesEnabled &&
      recordValue(workspace.researchPacket.data.capabilityAnalysis).status !== 'ready' &&
      !hasReusableCapabilityInventory
    ) {
      const { error } = await this.client.rpc('request_capability_analysis', {
        target_business_id: businessId,
      });
      throwIfError(error);
      return undefined;
    }
    const generated = createBriefDraft(
      workspace.business.name,
      workspace.researchPacket,
      workspace.artifacts,
      workspace.assetAnnotations,
      workspace.brandKit,
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
    const record = {
      organization_id: this.organizationId,
      business_id: businessId,
      research_packet_id: workspace.researchPacket.id,
      crawl_run_id: workspace.latestCapture.id,
      status: 'draft',
      version: (latestBrief?.version ?? 0) + 1,
      source_selections: generated.sourceSelections,
      draft:
        latestBrief?.status === 'draft'
          ? { ...latestBrief.draft, capabilityInventory: generated.draft.capabilityInventory }
          : generated.draft,
    };
    const { data, error } =
      latestBrief?.status === 'draft'
        ? await this.client
            .from('redesign_briefs')
            .update({ draft: record.draft })
            .eq('id', latestBrief.id)
            .eq('status', 'draft')
            .select('*')
            .single()
        : await this.client.from('redesign_briefs').insert(record).select('*').single();
    if (isDuplicateWebsiteError(error)) {
      const refreshed = await this.getWorkspace(businessId);
      return refreshed?.redesignBrief;
    }
    throwIfError(error);
    const { error: businessError } = await this.client
      .from('businesses')
      .update({ stage: 'awaiting_approval' })
      .eq('id', businessId);
    throwIfError(businessError);
    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: businessId,
      type: 'note',
      message:
        latestBrief?.status === 'draft'
          ? 'Capability inventory generated from saved capture evidence without a new website scrape.'
          : `Redesign brief v${(latestBrief?.version ?? 0) + 1} drafted from the reviewed Research Packet.`,
    });
    throwIfError(activityError);
    return briefFromRow(data as DatabaseRow);
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
      workspace.latestCapture.id !== brief.crawlRunId ||
      workspace.researchPacket.id !== brief.researchPacketId
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
    const draft = {
      ...brief.draft,
      strategy: generated.draft.strategy,
      proposedSitemap: generated.draft.proposedSitemap,
      pagePlans: generated.draft.pagePlans,
    };
    const { data, error } = await this.client
      .from('redesign_briefs')
      .update({ draft })
      .eq('id', brief.id)
      .eq('status', 'draft')
      .select('*')
      .single();
    throwIfError(error);
    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: brief.businessId,
      type: 'note',
      message: `Redesign brief v${brief.version} architecture regenerated from selected captured pages.`,
    });
    throwIfError(activityError);
    return briefFromRow(data as DatabaseRow);
  }

  async updateRedesignBrief(
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) {
    if (brief.status === 'approved') {
      throw new Error('Approved briefs cannot be changed. Create a new draft for further changes.');
    }
    const { error } = await this.client
      .from('redesign_briefs')
      .update({ source_selections: patch.sourceSelections, draft: patch.draft })
      .eq('id', brief.id)
      .eq('status', 'draft');
    throwIfError(error);
  }

  async approveRedesignBrief(brief: RedesignBrief) {
    if (brief.status === 'approved') return;
    if (unresolvedPageDispositions(brief).length) {
      throw new Error(
        'Review every selected page outcome and choose destinations for merges or redirects before approval.',
      );
    }
    const approvedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('redesign_briefs')
      .update({ status: 'approved', approved_at: approvedAt })
      .eq('id', brief.id)
      .eq('status', 'draft')
      .select('id');
    throwIfError(error);
    if (!(data ?? []).length) throw new Error('The brief is no longer available for approval.');
    const { error: businessError } = await this.client
      .from('businesses')
      .update({ stage: 'concept_ready' })
      .eq('id', brief.businessId);
    throwIfError(businessError);
    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: brief.businessId,
      type: 'approved',
      message: 'Redesign brief approved. A builder can now use the approved strategy.',
    });
    throwIfError(activityError);
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
    if (!workspace.brandKit || workspace.brandKit.status !== 'approved') {
      throw new Error(
        'Approve a complete Brand Kit with a primary logo and reviewed colours before preparing a Build Manifest.',
      );
    }
    if (!brief.draft.brandKit) {
      throw new Error(
        `Brand Kit v${workspace.brandKit.version} is approved, but redesign brief v${brief.version} does not reference it. Create and approve a new brand-aware brief revision before preparing a replacement Build Manifest.`,
      );
    }
    if (brief.draft.brandKit.id !== workspace.brandKit.id) {
      throw new Error(
        `Redesign brief v${brief.version} references an earlier Brand Kit. Create and approve a new brand-aware brief revision using Brand Kit v${workspace.brandKit.version}.`,
      );
    }
    if (workspace.buildManifest?.redesignBriefId === brief.id) return workspace.buildManifest;

    const generatedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('build_manifests')
      .insert({
        organization_id: this.organizationId,
        business_id: businessId,
        redesign_brief_id: brief.id,
        research_packet_id: brief.researchPacketId,
        crawl_run_id: brief.crawlRunId,
        schema_version: buildManifestSchemaVersion,
        builder_contract_version: codexBuilderContractVersion,
        status: 'ready',
        data: createBuildManifestData(workspace, brief),
        generated_at: generatedAt,
      })
      .select('*')
      .single();
    if (isDuplicateWebsiteError(error)) {
      const refreshed = await this.getWorkspace(businessId);
      return refreshed?.buildManifest;
    }
    throwIfError(error);

    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: businessId,
      type: 'note',
      message:
        'Build Manifest prepared from the approved redesign brief for the future Codex builder.',
    });
    throwIfError(activityError);
    return buildManifestFromRow(data as DatabaseRow);
  }

  async requestWebsiteBuild(
    businessId: string,
    mode: BuilderRunMode = 'homepage_test',
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
    sourceBuilderRunId?: string,
    targetSourceUrls?: string[],
  ) {
    const { error: lifecycleError } = await this.client.rpc('reconcile_builder_run_lifecycle', {
      target_business_id: businessId,
    });
    throwIfError(lifecycleError);
    const { data, error } = await this.client.rpc('request_website_build', {
      target_business_id: businessId,
      requested_mode: mode,
      requested_target_source_url: targetSourceUrl ?? null,
      requested_target_source_urls: targetSourceUrls?.length ? targetSourceUrls : null,
      requested_build_instruction: buildInstruction?.trim() || null,
      requested_agent_package_id: agentPackageId ?? null,
      requested_source_builder_run_id: sourceBuilderRunId ?? null,
    });
    throwIfError(error);
    if (typeof data !== 'string' || !data) {
      throw new Error('The protected builder did not return the new private test run.');
    }
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('*, agent_packages(version), builder_artifacts(kind)')
      .eq('id', data)
      .single();
    throwIfError(runError);
    return builderRunFromRow(run as DatabaseRow);
  }

  async requestBuilderQualityRecheck(builderRunId: string, agentPackageId: string) {
    const { data, error } = await this.client.rpc('request_builder_quality_recheck', {
      target_builder_run_id: builderRunId,
      requested_agent_package_id: agentPackageId,
    });
    throwIfError(error);
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('*, agent_packages(version), builder_artifacts(kind)')
      .eq('id', data as string)
      .single();
    throwIfError(runError);
    return builderRunFromRow(run as DatabaseRow);
  }

  async moveBuilderRunToAgentStudio(builderRunId: string) {
    const { data, error } = await this.client.rpc('move_builder_run_to_agent_studio', {
      target_builder_run_id: builderRunId,
    });
    throwIfError(error);
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('*, agent_packages(version), builder_artifacts(kind)')
      .eq('id', data as string)
      .single();
    throwIfError(runError);
    return builderRunFromRow(run as DatabaseRow);
  }

  async requestAgentStudioSiteTest(
    sourceBuilderRunId: string,
    buildInstruction: string,
    agentPackageId: string,
    featureId: string,
  ) {
    const { error: lifecycleError } = await this.client.rpc('reconcile_builder_run_lifecycle', {
      target_business_id: null,
    });
    throwIfError(lifecycleError);
    const { data, error } = await this.client.rpc('request_agent_studio_site_test', {
      target_source_builder_run_id: sourceBuilderRunId,
      requested_build_instruction: buildInstruction.trim(),
      requested_agent_package_id: agentPackageId,
      requested_feature_id: featureId,
    });
    throwIfError(error);
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('*, agent_packages(version), builder_artifacts(kind)')
      .eq('id', data as string)
      .single();
    throwIfError(runError);
    return builderRunFromRow(run as DatabaseRow);
  }

  async resumeWebsiteBuild(builderRunId: string) {
    const { error: lifecycleError } = await this.client.rpc('reconcile_builder_run_lifecycle', {
      target_business_id: null,
    });
    throwIfError(lifecycleError);
    const { error } = await this.client.rpc('resume_website_build', {
      target_builder_run_id: builderRunId,
    });
    throwIfError(error);
    const { data: run, error: runError } = await this.client
      .from('builder_runs')
      .select('*, agent_packages(version)')
      .eq('id', builderRunId)
      .single();
    throwIfError(runError);
    return builderRunFromRow(run as DatabaseRow);
  }

  async cancelWebsiteBuild(businessId: string) {
    const { error } = await this.client.rpc('cancel_website_build', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async deleteWebsiteBuild(builderRunId: string) {
    const { error } = await this.client.rpc('delete_website_build', {
      target_builder_run_id: builderRunId,
    });
    throwIfError(error);
  }

  async deleteWebsiteBuildHistory(businessId: string) {
    const { error } = await this.client.rpc('delete_website_build_history', {
      target_business_id: businessId,
    });
    throwIfError(error);
  }

  async deleteManagedRecord(
    kind: 'capture' | 'asset_analysis' | 'brief' | 'manifest' | 'build',
    id: string,
  ) {
    if (kind === 'build') return this.deleteWebsiteBuild(id);
    const table =
      kind === 'capture'
        ? 'crawl_runs'
        : kind === 'asset_analysis'
          ? 'asset_analysis_jobs'
          : kind === 'brief'
            ? 'redesign_briefs'
            : 'build_manifests';
    const { error } = await this.client.from(table).delete().eq('id', id);
    throwIfError(error);
  }

  async deleteBuildPackage(businessId: string, redesignBriefId: string) {
    const { error } = await this.client.rpc('delete_build_package', {
      target_business_id: businessId,
      target_redesign_brief_id: redesignBriefId,
    });
    throwIfError(error);
  }

  async createBuilderPreviewUrl(builderRunId: string, mode: BuilderPreviewMode = 'ready') {
    let entryPath = '';
    const { data: previewRun } = await this.client
      .from('builder_runs')
      .select('build_manifest_id, build_mode, target_source_url, target_source_urls')
      .eq('id', builderRunId)
      .maybeSingle();
    const run = recordValue(previewRun);
    if (mode === 'ready') {
      const targetUrls = Array.isArray(run.target_source_urls)
        ? run.target_source_urls.filter((value): value is string => typeof value === 'string')
        : typeof run.target_source_url === 'string'
          ? [run.target_source_url]
          : [];
      const firstTargetUrl = targetUrls[0];
      const manifestId = readOptionalString(run, 'build_manifest_id');
      if (firstTargetUrl && manifestId) {
        const { data: previewManifest } = await this.client
          .from('build_manifests')
          .select('data')
          .eq('id', manifestId)
          .maybeSingle();
        const manifestData = recordValue(recordValue(previewManifest).data);
        const selectedPages = Array.isArray(manifestData.selectedPages)
          ? manifestData.selectedPages.map(recordValue)
          : [];
        const selectedEntry = selectedPages.find(
          (page) =>
            typeof page.url === 'string' &&
            canonicalWebsiteUrl(page.url) === canonicalWebsiteUrl(firstTargetUrl),
        );
        const publicPath = readOptionalString(selectedEntry ?? {}, 'publicPath');
        if (publicPath && publicPath !== '/')
          entryPath = `${publicPath.replace(/^\/+|\/+$/g, '')}/`;
      }
    }
    const { data, error } = await this.client.rpc('create_builder_preview_access', {
      target_builder_run_id: builderRunId,
      requested_mode: mode,
    });
    throwIfError(error);
    const access = recordValue(data);
    const token = typeof access.token === 'string' ? access.token : '';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!token || !supabaseUrl) {
      throw new Error('The private preview service is not configured.');
    }
    const draftPath = mode === 'draft' ? '__draft__/' : '';
    const previewRoute = ['homepage_test', 'page_test', 'site_test'].includes(
      readString(run, 'build_mode'),
    )
      ? 'test'
      : 'build';
    const visitorPreviewOrigin = import.meta.env.VITE_SITEFORGE_PREVIEW_ORIGIN?.trim().replace(
      /\/+$/,
      '',
    );
    if (visitorPreviewOrigin) {
      return `${visitorPreviewOrigin}/${previewRoute}/${builderRunId}/${token}/${draftPath}${entryPath}`;
    }
    const sourceUrl = `${supabaseUrl}/functions/v1/siteforge-preview/${builderRunId}/${token}/${draftPath}${entryPath}`;
    return `${window.location.origin}${window.location.pathname}#/preview?source=${encodeURIComponent(sourceUrl)}`;
  }

  async requestClientPreviewPublication(
    builderRunId: string,
    input: ClientPreviewPublicationInput,
  ) {
    const { data, error } = await this.client.rpc('request_client_preview_publication_v2', {
      target_builder_run_id: builderRunId,
      target_client_name: input.clientName,
      target_contact_name: input.contactName,
      target_client_email: input.clientEmail,
      target_project_name: input.projectName,
      target_final_balance_cents: input.finalBalanceCents ?? null,
      target_currency: input.currency,
      target_handoff_notes: input.handoffNotes,
      target_pricing_snapshot: input.pricingSnapshot,
    });
    throwIfError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return row ? clientPreviewPublicationFromRow(row as DatabaseRow) : undefined;
  }

  async cancelClientPreviewPublication(publicationId: string) {
    const { error } = await this.client.rpc('cancel_client_preview_publication', {
      target_publication_id: publicationId,
    });
    throwIfError(error);
  }

  async requestMadeSolidHandoff(builderRunId: string, input: MadeSolidHandoffInput) {
    const { data, error } = await this.client.rpc('request_made_solid_handoff_v2', {
      target_builder_run_id: builderRunId,
      target_source_repository_url: input.sourceRepositoryUrl,
      target_source_branch: input.sourceBranch,
      target_source_commit: input.sourceCommit,
      target_source_edit_version: input.sourceEditVersion,
      target_client_name: input.clientName,
      target_contact_name: input.contactName,
      target_client_email: input.clientEmail,
      target_project_name: input.projectName,
      target_handoff_notes: input.handoffNotes,
      target_pricing_snapshot: input.pricingSnapshot,
    });
    if (isMissingMadeSolidHandoffSchema(error)) {
      throw new Error(
        'Made Solid handoff is not available yet because its database migration has not been applied. Core prospect and Agent Studio builds are still available.',
      );
    }
    throwIfError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return row ? madeSolidHandoffFromRow(row as DatabaseRow) : undefined;
  }

  async cancelMadeSolidHandoff(handoffId: string) {
    const { error } = await this.client.rpc('cancel_made_solid_handoff', {
      target_handoff_id: handoffId,
    });
    if (isMissingMadeSolidHandoffSchema(error)) {
      throw new Error(
        'Made Solid handoff cancellation is not available yet because its database migration has not been applied.',
      );
    }
    throwIfError(error);
  }

  async requestGithubWorkspacePublication(
    builderRunId: string,
    input: GithubWorkspacePublicationInput,
  ) {
    const { data, error } = await this.client.rpc('request_github_workspace_publication', {
      target_builder_run_id: builderRunId,
      target_repository_owner: input.repositoryOwner,
      target_repository_name: input.repositoryName,
      target_repository_description: input.repositoryDescription,
    });
    throwIfError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return row ? githubWorkspacePublicationFromRow(row as DatabaseRow) : undefined;
  }

  async cancelGithubWorkspacePublication(publicationId: string) {
    const { error } = await this.client.rpc('cancel_github_workspace_publication', {
      target_publication_id: publicationId,
    });
    throwIfError(error);
  }

  async setTaskState(task: Task, state: Task['state']) {
    const { error: taskError } = await this.client
      .from('tasks')
      .update({ state })
      .eq('id', task.id);
    throwIfError(taskError);
    const { error: activityError } = await this.client.from('activities').insert({
      organization_id: this.organizationId,
      business_id: task.businessId,
      type: 'task_completed',
      message: state === 'done' ? `Completed task: ${task.body}` : `Reopened task: ${task.body}`,
    });
    throwIfError(activityError);
  }

  async approveForOutreach(businessId: string) {
    const { data, error } = await this.client.rpc('approve_business_for_outreach_v2', {
      target_business_id: businessId,
    });
    throwIfError(error);
    return data === true;
  }

  async saveOutreachCompliance(businessId: string, input: OutreachComplianceInput) {
    const { data, error } = await this.client
      .from('outreach_compliance')
      .upsert(
        {
          organization_id: this.organizationId,
          business_id: businessId,
          contact_id: input.contactId ?? null,
          consent_basis: input.consentBasis,
          source_url: input.sourceUrl?.trim() || null,
          source_note: input.sourceNote.trim(),
          email_allowed: input.emailAllowed,
          phone_allowed: input.phoneAllowed,
          do_not_call_checked_at: input.doNotCallCheckedAt ?? null,
          do_not_call_clear: input.doNotCallClear,
          sender_identification_confirmed: input.senderIdentificationConfirmed,
          unsubscribe_process_confirmed: input.unsubscribeProcessConfirmed,
          suppressed_at: input.suppressedAt ?? null,
          suppression_reason: input.suppressionReason?.trim() || null,
          campaign_cohort: input.campaignCohort?.trim() || null,
          notes: input.notes.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' },
      )
      .select('*')
      .single();
    throwIfError(error);
    return outreachComplianceFromRow(data as DatabaseRow);
  }

  async deleteProspect(businessId: string) {
    const { data, error } = await this.client
      .from('businesses')
      .delete()
      .eq('id', businessId)
      .eq('organization_id', this.organizationId)
      .eq('kind', 'prospect')
      .select('id');
    throwIfError(error);
    return (data ?? []).length === 1;
  }
}
