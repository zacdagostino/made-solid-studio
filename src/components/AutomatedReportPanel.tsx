import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  observations: AuditObservation[];
  tasks: AuditReportSpecialistTask[];
  onPrepareReport: () => void | Promise<void>;
  onRetryAudit?: () => void | Promise<void>;
};

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
  audit,
  clientName,
  observations,
  onPrepareReport,
  onRetryAudit,
  releaseAttestation,
  releaseAttestationAvailability = 'available',
  report,
  tasks,
}: AutomatedReportPanelProps) {
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const attemptedGeneration = useRef('');
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
  const evidenceReady = eligibleObservations.length > 0;
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
  const generationKey = `${currentAudit?.id ?? 'no-audit'}:${releaseAttestation?.attestationId ?? 'no-release'}`;

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

  useEffect(() => {
    if (
      !canGenerate ||
      currentReportMatchesRelease ||
      attemptedGeneration.current === generationKey
    )
      return;
    attemptedGeneration.current = generationKey;
    void prepareReport();
  }, [canGenerate, currentReportMatchesRelease, generationKey, prepareReport]);

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
    attemptedGeneration.current = '';
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
    : preparing || (canGenerate && !prepareError)
      ? 'Generating automatically'
      : releaseSchemaUnavailable
        ? 'Studio update required'
        : !releaseReady
          ? 'Website verification required'
          : !specialistsReady
            ? 'Analysing evidence'
            : !evidenceReady
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
          tone={currentReportMatchesRelease ? 'success' : releaseReady ? 'warning' : 'neutral'}
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
          {!releaseReady && !releaseSchemaUnavailable ? (
            <ButtonLink href={`#/prospects/${currentAudit.businessId}/editing`} variant="primary">
              Verify current edited website <ArrowRight aria-hidden="true" size={17} />
            </ButtonLink>
          ) : null}
          <div className={styles.progressHeading}>
            {preparing || waitingForAudit ? (
              <LoaderCircle aria-hidden="true" className={styles.spin} size={24} />
            ) : legacyReport ? (
              <RefreshCcw aria-hidden="true" size={24} />
            ) : releaseSchemaUnavailable ? (
              <ShieldAlert aria-hidden="true" size={24} />
            ) : (
              <Sparkles aria-hidden="true" size={24} />
            )}
            <div>
              <h3 id="report-progress-title">
                {preparing
                  ? legacyReport
                    ? 'Replacing the legacy report automatically'
                    : 'Generating the report automatically'
                  : legacyReport
                    ? 'The earlier report will be replaced automatically'
                    : 'Automatic report preparation'}
              </h3>
              <p>
                {preparing
                  ? 'Studio is freezing a new immutable report version. You can leave this page while it completes.'
                  : releaseSchemaUnavailable
                    ? 'This website is not asking for another verification. Report automation is waiting for Studio’s release-record database update.'
                    : !releaseReady
                      ? 'The current edited website must pass release verification first. Once it does, this page generates the report without a review step.'
                      : !specialistsReady
                        ? 'The six evidence specialists are still working. Report generation begins as soon as they finish.'
                        : !evidenceReady
                          ? 'The current audit did not produce a supported, non-low-confidence visitor theme. Restart the audit if the source evidence has changed.'
                          : 'All prerequisites are ready. Studio will generate the report automatically.'}
              </p>
            </div>
          </div>
          {preparing || waitingForAudit ? (
            <IndeterminateProgress
              detail={
                preparing
                  ? 'Selecting supported themes and binding them to the verified edit.'
                  : currentAudit.progressDetail || 'Analysing the current website evidence.'
              }
              label={preparing ? 'Automatic report generation' : 'Specialist evidence analysis'}
            />
          ) : null}
          {prepareError ? (
            <div className={styles.inlineError} role="alert">
              <span>{prepareError}</span>
              <Button onClick={retryGeneration} size="small" variant="secondary">
                <RotateCcw aria-hidden="true" size={16} /> Retry automatic generation
              </Button>
            </div>
          ) : null}
        </section>
      )}

      <ol aria-label="Automatic report prerequisites" className={styles.checks}>
        <li data-ready={auditReady && specialistsReady}>
          {auditReady && specialistsReady ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>Current evidence analysed</strong>
            {specialistsReady
              ? 'All six specialist checks are complete.'
              : 'Specialist checks are still running.'}
          </span>
        </li>
        <li data-ready={releaseReady}>
          {releaseReady ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>Edited website verified</strong>
            {releaseReady
              ? `Edit v${releaseAttestation?.sourceEditVersion} passed release checks.`
              : releaseSchemaUnavailable
                ? 'Studio’s release-record database needs to be updated before this verified edit can be attached to the report.'
                : 'The exact edited website still needs release verification.'}
          </span>
        </li>
        <li data-ready={evidenceReady}>
          {evidenceReady ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Circle aria-hidden="true" size={17} />
          )}
          <span>
            <strong>Client themes selected automatically</strong>
            {evidenceReady
              ? `${eligibleObservations.length} supported ${eligibleObservations.length === 1 ? 'case' : 'cases'} will become up to ${selectedThemes.length} client ${selectedThemes.length === 1 ? 'theme' : 'themes'}.`
              : 'Only supported, non-low-confidence visitor findings are eligible.'}
          </span>
        </li>
      </ol>

      {selectedThemes.length > 0 ? (
        <details className={styles.evidenceDetails}>
          <summary>What Studio selected automatically</summary>
          <p>
            Technical duplicates are combined. Platform-only and low-confidence observations stay
            private and are not presented as client value claims.
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
