import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Circle,
  FileSearch,
  LoaderCircle,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type {
  Audit,
  AuditObservation,
  DecisionReport,
  ReportGenerationJob,
  ResearchArtifact,
  SourceReleaseAttestation,
} from '../lib/domain';
import {
  prospectValueReportView,
  reportUsesProspectValueContract,
} from '../lib/prospect-value-report';
import type { AuditReportSpecialistTask } from './AuditReportPanel';
import { Button, ButtonGroup, ButtonLink, IndeterminateProgress, StatusBadge } from './ui';
import styles from './AutomatedReportPanel.module.css';

type AutomatedReportPanelProps = {
  clientName: string;
  activeCaptureRunId?: string;
  audit?: Audit;
  report?: DecisionReport;
  releaseAttestation?: SourceReleaseAttestation;
  releaseAttestationAvailability?: 'available' | 'schema_unavailable' | 'unavailable';
  artifacts: ResearchArtifact[];
  observations: AuditObservation[];
  tasks: AuditReportSpecialistTask[];
  onPrepareReport: () => void | Promise<void>;
  onCancelReport?: (jobId: string) => void | Promise<void>;
  onRetryAudit?: () => void | Promise<void>;
  onRefreshComparisons?: () => void | Promise<void>;
  comparisonRefresh?: {
    status: 'idle' | 'running' | 'failed';
    phase: string;
    detail: string;
  };
  comparisonRefreshBlocker?: string;
  generationJob?: ReportGenerationJob;
  generationWorkerAvailable?: boolean;
};

function metadataRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function metadataBoolean(value: unknown) {
  return value === true || value === 'true';
}

function metadataNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function reportComparisonEvidenceReadiness({
  activeCaptureRunId,
  artifacts,
  audit,
  observations,
  releaseAttestation,
}: {
  activeCaptureRunId?: string;
  artifacts: ResearchArtifact[];
  audit?: Audit;
  observations: AuditObservation[];
  releaseAttestation?: SourceReleaseAttestation;
}) {
  if (!activeCaptureRunId || !audit) {
    return { matchedCandidateCount: 0, trustedObservationCount: 0, trustedOriginalCount: 0 };
  }

  const trustedOriginals = new Map(
    artifacts
      .filter((artifact) => {
        const viewportIntegrity = metadataRecord(artifact.metadata.viewportIntegrity);
        return (
          artifact.kind === 'screenshot' &&
          artifact.crawlRunId === activeCaptureRunId &&
          artifact.metadata.captureContract === 'real-device-responsive-audit-v1' &&
          viewportIntegrity?.status === 'passed'
        );
      })
      .map((artifact) => [artifact.id, artifact]),
  );

  const matchedOriginalIds = new Set<string>();
  for (const artifact of artifacts) {
    const originalArtifactId = artifact.metadata.originalArtifactId;
    if (
      artifact.kind !== 'screenshot' ||
      artifact.crawlRunId !== activeCaptureRunId ||
      artifact.metadata.captureContract !== 'verified-comparison-page-ready-v1' ||
      artifact.metadata.releaseAttestationId !== releaseAttestation?.id ||
      artifact.metadata.captureStatus !== 'passed' ||
      !metadataBoolean(artifact.metadata.pageReady) ||
      metadataBoolean(artifact.metadata.loaderVisible) ||
      typeof originalArtifactId !== 'string'
    )
      continue;
    const original = trustedOriginals.get(originalArtifactId);
    if (!original) continue;
    const originalScroll = metadataRecord(original.metadata.scrollState)?.scrollProgress ?? 0;
    const redesignedScroll = metadataRecord(artifact.metadata.scrollState)?.scrollProgress ?? 0;
    const horizontalOverflow = metadataNumber(artifact.metadata.horizontalOverflowPx);
    if (
      String(original.metadata.evidenceKind ?? '') !==
        String(artifact.metadata.originalEvidenceKind ?? '') ||
      String(originalScroll) !== String(redesignedScroll) ||
      horizontalOverflow === undefined ||
      horizontalOverflow > 1
    )
      continue;
    matchedOriginalIds.add(originalArtifactId);
  }

  const trustedObservationCount = observations.filter(
    (observation) =>
      observation.auditId === audit.id &&
      observation.crawlRunId === activeCaptureRunId &&
      observationIsEligibleForAutomaticReport(observation) &&
      observation.evidenceArtifactIds.some((id) => trustedOriginals.has(id)),
  ).length;
  const matchedCandidateCount = observations.filter(
    (observation) =>
      observation.auditId === audit.id &&
      observation.crawlRunId === activeCaptureRunId &&
      observationIsEligibleForAutomaticReport(observation) &&
      observation.evidenceArtifactIds.some((id) => matchedOriginalIds.has(id)),
  ).length;
  return {
    matchedCandidateCount,
    trustedObservationCount,
    trustedOriginalCount: trustedOriginals.size,
  };
}

