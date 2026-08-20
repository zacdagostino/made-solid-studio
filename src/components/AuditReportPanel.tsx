import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleSlash2,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type {
  Audit,
  AuditFinding,
  AuditObservation,
  AuditStatus,
  DecisionReport,
} from '../lib/domain';
import { Button, ButtonGroup, ButtonLink, IndeterminateProgress, StatusBadge } from './ui';
import styles from './AuditReportPanel.module.css';

export type AuditReportEvidence = {
  id: string;
  crawlRunId?: string;
  label: string;
  detail?: string;
  evidence?: string;
  value?: string;
  sourceUrl?: string;
  capturedAt?: string;
  viewport?: string;
  kind?: string;
  imageUrl?: string;
  evidenceKind?: string;
};

type FindingGroup = {
  key: string;
  finding: AuditFinding;
  findingIds: string[];
  occurrenceCount: number;
  affectedPages: number;
  reviewState: AuditFinding['reviewState'];
};

export type AuditReportSpecialistKind =
  | 'responsive_ui'
  | 'accessibility'
  | 'performance_engineering'
  | 'technical_seo'
  | 'conversion_journey'
  | 'platform_integrations';

export type AuditReportSpecialistTask = {
  id: string;
  auditId?: string;
  crawlRunId: string;
  specialistKind: AuditReportSpecialistKind;
  status: AuditStatus;
  progressPhase?: string;
  progressDetail?: string;
  totalItems: number;
  completedItems: number;
  errorSummary?: string;
};

export type AuditReportPanelProps = {
  clientName: string;
  activeCaptureRunId?: string;
  audit?: Audit;
  report?: DecisionReport;
  observations?: AuditObservation[];
  evidence: AuditReportEvidence[];
  tasks?: AuditReportSpecialistTask[];
  onReviewFinding?: (
    findingId: string,
    reviewState: Extract<AuditFinding['reviewState'], 'approved' | 'blocked'>,
  ) => void | Promise<void>;
  onReviewObservation?: (
    observationId: string,
    reviewState: Extract<AuditFinding['reviewState'], 'approved' | 'blocked'>,
  ) => void | Promise<void>;
  onOpenEvidence?: (evidence: AuditReportEvidence) => void;
  onPrepareReport?: () => void | Promise<void>;
  onRetryAudit?: () => void | Promise<void>;
};

type ReviewSummary = {
  approved: number;
  excluded: number;
  needsReview: number;
  approvedWithoutEvidence: number;
  approvedLowConfidence: number;
};

const areaOrder: AuditFinding['area'][] = [
  'UI',
  'UX',
  'Mobile',
  'Accessibility',
  'Performance',
  'SEO',
  'Platform',
  'Content',
  'Conversion',
  'Trust',
];

const statusPresentation: Record<
  AuditStatus,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }
> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  research_pending: { label: 'Waiting for evidence', tone: 'neutral' },
  running: { label: 'Specialists working', tone: 'warning' },
  ready: { label: 'Ready for review', tone: 'success' },
  failed: { label: 'Audit needs attention', tone: 'danger' },
  cancelled: { label: 'Audit cancelled', tone: 'warning' },
};

const specialistPresentation: Record<
  AuditReportSpecialistKind,
  { label: string; purpose: string }
> = {
  responsive_ui: {
    label: 'Responsive UI and UX',
    purpose: 'Layout, navigation and safe customer journeys',
  },
  accessibility: {
    label: 'Accessibility',
    purpose: 'Semantics, keyboard use, focus and assistive technology',
  },
  performance_engineering: {
    label: 'Performance engineering',
    purpose: 'Measured loading, page movement and resource delivery',
  },
  technical_seo: {
    label: 'Technical SEO and content',
    purpose: 'Discovery, metadata and readable page structure',
  },
  conversion_journey: {
    label: 'Conversion and trust',
    purpose: 'Decision points, calls to action and visible proof',
  },
  platform_integrations: {
    label: 'Platform and integrations',
    purpose: 'Verified CMS, dependencies and runtime behaviour',
  },
};

