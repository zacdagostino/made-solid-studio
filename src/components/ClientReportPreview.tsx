import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  MoveHorizontal,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type {
  Audit,
  DecisionReport,
  ReportGenerationJob,
  ReportPreviewJob,
  SourceReleaseAttestation,
} from '../lib/domain';
import {
  prospectValueReportSchemaVersion,
  prospectValueReportView,
  reportUsesProspectValueContract,
} from '../lib/prospect-value-report';
import { Button, ButtonGroup, ButtonLink, IndeterminateProgress } from './ui';
import styles from './ClientReportPreview.module.css';

export function clientReportThemes<T extends { evidenceArtifactId?: string }>(themes: T[]) {
  return [...themes]
    .sort(
      (left, right) =>
        Number(Boolean(right.evidenceArtifactId)) - Number(Boolean(left.evidenceArtifactId)),
    )
    .slice(0, 4);
}

export function clientReportContractState(
  report?: DecisionReport,
): 'missing' | 'ready' | 'legacy' | 'studio_update_required' | 'invalid' {
  if (!report) return 'missing';
  if (reportUsesProspectValueContract(report)) return 'ready';
  if (typeof report.schemaVersion === 'number') {
    if (report.schemaVersion < prospectValueReportSchemaVersion) return 'legacy';
    if (report.schemaVersion > prospectValueReportSchemaVersion) return 'studio_update_required';
  }
  return 'invalid';
}

function clientProofLabel(id: string, label: string) {
  const labels: Record<string, string> = {
    'responsive-layout': 'Reviewed across mobile, tablet and desktop',
    'compact-navigation': 'Navigation and customer journeys tested',
    accessibility: 'Inclusive access checks completed',
    'complete-website': 'Complete website prepared for review',
    'route-coverage': 'Every planned page is included',
  };
  return labels[id] || label;
}