const areaLabels: Partial<Record<AuditObservation['area'], string>> = {
  UI: 'Interface clarity',
  UX: 'Visitor journey',
  Mobile: 'Mobile experience',
  Accessibility: 'Inclusive usability',
  SEO: 'Search and content structure',
  Performance: 'Performance',
  Content: 'Content clarity',
  Trust: 'Trust and confidence',
  Conversion: 'Enquiry journey',
};

function reportBelongsToCurrentAudit(
  report: DecisionReport | undefined,
  audit: Audit | undefined,
  activeCaptureRunId: string | undefined,
) {
  return Boolean(
    report &&
    audit &&
    activeCaptureRunId &&
    report.auditId === audit.id &&
    report.crawlRunId === activeCaptureRunId &&
    audit.crawlRunId === activeCaptureRunId,
  );
}

export function observationIsEligibleForAutomaticReport(observation: AuditObservation) {
  return Boolean(
    observation.area !== 'Platform' &&
    observation.confidence !== 'low' &&
    observation.reviewState !== 'blocked' &&
    (observation.evidenceFactIds.length > 0 || observation.evidenceArtifactIds.length > 0),
  );
}

export function AutomatedReportPanel({
  activeCaptureRunId,
  artifacts,
  audit,
  clientName,
  observations,
  onCancelReport,
  onPrepareReport,
  onRefreshComparisons,
  onRetryAudit,
  releaseAttestation,
  releaseAttestationAvailability = 'available',
  report,
  tasks,
  generationJob,
  generationWorkerAvailable = false,
  comparisonRefresh = { status: 'idle', phase: 'idle', detail: '' },
  comparisonRefreshBlocker,
}: AutomatedReportPanelProps) {
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const currentAudit =
    activeCaptureRunId && audit?.crawlRunId === activeCaptureRunId ? audit : undefined;
  const currentReport = reportBelongsToCurrentAudit(report, currentAudit, activeCaptureRunId)
    ? report
    : undefined;
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
  const eligibleObservations = useMemo(
    () =>
      observations.filter(
        (observation) =>
          observation.auditId === currentAudit?.id &&
          observation.crawlRunId === activeCaptureRunId &&
          observationIsEligibleForAutomaticReport(observation),
      ),
    [activeCaptureRunId, currentAudit?.id, observations],
  );
  const selectedThemes = useMemo(
    () =>
      [...new Set(eligibleObservations.map((observation) => observation.area))]
        .slice(0, 5)
        .map((area) => areaLabels[area] ?? area),
    [eligibleObservations],
  );
  const releaseReady = Boolean(
    releaseAttestation &&
    releaseAttestation.checks.length >= 4 &&
    releaseAttestation.checks.every((check) => check.status === 'passed'),
  );
  const releaseSchemaUnavailable = releaseAttestationAvailability === 'schema_unavailable';
  const auditReady = currentAudit?.status === 'ready';
  const specialistsReady =
    currentTasks.length === 6 && currentTasks.every((task) => task.status === 'ready');
  const comparisonEvidence = useMemo(
    () =>
      reportComparisonEvidenceReadiness({
        activeCaptureRunId,
        artifacts,
        audit: currentAudit,
        observations,
        releaseAttestation,
      }),
    [activeCaptureRunId, artifacts, currentAudit, observations, releaseAttestation],
  );
  const eligibleEvidenceExists = eligibleObservations.length > 0;
  const evidenceReady = comparisonEvidence.matchedCandidateCount > 0;
  const trustedAuditEvidenceReady = comparisonEvidence.trustedObservationCount > 0;
  const freshResponsiveAuditRequired = eligibleEvidenceExists && !trustedAuditEvidenceReady;
  const comparisonRefreshRequired = trustedAuditEvidenceReady && !evidenceReady;
  const comparisonRefreshActive = comparisonRefresh.status === 'running';
  const comparisonRefreshFailed = comparisonRefresh.status === 'failed';
  const canGenerate = auditReady && specialistsReady && evidenceReady && releaseReady;
  const currentReportView = currentReport ? prospectValueReportView(currentReport) : undefined;
  const currentReportMatchesRelease = Boolean(
    currentReport &&
    reportUsesProspectValueContract(currentReport) &&
    currentReportView &&
    releaseAttestation &&
    currentReportView.redesign.attestationId === releaseAttestation.attestationId &&
    currentReportView.redesign.sourceCommit === releaseAttestation.sourceCommit,
  );
  const legacyReport = Boolean(currentReport && !reportUsesProspectValueContract(currentReport));
  const matchingGenerationJob =
    generationJob &&
    generationJob.auditId === currentAudit?.id &&
    generationJob.releaseAttestationId === releaseAttestation?.id
      ? generationJob
      : undefined;
  const generationActive =
    matchingGenerationJob?.status === 'queued' || matchingGenerationJob?.status === 'running';
  const generationStopped =
    matchingGenerationJob?.status === 'failed' || matchingGenerationJob?.status === 'cancelled';
  const generationRecoveryAction = matchingGenerationJob?.errorContext.recoveryAction;
  const generationRetryable =
    generationRecoveryAction === undefined || generationRecoveryAction === 'retry';

  const prepareReport = useCallback(async () => {
    if (!canGenerate || preparing) return;
    setPreparing(true);
    setPrepareError('');
    try {
      await onPrepareReport();
    } catch (caught) {
      setPrepareError(
        caught instanceof Error ? caught.message : 'The automatic report could not be created.',
      );
    } finally {
      setPreparing(false);
    }
  }, [canGenerate, onPrepareReport, preparing]);

  async function retryAudit() {
    if (!onRetryAudit || retrying) return;
    setRetrying(true);
    setRetryError('');
    try {
      await onRetryAudit();
    } catch (caught) {
      setRetryError(
        caught instanceof Error ? caught.message : 'The specialist audit could not be restarted.',
      );
    } finally {
      setRetrying(false);
    }
  }

  function retryGeneration() {
    void prepareReport();
  }

  if (!currentAudit) {
    return (
      <section aria-labelledby="automated-report-title" className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Automated client report</p>
            <h2 id="automated-report-title">Prepare {clientName}&apos;s value report</h2>
            <p>Studio needs a completed current audit before it can assemble the report.</p>
          </div>
          <StatusBadge tone="neutral">Waiting for audit</StatusBadge>
        </header>
        <div className={styles.actionState} role="status">
          <FileSearch aria-hidden="true" size={24} />
          <div>
            <h3>Current website evidence is required</h3>
            <p>Run the audit once. Report selection and writing happen automatically after that.</p>
          </div>
          {onRetryAudit ? (
            <Button disabled={retrying} onClick={() => void retryAudit()} variant="primary">
              {retrying ? (
                <LoaderCircle aria-hidden="true" className={styles.spin} size={17} />
              ) : null}
              {retrying ? 'Starting audit…' : 'Run website audit'}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (currentAudit.status === 'failed' || currentAudit.status === 'cancelled') {
    return (
      <section aria-labelledby="automated-report-title" className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Automated client report</p>
            <h2 id="automated-report-title">The evidence audit needs attention</h2>
          </div>
          <StatusBadge tone="danger">Report blocked</StatusBadge>
        </header>
        <div className={styles.failure} role="alert">
          <ShieldAlert aria-hidden="true" size={24} />
          <div>
            <h3>
              {currentAudit.status === 'failed' ? 'The audit stopped' : 'The audit was cancelled'}
            </h3>
            <p>
              {currentAudit.errorSummary ||
                currentAudit.progressDetail ||
                'Restart the audit to continue.'}
            </p>
          </div>
          {onRetryAudit ? (
            <Button disabled={retrying} onClick={() => void retryAudit()} variant="secondary">
              <RotateCcw aria-hidden="true" size={17} />
              {retrying ? 'Restarting…' : 'Restart audit'}
            </Button>
          ) : null}
          {retryError ? <p role="alert">{retryError}</p> : null}
        </div>
      </section>
    );
  }

  const waitingForAudit =
    currentAudit.status === 'running' || currentAudit.status === 'research_pending';
  const stateLabel = currentReportMatchesRelease
    ? 'Report ready'
    : comparisonRefreshActive
      ? 'Updating comparisons'
      : matchingGenerationJob?.status === 'failed'
        ? 'Generation failed'
        : matchingGenerationJob?.status === 'cancelled'
          ? 'Generation cancelled'
          : matchingGenerationJob?.status === 'queued'
            ? 'Report queued'
            : matchingGenerationJob?.status === 'running'
              ? 'Writing report'
              : !generationWorkerAvailable && canGenerate
                ? 'Report worker offline'
                : preparing || generationActive
                  ? 'Generating automatically'
                  : releaseSchemaUnavailable
                    ? 'Studio update required'
                    : !releaseReady
                      ? 'Website verification required'
                      : !specialistsReady
                        ? 'Analysing evidence'
                        : freshResponsiveAuditRequired
                          ? 'Responsive evidence required'
                          : comparisonRefreshRequired
                            ? 'Comparison refresh required'
                            : !eligibleEvidenceExists
                              ? 'No eligible evidence'
                              : 'Ready to generate';

  return (
    <section aria-labelledby="automated-report-title" className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Automated client value report</p>
          <h2 id="automated-report-title">{clientName} website report</h2>
          <p>
            Studio automatically turns supported evidence and the verified edited website into a
            client-ready report. No manual review is required.
          </p>
        </div>
        <StatusBadge
          tone={
            currentReportMatchesRelease
              ? 'success'
              : matchingGenerationJob?.status === 'failed'
                ? 'danger'
                : releaseReady
                  ? 'warning'
                  : 'neutral'
          }
        >
          {stateLabel}
        </StatusBadge>
      </header>

      {currentReportMatchesRelease && currentReport ? (
        <section aria-labelledby="report-ready-title" className={styles.ready} role="status">
          <span aria-hidden="true" className={styles.readyIcon}>
            <Check size={23} strokeWidth={2.5} />
          </span>
          <div>
            <p className={styles.eyebrow}>Current verified website</p>
            <h3 id="report-ready-title">Value report v{currentReport.version} is current</h3>
            <p>
              Edit v{currentReportView?.redesign.sourceEditVersion} · commit{' '}
              <code>{currentReportView?.redesign.sourceCommit.slice(0, 8)}</code> · latest supported
              themes.
            </p>
          </div>
          <ButtonGroup className={styles.actions}>
            <ButtonLink
              href={`#/prospects/${currentReport.businessId}/report-preview`}
              variant="primary"
            >
              Preview client report <FileSearch aria-hidden="true" size={17} />
            </ButtonLink>
            <ButtonLink
              href={`#/prospects/${currentReport.businessId}/handoff`}
              variant="secondary"
            >
              Continue to handoff <ArrowRight aria-hidden="true" size={17} />
            </ButtonLink>
          </ButtonGroup>
        </section>
      ) : (
        <section aria-labelledby="report-progress-title" className={styles.progressState}>
          <div className={styles.progressHeading}>
            {preparing || generationActive || waitingForAudit || comparisonRefreshActive ? (
              <LoaderCircle aria-hidden="true" className={styles.spin} size={24} />
            ) : generationStopped || comparisonRefreshFailed ? (
              <ShieldAlert aria-hidden="true" size={24} />
            ) : legacyReport ? (
              <RefreshCcw aria-hidden="true" size={24} />
            ) : releaseSchemaUnavailable ? (
              <ShieldAlert aria-hidden="true" size={24} />
            ) : (
              <Sparkles aria-hidden="true" size={24} />
            )}
            <div>
              <h3 id="report-progress-title">
                {comparisonRefreshActive
                  ? 'Capturing matching before-and-after screenshots'
                  : generationActive
                    ? matchingGenerationJob?.progressPhase === 'queued'
                      ? 'The report is queued and waiting to start'
                      : 'GPT-5.6 Sol is building the report'
                    : generationStopped
                      ? 'The replacement report needs attention'
                      : preparing
                        ? legacyReport
                          ? 'Replacing the legacy report automatically'
                          : 'Generating the report automatically'
                        : comparisonRefreshFailed
                          ? 'The comparison refresh needs attention'
                          : freshResponsiveAuditRequired
                            ? 'Capture current responsive evidence once'
                            : comparisonRefreshRequired
                              ? 'Fresh audit complete — update the comparison screenshots'
                              : legacyReport
                                ? 'The earlier report will be replaced automatically'
                                : 'Automatic report preparation'}
              </h3>
              <p>
                {comparisonRefreshActive
                  ? comparisonRefresh.detail ||
                    'Checking the exact edited website and capturing the same pages, screen sizes and scroll positions as the fresh audit.'
                  : generationActive
                    ? matchingGenerationJob?.progressDetail
                    : generationStopped
                      ? 'No incomplete report was saved. Review the exact error and recovery action below, then retry when it is ready.'
                      : preparing
                        ? 'Studio is freezing a new immutable report version. You can leave this page while it completes.'
                        : releaseSchemaUnavailable
                          ? 'This website is not asking for another verification. Report automation is waiting for Studio’s release-record database update.'
                          : !releaseReady
                            ? 'The current edited website must pass release verification first. Once it does, this page generates the report without a review step.'
                            : !specialistsReady
                              ? 'The six evidence specialists are still working. Report generation begins as soon as they finish.'
                              : !eligibleEvidenceExists
                                ? 'The current audit did not produce a supported, non-low-confidence visitor theme. Restart the audit if the source evidence has changed.'
                                : freshResponsiveAuditRequired
                                  ? `The ${eligibleObservations.length} supported observations do not yet include trusted responsive screenshots. Run one fresh audit; Studio will handle the remaining comparison and report steps automatically.`
                                  : comparisonRefreshRequired
                                    ? `${comparisonEvidence.trustedObservationCount} supported ${comparisonEvidence.trustedObservationCount === 1 ? 'finding has' : 'findings have'} fresh old-site screenshots. The edited website’s earlier verification is still valid, but its comparison images point to the previous audit. Studio will refresh those images without rerunning the audit.`
                                    : 'All prerequisites are ready. Studio will start the report automatically; the manual action below remains available if the request needs to be retried.'}
              </p>
              {generationActive ? (
                <small>
                  Step{' '}
                  {Math.min(
                    matchingGenerationJob.completedItems + 1,
                    matchingGenerationJob.totalItems,
                  )}{' '}
                  of {matchingGenerationJob.totalItems} · {matchingGenerationJob.model} ·{' '}
                  {matchingGenerationJob.reasoningEffort} reasoning
                </small>
              ) : null}
            </div>
          </div>
          {preparing || generationActive || waitingForAudit || comparisonRefreshActive ? (
            <IndeterminateProgress
              detail={
                comparisonRefreshActive
                  ? comparisonRefresh.detail || 'Refreshing verified comparison screenshots.'
                  : generationActive
                    ? matchingGenerationJob?.progressDetail || 'Analysing verified comparisons.'
                    : preparing
                      ? 'Queueing the protected report generation worker.'
                      : currentAudit.progressDetail || 'Analysing the current website evidence.'
              }
              label={
                comparisonRefreshActive
                  ? 'Verified comparison refresh'
                  : preparing || generationActive
                    ? 'Automatic report generation'
                    : 'Specialist evidence analysis'
              }
            />
          ) : null}
          {generationActive && onCancelReport ? (
            <div className={styles.stopAction}>
              <Button
                onClick={() => void onCancelReport(matchingGenerationJob.id)}
                size="small"
                variant="secondary"
              >
                Stop report generation
              </Button>
              <small>
                The worker stops at its next safe checkpoint. No partial report is shown.
              </small>
            </div>
          ) : null}
          {freshResponsiveAuditRequired && onRetryAudit ? (
            <Button disabled={retrying} onClick={() => void retryAudit()} variant="primary">
              {retrying ? (
                <LoaderCircle aria-hidden="true" className={styles.spin} size={17} />
              ) : (
                <RotateCcw aria-hidden="true" size={17} />
              )}
              {retrying ? 'Starting fresh responsive audit…' : 'Run fresh responsive audit'}
            </Button>
          ) : null}
          {comparisonRefreshRequired && onRefreshComparisons && !comparisonRefreshActive ? (
            <Button
              disabled={Boolean(comparisonRefreshBlocker)}
              onClick={() => void onRefreshComparisons()}
              variant="primary"
            >
              <RefreshCcw aria-hidden="true" size={17} />
              Refresh comparison screenshots
            </Button>
          ) : null}
          {comparisonRefreshRequired && comparisonRefreshBlocker ? (
            <div className={styles.inlineError} role="alert">
              <div>
                <strong>Comparison refresh cannot start yet</strong>
                <p>{comparisonRefreshBlocker}</p>
              </div>
              <ButtonLink
                href={`#/prospects/${currentAudit.businessId}/editing`}
                size="small"
                variant="secondary"
              >
                Open Website editing <ArrowRight aria-hidden="true" size={16} />
              </ButtonLink>
            </div>
          ) : null}
          {comparisonRefreshFailed ? (
            <div className={styles.inlineError} role="alert">
              <div>
                <strong>Comparison screenshot refresh stopped</strong>
                <p>{comparisonRefresh.detail}</p>
                {comparisonRefresh.phase ? <small>Phase {comparisonRefresh.phase}</small> : null}
              </div>
              {onRefreshComparisons ? (
                <Button
                  disabled={Boolean(comparisonRefreshBlocker)}
                  onClick={() => void onRefreshComparisons()}
                  size="small"
                  variant="secondary"
                >
                  <RotateCcw aria-hidden="true" size={16} /> Retry comparison refresh
                </Button>
              ) : null}
            </div>
          ) : null}
          {retryError ? <p role="alert">{retryError}</p> : null}
          {canGenerate &&
          generationWorkerAvailable &&
          !preparing &&
          !generationActive &&
          !generationStopped ? (
            <Button onClick={() => void prepareReport()} variant="primary">
              <Sparkles aria-hidden="true" size={17} /> Generate current report
            </Button>
          ) : null}
          {prepareError || generationStopped ? (
            <div className={styles.inlineError} role="alert">
              <div>
                <strong>Report generation stopped</strong>
                <p>
                  {prepareError ||
                    matchingGenerationJob?.errorSummary ||
                    matchingGenerationJob?.progressDetail ||
                    'The report worker stopped before saving a new report.'}
                </p>
                {matchingGenerationJob?.errorCode ? (
                  <small>
                    Error {matchingGenerationJob.errorCode} · phase{' '}
                    {matchingGenerationJob.progressPhase}
                  </small>
                ) : null}
              </div>
              {generationRetryable ? (
                <Button
                  disabled={!generationWorkerAvailable}
                  onClick={retryGeneration}
                  size="small"
                  variant="secondary"
                >
                  <RotateCcw aria-hidden="true" size={16} /> Retry report generation
                </Button>
              ) : generationRecoveryAction === 'rerun_release_verification' ? (
                <ButtonLink
                  href={`#/prospects/${currentAudit.businessId}/editing`}
                  size="small"
                  variant="secondary"
                >
                  Re-run website verification <ArrowRight aria-hidden="true" size={16} />
                </ButtonLink>
              ) : (
                <Button disabled size="small" variant="secondary">
                  Worker configuration required
                </Button>
              )}
            </div>
          ) : null}
          {!generationWorkerAvailable &&
          !generationActive &&
          canGenerate &&
          !currentReportMatchesRelease ? (
            <div className={styles.inlineError} role="alert">
              <div>
                <strong>Report worker is offline</strong>
                <p>No generation was started. Reconnect the protected worker and retry.</p>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <ol aria-label="Automatic report workflow" className={styles.checks}>
        <li data-ready={auditReady && specialistsReady}>
          {auditReady && specialistsReady ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>1. Current website audit</strong>
            {specialistsReady
              ? 'All six specialist checks are complete.'
              : 'Specialist checks are still running.'}
          </span>
        </li>
        <li data-ready={releaseReady && evidenceReady}>
          {releaseReady && evidenceReady ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>2. Matched design comparisons</strong>
            {evidenceReady
              ? `${comparisonEvidence.matchedCandidateCount} supported before-and-after ${comparisonEvidence.matchedCandidateCount === 1 ? 'comparison is' : 'comparisons are'} ready for edit v${releaseAttestation?.sourceEditVersion}.`
              : comparisonRefreshActive
                ? 'Studio is matching the edited website to the fresh audit screenshots now.'
                : comparisonRefreshRequired
                  ? 'The fresh old-site screenshots are ready; the matching edited-site images need to be refreshed.'
                  : releaseReady
                    ? 'The website passed release checks. Fresh responsive audit screenshots are still required.'
                    : releaseSchemaUnavailable
                      ? 'Studio’s release-record database needs to be updated before this verified edit can be attached to the report.'
                      : 'The edited website needs exact verification before comparisons can be created.'}
          </span>
        </li>
        <li data-ready={currentReportMatchesRelease}>
          {currentReportMatchesRelease ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>3. Client report</strong>
            {currentReportMatchesRelease
              ? `Value report v${currentReport?.version} is ready to preview.`
              : generationActive
                ? matchingGenerationJob?.status === 'queued'
                  ? 'Queued safely. The report agent will begin when the worker is available.'
                  : 'GPT-5.6 Sol is selecting and writing the strongest supported design story.'
                : generationStopped
                  ? 'Generation stopped without replacing the earlier report. Use the recovery action above.'
                  : evidenceReady
                    ? 'Everything is ready. Studio will queue the report automatically.'
                    : 'Starts automatically after the matched comparisons are ready.'}
          </span>
        </li>
      </ol>

      {evidenceReady && selectedThemes.length > 0 ? (
        <details className={styles.evidenceDetails}>
          <summary>Candidate areas available to the report agent</summary>
          <p>
            GPT-5.6 Sol considers these areas together at maximum reasoning. Evidence checks still
            exclude platform-only, blocked, low-confidence, stale and unmatched evidence. The agent
            then identifies the visible design problems, strongest comparisons and design decisions.
          </p>
          <ul>
            {selectedThemes.map((theme) => (
              <li key={theme}>{theme}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