function specialistStatus(task: AuditReportSpecialistTask) {
  if (task.status === 'ready') return { label: 'Complete', tone: 'success' } as const;
  if (task.status === 'failed') return { label: 'Needs attention', tone: 'danger' } as const;
  if (task.status === 'cancelled') return { label: 'Cancelled', tone: 'warning' } as const;
  if (task.status === 'running') return { label: 'Working', tone: 'warning' } as const;
  if (task.status === 'research_pending')
    return { label: 'Waiting for evidence', tone: 'neutral' } as const;
  return { label: 'Queued', tone: 'neutral' } as const;
}

export function auditBelongsToActiveRun(activeCaptureRunId: string | undefined, audit?: Audit) {
  return Boolean(activeCaptureRunId && audit?.crawlRunId === activeCaptureRunId);
}

export function reportBelongsToCurrentAudit(
  activeCaptureRunId: string | undefined,
  audit: Audit | undefined,
  report: DecisionReport | undefined,
) {
  return Boolean(
    activeCaptureRunId &&
    audit &&
    report?.auditId === audit.id &&
    report.crawlRunId === activeCaptureRunId &&
    report.status === 'approved',
  );
}

export function currentRunEvidence(
  activeCaptureRunId: string | undefined,
  evidence: AuditReportEvidence[],
) {
  if (!activeCaptureRunId) return [];
  return evidence.filter((item) => item.crawlRunId === activeCaptureRunId);
}

export function evidenceForFinding(finding: AuditFinding, evidence: AuditReportEvidence[]) {
  const evidenceIds = new Set(finding.evidenceIds);
  return evidence.filter((item) => evidenceIds.has(item.id));
}

export function summariseReportReview(
  findings: AuditFinding[],
  evidence: AuditReportEvidence[],
): ReviewSummary {
  return findings.reduce<ReviewSummary>(
    (summary, finding) => {
      if (finding.reviewState === 'approved') {
        summary.approved += 1;
        if (evidenceForFinding(finding, evidence).length === 0) {
          summary.approvedWithoutEvidence += 1;
        }
        if (finding.confidence === 'low') summary.approvedLowConfidence += 1;
      } else if (finding.reviewState === 'blocked') {
        summary.excluded += 1;
      } else {
        summary.needsReview += 1;
      }
      return summary;
    },
    {
      approved: 0,
      excluded: 0,
      needsReview: 0,
      approvedWithoutEvidence: 0,
      approvedLowConfidence: 0,
    },
  );
}

export function findingFromObservation(observation: AuditObservation): AuditFinding {
  return {
    id: observation.id,
    area: observation.area,
    severity: observation.severity,
    title: observation.title,
    finding: observation.observation,
    recommendation: observation.recommendation,
    evidenceIds: [...observation.evidenceFactIds, ...observation.evidenceArtifactIds],
    evidenceArtifactIds: observation.evidenceArtifactIds,
    sourceUrls: observation.sourceUrls,
    specialistKind: observation.specialistKind,
    findingClass: observation.findingClass,
    customerImpact: observation.customerImpact,
    confidence: observation.confidence,
    measurement: observation.measurement,
    reviewState: observation.reviewState,
  };
}

function sourceLabel(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return sourceUrl;
  }
}

function priorityLabel(severity: AuditFinding['severity']) {
  if (severity === 'high') return 'Fix first';
  if (severity === 'medium') return 'Important improvement';
  return 'Future opportunity';
}

function severityRank(severity: AuditFinding['severity']) {
  if (severity === 'high') return 0;
  if (severity === 'medium') return 1;
  return 2;
}

function visionMeasurement(finding: AuditFinding) {
  const measurement = finding.measurement;
  if (!measurement || typeof measurement !== 'object') return undefined;
  const nested = measurement.vision;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return measurement.source === 'multimodal_ux_model' ? measurement : undefined;
}