function BeforeAfterComparison({
  afterUrl,
  beforeUrl,
  clientName,
  notice,
  originalOverflowPx,
  title,
  viewportHeight,
  viewportWidth,
}: {
  afterUrl: string;
  beforeUrl: string;
  clientName: string;
  notice: string;
  originalOverflowPx: number;
  title: string;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const [position, setPosition] = useState(50);
  const maximumFrameWidth = Math.round(Math.min(1120, (viewportWidth / viewportHeight) * 704));
  const viewportLabel =
    viewportWidth <= 480 ? 'Phone' : viewportWidth <= 900 ? 'Tablet' : 'Desktop';
  return (
    <figure className={styles.comparisonFigure}>
      <div
        className={styles.comparisonFrame}
        style={{
          aspectRatio: `${viewportWidth} / ${viewportHeight}`,
          maxWidth: `min(100%, ${maximumFrameWidth}px)`,
        }}
      >
        <img alt={`Original ${clientName} website showing ${title}`} src={beforeUrl} />
        <div
          aria-hidden="true"
          className={styles.afterLayer}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img alt="" src={afterUrl} />
        </div>
        <span className={styles.beforeLabel}>Before</span>
        <span className={styles.afterLabel}>After</span>
        <span
          aria-hidden="true"
          className={styles.comparisonHandle}
          style={{ left: `${position}%` }}
        >
          <MoveHorizontal size={18} />
        </span>
        <input
          aria-label={`Compare the original and redesigned ${title} screenshots`}
          max="100"
          min="0"
          onChange={(event) => setPosition(Number(event.currentTarget.value))}
          type="range"
          value={position}
        />
      </div>
      <figcaption>
        <strong>
          Verified {viewportLabel.toLowerCase()} comparison · {viewportWidth} × {viewportHeight}
        </strong>
        <span>
          {originalOverflowPx > 1
            ? `The original page was ${originalOverflowPx}px wider than this ${viewportLabel.toLowerCase()} screen. The redesigned page fits without sideways scrolling.`
            : `Both pages were captured at the same ${viewportLabel.toLowerCase()} screen size. The redesign fits without sideways scrolling.`}
        </span>
        <strong>What to notice in the original</strong>
        <span>{notice}</span>
        <small>
          Drag the comparison control, or use its arrow keys, to reveal the original and redesigned
          website.
        </small>
      </figcaption>
    </figure>
  );
}

export function previewReportIsCurrent(
  report: DecisionReport | undefined,
  audit: Audit | undefined,
  activeCaptureRunId: string | undefined,
) {
  return Boolean(
    report &&
    report.status === 'approved' &&
    report.auditId === audit?.id &&
    report.crawlRunId === activeCaptureRunId &&
    audit?.crawlRunId === activeCaptureRunId,
  );
}

export function clientspaceCopyStatus(
  remoteJob: ReportPreviewJob | undefined,
  now = Date.now(),
): 'idle' | 'creating' | 'ready' | 'failed' {
  if (remoteJob?.status === 'queued' || remoteJob?.status === 'running') return 'creating';
  if (remoteJob?.status === 'failed') return 'failed';
  if (
    remoteJob?.status === 'ready' &&
    remoteJob.previewUrl &&
    remoteJob.previewExpiresAt &&
    new Date(remoteJob.previewExpiresAt).valueOf() > now
  ) {
    return 'ready';
  }
  return 'idle';
}

export function ClientReportPreview({
  activeCaptureRunId,
  audit,
  clientName,
  evidenceUrls,
  generationJob,
  generationWorkerAvailable,
  latestReleaseAttestation,
  onCancelGeneration,
  onRequestRemotePreview,
  onRetryGeneration,
  remoteJob,
  report,
  reportPreviewWorkerAvailable,
  screenshotLoadError,
}: {
  activeCaptureRunId?: string;
  audit?: Audit;
  clientName: string;
  evidenceUrls: Record<string, string>;
  generationJob?: ReportGenerationJob;
  generationWorkerAvailable: boolean;
  latestReleaseAttestation?: SourceReleaseAttestation;
  onCancelGeneration: (jobId: string) => Promise<void>;
  onRequestRemotePreview: (reportVersionId: string) => Promise<void>;
  onRetryGeneration: () => Promise<void>;
  remoteJob?: ReportPreviewJob;
  report?: DecisionReport;
  reportPreviewWorkerAvailable: boolean;
  screenshotLoadError?: string;
}) {
  const current = previewReportIsCurrent(report, audit, activeCaptureRunId) ? report : undefined;
  const view = current ? prospectValueReportView(current) : undefined;
  const contractState = clientReportContractState(report);
  const copyStatus = clientspaceCopyStatus(remoteJob);
  const active = copyStatus === 'creating';
  const ready = copyStatus === 'ready';
  const websiteChangedSinceReport = Boolean(
    current &&
    view &&
    latestReleaseAttestation &&
    (view.redesign.attestationId !== latestReleaseAttestation.attestationId ||
      view.redesign.sourceCommit !== latestReleaseAttestation.sourceCommit),
  );
  const clientThemes = view ? clientReportThemes(view.themes) : [];
  const generationActive =
    generationJob?.status === 'queued' || generationJob?.status === 'running';
  const generationStopped =
    generationJob?.status === 'failed' || generationJob?.status === 'cancelled';

  if (generationActive) {
    return (
      <section aria-labelledby="report-generation-title" className={styles.generationState}>
        <span aria-hidden="true" className={styles.generationIcon}>
          <LoaderCircle className={styles.spin} size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Replacing the client report</p>
          <h2 id="report-generation-title">
            {generationJob.status === 'queued'
              ? 'The new report is queued'
              : 'GPT-5.6 Sol is choosing the strongest comparisons'}
          </h2>
          <p>
            {generationJob.progressDetail ||
              'Studio is analysing the verified before-and-after evidence.'}
          </p>
          <small>
            Step {Math.min(generationJob.completedItems + 1, generationJob.totalItems)} of{' '}
            {generationJob.totalItems} · {generationJob.model} · {generationJob.reasoningEffort}{' '}
            reasoning
          </small>
          <IndeterminateProgress
            detail={generationJob.progressDetail || 'Analysing verified comparison candidates.'}
            label="Client report generation"
          />
          <p className={styles.generationNote}>
            The previous report remains in history and is not shown as the current result while this
            replacement is running. You can leave this page and return later.
          </p>
        </div>
        <ButtonGroup className={styles.generationActions}>
          <Button
            onClick={() => void onCancelGeneration(generationJob.id)}
            size="small"
            variant="secondary"
          >
            Cancel generation
          </Button>
          <ButtonLink
            href={`#/prospects/${generationJob.businessId}/report`}
            size="small"
            variant="secondary"
          >
            View report status
          </ButtonLink>
        </ButtonGroup>
      </section>
    );
  }

  if (generationStopped) {
    const failed = generationJob.status === 'failed';
    const recoveryAction = generationJob.errorContext.recoveryAction;
    const retryable = recoveryAction === undefined || recoveryAction === 'retry';
    return (
      <section
        aria-labelledby="report-generation-error-title"
        className={styles.generationError}
        role="alert"
      >
        <span aria-hidden="true" className={styles.generationErrorIcon}>
          <ShieldAlert size={24} />
        </span>
        <div>
          <p className={styles.kicker}>
            {failed ? 'Report generation error' : 'Generation cancelled'}
          </p>
          <h2 id="report-generation-error-title">
            {failed
              ? 'The replacement report was not created'
              : 'The replacement report was stopped'}
          </h2>
          <p>
            {generationJob.errorSummary ||
              generationJob.progressDetail ||
              'No new client report was saved.'}
          </p>
          {generationJob.errorCode ? (
            <small>
              Error {generationJob.errorCode} · phase {generationJob.progressPhase}
            </small>
          ) : null}
          {!generationWorkerAvailable ? (
            <p className={styles.generationNote}>
              The protected report worker is offline. Reconnect it before retrying.
            </p>
          ) : null}
        </div>
        <ButtonGroup className={styles.generationActions}>
          {retryable ? (
            <Button
              disabled={!generationWorkerAvailable}
              onClick={() => void onRetryGeneration()}
              size="small"
              variant="primary"
            >
              <RotateCcw aria-hidden="true" size={16} /> Retry report generation
            </Button>
          ) : recoveryAction === 'rerun_release_verification' ? (
            <ButtonLink
              href={`#/prospects/${generationJob.businessId}/editing`}
              size="small"
              variant="primary"
            >
              Re-run website verification <ArrowRight aria-hidden="true" size={16} />
            </ButtonLink>
          ) : (
            <Button disabled size="small" variant="primary">
              Worker configuration required
            </Button>
          )}
          <ButtonLink
            href={`#/prospects/${generationJob.businessId}/report`}
            size="small"
            variant="secondary"
          >
            View full status
          </ButtonLink>
        </ButtonGroup>
      </section>
    );
  }

  if (generationJob?.status === 'ready' && !current) {
    return (
      <section
        aria-labelledby="report-generation-ready-title"
        className={styles.generationState}
        role="status"
      >
        <span aria-hidden="true" className={styles.generationIcon}>
          <LoaderCircle className={styles.spin} size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Report saved</p>
          <h2 id="report-generation-ready-title">Loading the new client report</h2>
          <p>The generation worker finished successfully. Studio is refreshing the saved report.</p>
        </div>
      </section>
    );
  }

  if (report && contractState === 'studio_update_required') {
    return (
      <section className={styles.legacy} role="status">
        <span aria-hidden="true" className={styles.legacyIcon}>
          <RefreshCcw size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Client report already generated</p>
          <h2>Studio is updating to open report version {report.version}</h2>
          <p>
            This report uses a newer format than the Studio code currently open in this tab. The
            report does not need to be regenerated.
          </p>
          <p>Once the Studio update finishes, reload this tab to open the completed report.</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="primary">
          <RefreshCcw aria-hidden="true" size={17} /> Reload updated Studio
        </Button>
      </section>
    );
  }

  if (report && contractState === 'legacy') {
    return (
      <section className={styles.legacy} role="alert">
        <span aria-hidden="true" className={styles.legacyIcon}>
          <RefreshCcw size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Previous report format</p>
          <h2>This report needs to be regenerated</h2>
          <p>
            Version {report.version} uses an earlier report contract. It does not use the current
            automatic evidence-selection rules for the exact verified edited website, so it should
            not be used with the client.
          </p>
          <p>
            Return to Report. Studio will create an updated value report automatically after the
            current edited website has passed release verification. The older version stays in
            history.
          </p>
        </div>
        <ButtonLink href={`#/prospects/${report.businessId}/report`} variant="primary">
          <RefreshCcw aria-hidden="true" size={17} /> Regenerate report
        </ButtonLink>
      </section>
    );
  }

  if (report && contractState === 'invalid') {
    return (
      <section className={styles.legacy} role="alert">
        <span aria-hidden="true" className={styles.legacyIcon}>
          <RefreshCcw size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Report generation needs attention</p>
          <h2>Report version {report.version} could not be opened</h2>
          <p>
            Studio saved this report, but its verified before-and-after evidence is incomplete. This
            is a report error, not an older report format.
          </p>
          <p>Open Report to see the exact error and retry the automatic generation.</p>
        </div>
        <ButtonLink href={`#/prospects/${report.businessId}/report`} variant="primary">
          View report status
        </ButtonLink>
      </section>
    );
  }

  if (current && view && websiteChangedSinceReport) {
    return (
      <section className={styles.legacy} role="alert">
        <span aria-hidden="true" className={styles.legacyIcon}>
          <RefreshCcw size={24} />
        </span>
        <div>
          <p className={styles.kicker}>Website changed after this report</p>
          <h2>Regenerate the report for the current edited website</h2>
          <p>
            Report version {current.version} is tied to commit{' '}
            <code>{view.redesign.sourceCommit.slice(0, 8)}</code>, but the latest verified website
            is commit <code>{latestReleaseAttestation?.sourceCommit.slice(0, 8)}</code>. The report
            stays in history and must not be presented as current.
          </p>
        </div>
        <ButtonLink href={`#/prospects/${current.businessId}/report`} variant="primary">
          <RefreshCcw aria-hidden="true" size={17} /> Create current report
        </ButtonLink>
      </section>
    );
  }

  if (!current || !view) {
    return (
      <section className={styles.unavailable} role="alert">
        <LockKeyhole aria-hidden="true" size={24} />
        <div>
          <h2>This preview is no longer current</h2>
          <p>Create a new report from the latest completed audit before previewing it.</p>
        </div>
        <ButtonLink href={`#/prospects/${report?.businessId ?? ''}/report`} variant="secondary">
          Back to report
        </ButtonLink>
      </section>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.privateBar} aria-label="Private preview controls">
        <div>
          <LockKeyhole aria-hidden="true" size={18} />
          <span>
            <strong>Private Studio preview</strong> · not shared with the client
          </span>
        </div>
        <ButtonGroup>
          <ButtonLink
            href={`#/prospects/${current.businessId}/report`}
            size="small"
            variant="secondary"
          >
            <ArrowLeft aria-hidden="true" size={16} /> Back to report
          </ButtonLink>
          <ButtonLink
            href={`#/prospects/${current.businessId}/handoff`}
            size="small"
            variant="secondary"
          >
            Continue to handoff <ArrowRight aria-hidden="true" size={16} />
          </ButtonLink>
        </ButtonGroup>
      </aside>

      <section className={styles.reportStatus} role="status">
        <span aria-hidden="true" className={styles.reportStatusIcon}>
          <Check size={20} strokeWidth={2.5} />
        </span>
        <div>
          <p className={styles.kicker}>Client report status</p>
          <h2>Client report generated and ready</h2>
          <p>
            This is the current report for {clientName}. You can review the complete client-facing
            report below now.
          </p>
        </div>
      </section>

      <article className={styles.report}>
        <header className={styles.hero}>
          <p>Made Solid · Website value report</p>
          <h1>{view.title}</h1>
          <p className={styles.lede}>{view.summary}</p>
          <div className={styles.reportMeta}>
            <span>Prepared for {clientName}</span>
            <span>Complete website ready to review</span>
          </div>
        </header>

        <section className={styles.intro} aria-labelledby="foundation-title">
          <div>
            <p className={styles.kicker}>The outcome</p>
            <h2 id="foundation-title">A stronger digital foundation is ready</h2>
          </div>
          <p>
            We have turned the clearest problems in the original experience into practical
            improvements that help customers understand {clientName} and take the next step.
          </p>
        </section>

        {view.strengths.length ? (
          <section className={styles.strengths} aria-labelledby="strengths-title">
            <div>
              <p className={styles.kicker}>What is already working in your favour</p>
              <h2 id="strengths-title">A foundation worth building on</h2>
            </div>
            <div className={styles.strengthGrid}>
              {view.strengths.map((strength) => (
                <article key={strength.id}>
                  <Sparkles aria-hidden="true" size={20} />
                  <h3>{strength.title}</h3>
                  <p>{strength.detail}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.themes} aria-labelledby="themes-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Before and after</p>
            <h2 id="themes-title">See what changed—and why it&apos;s better</h2>
            <p>
              {clientThemes.length === 1
                ? 'Here is the strongest matched design improvement for your customers.'
                : `Here are the ${clientThemes.length} strongest matched design improvements for your customers.`}
            </p>
          </div>
          <div className={styles.findings}>
            {clientThemes.map((theme, index) => (
              <article className={styles.finding} key={theme.id}>
                <header>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p>{theme.area}</p>
                    <h3>{theme.title}</h3>
                  </div>
                </header>
                {theme.evidenceArtifactId &&
                evidenceUrls[theme.evidenceArtifactId] &&
                evidenceUrls[theme.afterEvidenceArtifactId] ? (
                  <BeforeAfterComparison
                    afterUrl={evidenceUrls[theme.afterEvidenceArtifactId]}
                    beforeUrl={evidenceUrls[theme.evidenceArtifactId]}
                    clientName={clientName}
                    notice={theme.whatToNotice || theme.before}
                    originalOverflowPx={theme.originalOverflowPx}
                    title={theme.title}
                    viewportHeight={theme.viewportHeight}
                    viewportWidth={theme.viewportWidth}
                  />
                ) : theme.evidenceArtifactId && screenshotLoadError ? (
                  <div className={styles.evidenceError} role="alert">
                    <LockKeyhole aria-hidden="true" size={20} />
                    <div>
                      <strong>Original website screenshot couldn&apos;t be loaded</strong>
                      <p>{screenshotLoadError}</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.noEvidence}>
                    <strong>What customers experienced</strong>
                    <p>{theme.before}</p>
                  </div>
                )}
                <div className={styles.findingCopy}>
                  <div className={styles.recommendation}>
                    <h4>What changed</h4>
                    <p>{theme.whatChanged}</p>
                  </div>
                  <div>
                    <h4>Why it&apos;s better</h4>
                    <p>{theme.whyBetter}</p>
                  </div>
                  <div>
                    <h4>Customer value</h4>
                    <p>{theme.value}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.proof} aria-labelledby="proof-title">
          <div>
            <p className={styles.kicker}>Delivered and checked</p>
            <h2 id="proof-title">Your complete website is ready to review</h2>
            <p>Key pages and customer journeys have been checked before this presentation.</p>
          </div>
          <ul>
            {view.deliveredWork.map((proof) => (
              <li key={proof.id}>
                <Check aria-hidden="true" size={18} />
                <span>
                  <strong>{clientProofLabel(proof.id, proof.label)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className={styles.footer}>
          <div>
            <p className={styles.kicker}>Next step</p>
            <h2>{view.nextStep}</h2>
          </div>
          <ShieldCheck aria-hidden="true" size={32} />
        </footer>
      </article>

      <details className={styles.internalDetails}>
        <summary>Internal Studio evidence and verification</summary>
        <p>This information supports the report and is not part of the client presentation.</p>
        <dl>
          <div>
            <dt>Edited website</dt>
            <dd>v{view.redesign.sourceEditVersion}</dd>
          </div>
          <div>
            <dt>Verified</dt>
            <dd>{new Date(view.redesign.verifiedAt).toLocaleString('en-AU')}</dd>
          </div>
          <div>
            <dt>Source commit</dt>
            <dd>
              <code>{view.redesign.sourceCommit}</code>
            </dd>
          </div>
        </dl>
        {view.methodology.length ? (
          <>
            <h3>Methodology</h3>
            <ul>
              {view.methodology.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
        {view.limitations.length ? (
          <>
            <h3>Limitations</h3>
            <ul>
              {view.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
      </details>

      <section aria-labelledby="clientspace-preview-title" className={styles.remotePreview}>
        <div>
          <p className={styles.kicker}>Optional delivery step</p>
          <h2 id="clientspace-preview-title">
            {copyStatus === 'ready'
              ? 'Shareable Clientspace copy is ready'
              : copyStatus === 'creating'
                ? 'Creating the shareable Clientspace copy'
                : copyStatus === 'failed'
                  ? 'The shareable Clientspace copy could not be created'
                  : 'Create a shareable Clientspace copy'}
          </h2>
          <p>
            {copyStatus === 'ready'
              ? 'The client report above was already generated. This separate copy lets you check how it will appear in Clientspace before handoff.'
              : copyStatus === 'creating'
                ? remoteJob?.progressDetail ||
                  'The client report above is ready. Studio is creating a separate Clientspace copy for sharing.'
                : copyStatus === 'failed'
                  ? 'The client report above is still ready and unaffected. Retry only if you need a shareable Clientspace copy.'
                  : 'The client report above is already generated and ready. Create this separate copy only when you want to prepare it for Clientspace sharing.'}
          </p>
          {copyStatus === 'failed' ? (
            <p className={styles.error} role="alert">
              {remoteJob?.errorSummary || 'The Clientspace copy stopped before it was ready.'}
            </p>
          ) : null}
        </div>
        {ready && remoteJob?.previewUrl ? (
          <ButtonLink href={remoteJob.previewUrl} rel="noreferrer" target="_blank">
            Open shareable copy <ExternalLink aria-hidden="true" size={16} />
          </ButtonLink>
        ) : (
          <Button
            disabled={!reportPreviewWorkerAvailable || active}
            onClick={() => void onRequestRemotePreview(current.id)}
          >
            {active ? <LoaderCircle aria-hidden="true" className={styles.spin} size={16} /> : null}
            {active
              ? 'Creating shareable copy…'
              : copyStatus === 'failed'
                ? 'Retry shareable copy'
                : 'Create shareable copy'}
          </Button>
        )}
        {!reportPreviewWorkerAvailable && !ready ? (
          <small>
            Clientspace copy creation is currently unavailable. The generated client report above
            remains ready to review.
          </small>
        ) : null}
      </section>
    </div>
  );
}