function internalPriorityScore(finding: AuditFinding) {
  const vision = visionMeasurement(finding);
  const value = vision?.priorityScore;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function groupAuditFindings(findings: AuditFinding[]): FindingGroup[] {
  const groups = new Map<string, AuditFinding[]>();
  findings.forEach((finding) => {
    const titleKey = finding.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const key = `${finding.specialistKind ?? 'legacy'}:${finding.area}:${titleKey}`;
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  });
  return [...groups.entries()]
    .map(([key, entries]) => {
      const ordered = [...entries].sort(
        (left, right) => severityRank(left.severity) - severityRank(right.severity),
      );
      const representative = ordered[0];
      const sourceUrls = [...new Set(entries.flatMap((entry) => entry.sourceUrls))];
      const evidenceIds = [...new Set(entries.flatMap((entry) => entry.evidenceIds))];
      const reviewStates = new Set(entries.map((entry) => entry.reviewState));
      return {
        key,
        finding: { ...representative, sourceUrls, evidenceIds },
        findingIds: entries.map((entry) => entry.id),
        occurrenceCount: entries.length,
        affectedPages: sourceUrls.length,
        reviewState: reviewStates.size === 1 ? entries[0].reviewState : ('needs_review' as const),
      };
    })
    .sort(
      (left, right) =>
        severityRank(left.finding.severity) - severityRank(right.finding.severity) ||
        internalPriorityScore(right.finding) - internalPriorityScore(left.finding) ||
        left.finding.title.localeCompare(right.finding.title),
    );
}

function FindingCard({
  finding,
  evidence,
  occurrenceCount,
  affectedPages,
  busy,
  error,
  onOpenEvidence,
  onReview,
}: {
  finding: AuditFinding;
  evidence: AuditReportEvidence[];
  occurrenceCount: number;
  affectedPages: number;
  busy: boolean;
  error?: string;
  onOpenEvidence?: (evidence: AuditReportEvidence) => void;
  onReview: (reviewState: 'approved' | 'blocked') => void;
}) {
  const canApprove = evidence.length > 0;
  const isApproved = finding.reviewState === 'approved';
  const isExcluded = finding.reviewState === 'blocked';
  const visualEvidence = evidence.find((item) => item.imageUrl);
  const remainingEvidence = visualEvidence
    ? evidence.filter((item) => item.id !== visualEvidence.id)
    : evidence;
  const vision = visionMeasurement(finding);

  return (
    <article className={styles.finding} data-review-state={finding.reviewState}>
      <header className={styles.findingHeader}>
        <div className={styles.findingTitle}>
          <span className={styles.area}>{finding.area}</span>
          <h3>{finding.title}</h3>
        </div>
        <StatusBadge
          tone={
            finding.reviewState === 'approved'
              ? 'success'
              : finding.reviewState === 'blocked'
                ? 'neutral'
                : 'warning'
          }
        >
          {finding.reviewState === 'approved'
            ? 'Approved'
            : finding.reviewState === 'blocked'
              ? 'Excluded'
              : 'Needs review'}
        </StatusBadge>
      </header>

      <div className={styles.priority}>{priorityLabel(finding.severity)}</div>
      {vision ? (
        <p className={styles.visionNote}>
          Visual AI candidate · {finding.confidence ?? 'low'} evidence confidence
          {typeof vision.occurrenceCount === 'number'
            ? ` · ${vision.occurrenceCount} supporting views`
            : ''}
        </p>
      ) : null}
      <p className={styles.occurrenceSummary}>
        {occurrenceCount} recorded {occurrenceCount === 1 ? 'case' : 'cases'} across {affectedPages}{' '}
        affected {affectedPages === 1 ? 'page' : 'pages'}.
      </p>
      {visualEvidence?.imageUrl ? (
        <figure className={styles.visualEvidence}>
          <img alt={`Captured evidence for ${finding.title}`} src={visualEvidence.imageUrl} />
          <figcaption>
            {visualEvidence.label}
            {visualEvidence.viewport ? ` · ${visualEvidence.viewport}` : ''}
          </figcaption>
        </figure>
      ) : null}
      <div className={styles.copyGrid}>
        <div>
          <h4>What we observed</h4>
          <p>{finding.finding}</p>
        </div>
        {finding.customerImpact ? (
          <div>
            <h4>Why it matters</h4>
            <p>{finding.customerImpact}</p>
          </div>
        ) : null}
        <div>
          <h4>Recommended improvement</h4>
          <p>{finding.recommendation}</p>
        </div>
      </div>

      <section aria-labelledby={`evidence-${finding.id}`} className={styles.evidenceSection}>
        <div className={styles.sectionHeading}>
          <h4 id={`evidence-${finding.id}`}>Current-run evidence for {finding.title}</h4>
          <span>{evidence.length} saved</span>
        </div>
        {evidence.length > 0 ? (
          <details className={styles.evidenceDisclosure}>
            <summary>
              Inspect {evidence.length} supporting {evidence.length === 1 ? 'item' : 'items'}
            </summary>
            <ul className={styles.evidenceList}>
              {remainingEvidence.map((item) => (
                <li key={item.id}>
                  <div className={styles.evidenceCopy}>
                    <strong>{item.label}</strong>
                    <span>
                      {[item.viewport, item.kind, item.capturedAt].filter(Boolean).join(' · ')}
                    </span>
                    {item.detail || item.evidence || item.value ? (
                      <p>{item.detail || item.evidence || item.value}</p>
                    ) : null}
                  </div>
                  {onOpenEvidence ? (
                    <Button onClick={() => onOpenEvidence(item)} size="small" variant="secondary">
                      <FileSearch aria-hidden="true" size={16} />
                      Inspect
                    </Button>
                  ) : item.sourceUrl ? (
                    <a
                      className={styles.sourceLink}
                      href={item.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open source <ExternalLink aria-hidden="true" size={15} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <div className={styles.missingEvidence} role="note">
            <ShieldAlert aria-hidden="true" size={18} />
            <p>
              No evidence from the active capture supports this finding yet. It cannot be approved
              for the client report.
            </p>
          </div>
        )}
        {finding.sourceUrls.length > 0 ? (
          <p className={styles.sourceSummary}>
            Checked on{' '}
            {finding.sourceUrls.map((url, index) => (
              <span key={url}>
                {index > 0 ? ', ' : ''}
                {sourceLabel(url)}
              </span>
            ))}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className={styles.reviewError} role="alert">
          {error}
        </p>
      ) : null}
      <ButtonGroup className={styles.reviewActions} aria-label={`Review ${finding.title}`}>
        <Button
          aria-pressed={isApproved}
          disabled={!canApprove || busy}
          onClick={() => onReview('approved')}
          size="small"
          variant={isApproved ? 'primary' : 'secondary'}
        >
          {busy && !isExcluded ? (
            <LoaderCircle aria-hidden="true" className={styles.spinner} size={16} />
          ) : (
            <Check aria-hidden="true" size={16} />
          )}
          {isApproved ? 'Approved for report' : 'Approve for report'}
        </Button>
        <Button
          aria-pressed={isExcluded}
          disabled={busy}
          onClick={() => onReview('blocked')}
          size="small"
          variant={isExcluded ? 'primary' : 'quiet'}
        >
          {busy && isExcluded ? (
            <LoaderCircle aria-hidden="true" className={styles.spinner} size={16} />
          ) : (
            <CircleSlash2 aria-hidden="true" size={16} />
          )}
          {isExcluded ? 'Excluded from report' : 'Exclude'}
        </Button>
      </ButtonGroup>
    </article>
  );
}

function CurrentAuditNeeded({
  clientName,
  onRequestAudit,
  requesting,
  error,
}: {
  clientName: string;
  onRequestAudit?: () => void | Promise<void>;
  requesting: boolean;
  error?: string;
}) {
  return (
    <div className={styles.empty}>
      <FileSearch aria-hidden="true" size={24} />
      <h3>Run the audit for this capture</h3>
      <p>
        {clientName} does not have a specialist audit tied to the current evidence. Earlier findings
        remain hidden so they cannot be mistaken for this capture.
      </p>
      {onRequestAudit ? (
        <Button disabled={requesting} onClick={onRequestAudit} size="small" variant="secondary">
          {requesting ? (
            <LoaderCircle aria-hidden="true" className={styles.spinner} size={16} />
          ) : null}
          {requesting ? 'Queueing audit…' : 'Run specialist audit'}
        </Button>
      ) : null}
      {error ? (
        <p className={styles.reviewError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SpecialistCoverage({ tasks }: { tasks: AuditReportSpecialistTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <details className={styles.specialists}>
      <summary>
        <div>
          <h3 id="specialist-coverage-title">Specialist coverage</h3>
          <p>
            Each specialist works from the same saved capture rather than recrawling the website.
          </p>
        </div>
        <span>{tasks.length} tasks</span>
      </summary>
      <ul className={styles.specialistGrid}>
        {tasks.map((task) => {
          const presentation = specialistPresentation[task.specialistKind];
          const status = specialistStatus(task);
          return (
            <li key={task.id}>
              <div className={styles.specialistHeading}>
                <strong>{presentation.label}</strong>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <p>{presentation.purpose}</p>
              <span className={styles.taskDetail}>
                {task.errorSummary ||
                  task.progressDetail ||
                  task.progressPhase ||
                  (task.totalItems > 0
                    ? `${task.completedItems} of ${task.totalItems} items saved`
                    : 'Waiting for scoped evidence')}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function AuditReportPanel({
  clientName,
  activeCaptureRunId,
  audit,
  report,
  observations,
  evidence,
  tasks = [],
  onReviewFinding,
  onReviewObservation,
  onOpenEvidence,
  onPrepareReport,
  onRetryAudit,
}: AuditReportPanelProps) {
  const [area, setArea] = useState<'all' | AuditFinding['area']>('all');
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [pendingFindingId, setPendingFindingId] = useState<string>();
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [bulkError, setBulkError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const currentAudit = auditBelongsToActiveRun(activeCaptureRunId, audit) ? audit : undefined;
  const currentReport = reportBelongsToCurrentAudit(activeCaptureRunId, currentAudit, report)
    ? report
    : undefined;
  const runEvidence = useMemo(
    () => currentRunEvidence(activeCaptureRunId, evidence),
    [activeCaptureRunId, evidence],
  );
  const currentTasks = useMemo(
    () =>
      activeCaptureRunId && currentAudit
        ? tasks.filter(
            (task) =>
              task.crawlRunId === activeCaptureRunId &&
              (task.auditId === undefined || task.auditId === currentAudit.id),
          )
        : [],
    [activeCaptureRunId, currentAudit, tasks],
  );
  const currentFindings = useMemo(
    () =>
      observations
        ? observations
            .filter(
              (observation) =>
                observation.crawlRunId === activeCaptureRunId &&
                observation.auditId === currentAudit?.id,
            )
            .map(findingFromObservation)
        : (currentAudit?.findings ?? []),
    [activeCaptureRunId, currentAudit?.findings, observations],
  );
  const summary = useMemo(
    () => summariseReportReview(currentFindings, runEvidence),
    [currentFindings, runEvidence],
  );
  const availableAreas = useMemo(
    () =>
      areaOrder.filter((candidate) =>
        currentFindings.some((finding) => finding.area === candidate),
      ),
    [currentFindings],
  );
  const findingGroups = useMemo(() => groupAuditFindings(currentFindings), [currentFindings]);
  const visibleGroups = useMemo(
    () => findingGroups.filter((group) => area === 'all' || group.finding.area === area),
    [area, findingGroups],
  );
  const selectedGroup =
    visibleGroups.find((group) => group.key === selectedGroupKey) ?? visibleGroups[0];
  const approvedGroupCount = findingGroups.filter(
    (group) => group.reviewState === 'approved',
  ).length;
  const bulkApprovalGroups = findingGroups
    .filter(
      (group) =>
        group.reviewState === 'needs_review' &&
        group.finding.confidence !== 'low' &&
        evidenceForFinding(group.finding, runEvidence).length > 0,
    )
    .slice(0, Math.max(0, 8 - approvedGroupCount));
  const incompleteTaskCount = currentTasks.filter((task) => task.status !== 'ready').length;
  const reportReady =
    currentAudit?.status === 'ready' &&
    currentTasks.length > 0 &&
    incompleteTaskCount === 0 &&
    summary.approved > 0 &&
    summary.approvedWithoutEvidence === 0 &&
    summary.approvedLowConfidence === 0 &&
    approvedGroupCount <= 8;

  async function reviewFinding(group: FindingGroup, reviewState: 'approved' | 'blocked') {
    const saveReview = observations ? onReviewObservation : onReviewFinding;
    if (!saveReview || pendingFindingId) return;
    setPendingFindingId(group.key);
    setReviewErrors((current) => ({ ...current, [group.key]: '' }));
    try {
      for (const findingId of group.findingIds) {
        await saveReview(findingId, reviewState);
      }
    } catch (caught) {
      setReviewErrors((current) => ({
        ...current,
        [group.key]:
          caught instanceof Error ? caught.message : 'The review decision could not be saved.',
      }));
    } finally {
      setPendingFindingId(undefined);
    }
  }

  async function approveRecommended() {
    const saveReview = observations ? onReviewObservation : onReviewFinding;
    if (!saveReview || pendingFindingId || bulkApprovalGroups.length === 0) return;
    setPendingFindingId('bulk-approve');
    setBulkError('');
    try {
      for (const group of bulkApprovalGroups) {
        for (const findingId of group.findingIds) await saveReview(findingId, 'approved');
      }
    } catch (caught) {
      setBulkError(
        caught instanceof Error
          ? caught.message
          : 'The recommended report themes could not all be approved.',
      );
    } finally {
      setPendingFindingId(undefined);
    }
  }

  async function prepareReport() {
    if (!onPrepareReport || preparing || !reportReady) return;
    setPreparing(true);
    setPrepareError('');
    try {
      await onPrepareReport();
    } catch (caught) {
      setPrepareError(
        caught instanceof Error ? caught.message : 'The reviewed report could not be created.',
      );
    } finally {
      setPreparing(false);
    }
  }

  async function retryAudit() {
    if (!onRetryAudit || retrying) return;
    setRetrying(true);
    setRetryError('');
    try {
      await onRetryAudit();
    } catch (caught) {
      setRetryError(
        caught instanceof Error ? caught.message : 'The specialist audit could not be queued.',
      );
    } finally {
      setRetrying(false);
    }
  }

  const status = currentAudit ? statusPresentation[currentAudit.status] : undefined;

  return (
    <section aria-labelledby="audit-report-title" className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Client report review</p>
          <h2 id="audit-report-title">Website findings for {clientName}</h2>
          <p>
            Check the evidence, refine the plain-English recommendation, and choose what the client
            will see.
          </p>
        </div>
        {status ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : null}
      </header>

      {!currentAudit ? (
        <CurrentAuditNeeded
          clientName={clientName}
          error={retryError}
          onRequestAudit={onRetryAudit ? retryAudit : undefined}
          requesting={retrying}
        />
      ) : currentAudit.status === 'failed' || currentAudit.status === 'cancelled' ? (
        <div className={styles.failure} role="alert">
          <ShieldAlert aria-hidden="true" size={22} />
          <div>
            <h3>
              {currentAudit.status === 'failed' ? 'The current audit stopped' : 'Audit cancelled'}
            </h3>
            <p>
              {currentAudit.progressDetail ||
                'No findings from an earlier run are being shown as current evidence.'}
            </p>
          </div>
          {onRetryAudit ? (
            <Button disabled={retrying} onClick={retryAudit} size="small" variant="secondary">
              {retrying ? (
                <LoaderCircle aria-hidden="true" className={styles.spinner} size={16} />
              ) : (
                <RotateCcw aria-hidden="true" size={16} />
              )}
              {retrying ? 'Queueing audit…' : 'Retry audit'}
            </Button>
          ) : null}
          {retryError ? (
            <p className={styles.reviewError} role="alert">
              {retryError}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {currentReport ? (
            <section
              aria-labelledby="created-report-title"
              className={styles.reportSuccess}
              role="status"
            >
              <span aria-hidden="true" className={styles.reportSuccessIcon}>
                <Check size={22} strokeWidth={2.5} />
              </span>
              <div>
                <p className={styles.eyebrow}>Report created</p>
                <h3 id="created-report-title">Report version {currentReport.version} is ready</h3>
                <p>
                  The approved shortlist is frozen and saved. Review the exact client-facing page
                  privately before deciding whether to continue to handoff.
                </p>
                <small>Saved in report history · {currentReport.summary}</small>
                <p className={styles.previewPrivacy}>
                  Private Studio preview — not shared with the client.
                </p>
              </div>
              <ButtonGroup className={styles.reportSuccessActions}>
                <ButtonLink
                  href={`#/prospects/${currentReport.businessId}/report-preview`}
                  size="small"
                  variant="primary"
                >
                  Preview client report
                  <FileSearch aria-hidden="true" size={16} />
                </ButtonLink>
                <ButtonLink
                  href={`#/prospects/${currentReport.businessId}/handoff`}
                  size="small"
                  variant="secondary"
                >
                  Continue to handoff
                  <ArrowRight aria-hidden="true" size={16} />
                </ButtonLink>
              </ButtonGroup>
            </section>
          ) : null}

          {currentAudit.status === 'running' || currentAudit.status === 'research_pending' ? (
            <IndeterminateProgress
              className={styles.progress}
              detail={
                currentAudit.progressDetail ||
                (currentAudit.status === 'research_pending'
                  ? 'Waiting for captured pages'
                  : 'Specialists are saving evidence as it becomes available')
              }
              label="Current audit progress"
            />
          ) : null}

          <div className={styles.summary} aria-label="Review summary">
            <div>
              <strong>{approvedGroupCount}</strong>
              <span>Client themes selected</span>
            </div>
            <div>
              <strong>
                {findingGroups.filter((group) => group.reviewState === 'needs_review').length}
              </strong>
              <span>Themes needing review</span>
            </div>
            <div>
              <strong>{summary.excluded}</strong>
              <span>Excluded</span>
            </div>
            <div>
              <strong>{runEvidence.length}</strong>
              <span>Evidence items</span>
            </div>
          </div>

          <SpecialistCoverage tasks={currentTasks} />

          <div className={styles.toolbar}>
            <label>
              <span>Show findings</span>
              <select onChange={(event) => setArea(event.target.value as typeof area)} value={area}>
                <option value="all">All areas</option>
                {availableAreas.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {findingGroups.length} review {findingGroups.length === 1 ? 'theme' : 'themes'} from{' '}
              {currentFindings.length} recorded {currentFindings.length === 1 ? 'case' : 'cases'}
            </p>
            {(observations ? onReviewObservation : onReviewFinding) ? (
              <div className={styles.bulkReview}>
                <Button
                  disabled={bulkApprovalGroups.length === 0 || Boolean(pendingFindingId)}
                  onClick={approveRecommended}
                  size="small"
                  variant="secondary"
                >
                  {pendingFindingId === 'bulk-approve' ? (
                    <LoaderCircle aria-hidden="true" className={styles.spinner} size={16} />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                  {bulkApprovalGroups.length > 0
                    ? `Approve all recommended (${bulkApprovalGroups.length})`
                    : 'Recommended themes selected'}
                </Button>
                <small>Selects the strongest evidence-backed themes, up to the report limit.</small>
              </div>
            ) : null}
          </div>
          {bulkError ? (
            <p className={styles.reviewError} role="alert">
              {bulkError}
            </p>
          ) : null}

          {visibleGroups.length > 0 && selectedGroup ? (
            <div className={styles.reviewWorkspace}>
              <nav aria-label="UX finding themes" className={styles.findingQueue}>
                <div className={styles.queueHeading}>
                  <h3>UX review queue</h3>
                  <span>Select no more than eight client themes</span>
                </div>
                <ul>
                  {visibleGroups.map((group) => (
                    <li key={group.key}>
                      <Button
                        aria-current={selectedGroup.key === group.key ? 'true' : undefined}
                        className={styles.queueButton}
                        onClick={() => setSelectedGroupKey(group.key)}
                        type="button"
                        variant={selectedGroup.key === group.key ? 'secondary' : 'quiet'}
                      >
                        <span className={styles.queueTitle}>{group.finding.title}</span>
                        <span className={styles.queueMeta}>
                          {priorityLabel(group.finding.severity)} · {group.affectedPages}{' '}
                          {group.affectedPages === 1 ? 'page' : 'pages'}
                        </span>
                        <StatusBadge
                          tone={
                            group.reviewState === 'approved'
                              ? 'success'
                              : group.reviewState === 'blocked'
                                ? 'neutral'
                                : 'warning'
                          }
                        >
                          {group.reviewState === 'approved'
                            ? 'Selected'
                            : group.reviewState === 'blocked'
                              ? 'Excluded'
                              : 'Review'}
                        </StatusBadge>
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className={styles.selectedFinding}>
                <FindingCard
                  affectedPages={selectedGroup.affectedPages}
                  busy={pendingFindingId === selectedGroup.key}
                  error={reviewErrors[selectedGroup.key]}
                  evidence={evidenceForFinding(selectedGroup.finding, runEvidence)}
                  finding={{ ...selectedGroup.finding, reviewState: selectedGroup.reviewState }}
                  occurrenceCount={selectedGroup.occurrenceCount}
                  onOpenEvidence={onOpenEvidence}
                  onReview={(reviewState) => reviewFinding(selectedGroup, reviewState)}
                />
              </div>
            </div>
          ) : currentAudit.status === 'running' || currentAudit.status === 'research_pending' ? (
            <div className={styles.waiting} role="status">
              <p>Waiting for the first saved finding from this run.</p>
              <div aria-hidden="true" className={styles.skeletonList}>
                <span />
                <span />
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <FileSearch aria-hidden="true" size={24} />
              <h3>No findings in this view</h3>
              <p>
                Choose another area, or confirm that this audit completed without saved findings.
              </p>
            </div>
          )}

          <footer className={styles.reportReadiness}>
            <div>
              <h3>{reportReady ? 'Ready to create the report' : 'Report checks remaining'}</h3>
              <p>
                {reportReady
                  ? `${approvedGroupCount} evidence-backed ${approvedGroupCount === 1 ? 'theme is' : 'themes are'} selected. ${summary.needsReview} unselected ${summary.needsReview === 1 ? 'observation stays' : 'observations stay'} private.`
                  : incompleteTaskCount > 0
                    ? `${incompleteTaskCount} required specialist ${incompleteTaskCount === 1 ? 'section has' : 'sections have'} not completed successfully.`
                    : summary.needsReview > 0
                      ? `Review or exclude ${summary.needsReview} remaining ${summary.needsReview === 1 ? 'finding' : 'findings'}.`
                      : approvedGroupCount > 8
                        ? `Reduce the client shortlist to eight themes or fewer. ${approvedGroupCount} themes are currently selected.`
                        : summary.approvedWithoutEvidence > 0
                          ? `${summary.approvedWithoutEvidence} approved ${summary.approvedWithoutEvidence === 1 ? 'finding needs' : 'findings need'} evidence from this capture.`
                          : summary.approvedLowConfidence > 0
                            ? `${summary.approvedLowConfidence} approved ${summary.approvedLowConfidence === 1 ? 'finding needs' : 'findings need'} stronger corroboration or exclusion.`
                            : 'Approve at least one evidence-backed finding after the audit is ready.'}
              </p>
              {prepareError ? (
                <p className={styles.reviewError} role="alert">
                  {prepareError}
                </p>
              ) : null}
            </div>
            {onPrepareReport ? (
              <Button disabled={!reportReady || preparing} onClick={prepareReport}>
                {preparing ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={17} />
                ) : (
                  <FileSearch aria-hidden="true" size={17} />
                )}
                {preparing
                  ? 'Creating report…'
                  : currentReport
                    ? `Create updated report version`
                    : `Create report from ${approvedGroupCount} selected ${approvedGroupCount === 1 ? 'theme' : 'themes'}`}
              </Button>
            ) : null}
          </footer>
        </>
      )}
    </section>
  );
}
