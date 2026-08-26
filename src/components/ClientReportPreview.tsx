import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  Audit,
  DecisionReport,
  ReportPreviewJob,
  SourceReleaseAttestation,
} from '../lib/domain';
import {
  prospectValueReportView,
  reportUsesProspectValueContract,
} from '../lib/prospect-value-report';
import { Button, ButtonGroup, ButtonLink, StatusBadge } from './ui';
import styles from './ClientReportPreview.module.css';

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

export function ClientReportPreview({
  activeCaptureRunId,
  audit,
  clientName,
  evidenceUrls,
  latestReleaseAttestation,
  onRequestRemotePreview,
  remoteJob,
  report,
  reportPreviewWorkerAvailable,
}: {
  activeCaptureRunId?: string;
  audit?: Audit;
  clientName: string;
  evidenceUrls: Record<string, string>;
  latestReleaseAttestation?: SourceReleaseAttestation;
  onRequestRemotePreview: (reportVersionId: string) => Promise<void>;
  remoteJob?: ReportPreviewJob;
  report?: DecisionReport;
  reportPreviewWorkerAvailable: boolean;
}) {
  const current = previewReportIsCurrent(report, audit, activeCaptureRunId) ? report : undefined;
  const view = current ? prospectValueReportView(current) : undefined;
  const active = remoteJob?.status === 'queued' || remoteJob?.status === 'running';
  const ready = Boolean(
    remoteJob?.status === 'ready' &&
    remoteJob.previewUrl &&
    remoteJob.previewExpiresAt &&
    new Date(remoteJob.previewExpiresAt).valueOf() > Date.now(),
  );
  const websiteChangedSinceReport = Boolean(
    current &&
    view &&
    latestReleaseAttestation &&
    (view.redesign.attestationId !== latestReleaseAttestation.attestationId ||
      view.redesign.sourceCommit !== latestReleaseAttestation.sourceCommit),
  );

  if (report && !reportUsesProspectValueContract(report)) {
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

      <article className={styles.report}>
        <header className={styles.hero}>
          <p>Made Solid · Website value report</p>
          <h1>{view.title}</h1>
          <p className={styles.lede}>{view.summary}</p>
          <div className={styles.reportMeta}>
            <span>Prepared for {clientName}</span>
            <span>Verified redesign · Edit v{view.redesign.sourceEditVersion}</span>
            <span>Report version {current.version}</span>
          </div>
        </header>

        <section className={styles.intro} aria-labelledby="foundation-title">
          <div>
            <p className={styles.kicker}>The outcome</p>
            <h2 id="foundation-title">A stronger digital foundation is ready</h2>
          </div>
          <p>
            This is not a list of hypothetical fixes. It connects supported evidence from the
            original website to the completed, release-verified redesign prepared for {clientName}.
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
            <p className={styles.kicker}>The value of the redesign</p>
            <h2 id="themes-title">Where the old experience lost clarity—and what changed</h2>
            <p>
              Repeated technical cases are combined into a small number of visitor-focused themes.
            </p>
          </div>
          <div className={styles.findings}>
            {view.themes.map((theme, index) => (
              <article className={styles.finding} key={theme.id}>
                <header>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p>{theme.area}</p>
                    <h3>{theme.title}</h3>
                  </div>
                  <StatusBadge tone="neutral">
                    {theme.occurrenceCount === 1
                      ? '1 supported case'
                      : `${theme.occurrenceCount} supported cases`}
                  </StatusBadge>
                </header>
                {theme.evidenceArtifactId && evidenceUrls[theme.evidenceArtifactId] ? (
                  <figure>
                    <img
                      alt={`Original website evidence for ${theme.title}`}
                      src={evidenceUrls[theme.evidenceArtifactId]}
                    />
                    <figcaption>
                      {theme.evidenceCaption || 'Original website evidence'}
                      {theme.viewport ? ` · ${theme.viewport}` : ''}
                    </figcaption>
                  </figure>
                ) : null}
                <div className={styles.findingCopy}>
                  <div>
                    <h4>Before: the visitor experience</h4>
                    <p>{theme.before}</p>
                  </div>
                  <div className={styles.recommendation}>
                    <h4>What the redesign changes</h4>
                    <p>{theme.redesignResponse}</p>
                  </div>
                  <div>
                    <h4>The value this creates</h4>
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
            <h2 id="proof-title">Confidence in the website you are reviewing</h2>
            <p>
              These checks belong to edit v{view.redesign.sourceEditVersion}, commit{' '}
              <code>{view.redesign.sourceCommit.slice(0, 8)}</code>—not the earlier generated
              baseline.
            </p>
          </div>
          <ul>
            {view.deliveredWork.map((proof) => (
              <li key={proof.id}>
                <Check aria-hidden="true" size={18} />
                <span>
                  <strong>{proof.label}</strong>
                  {proof.detail}
                </span>
              </li>
            ))}
          </ul>
          <details>
            <summary>Verification record</summary>
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
          </details>
        </section>

        <footer className={styles.footer}>
          <div>
            <p className={styles.kicker}>Next step</p>
            <h2>{view.nextStep}</h2>
          </div>
          <ShieldCheck aria-hidden="true" size={32} />
          <details>
            <summary>How this report was prepared</summary>
            <ul>
              {view.methodology.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {view.limitations.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </details>
        </footer>
      </article>

      <section aria-labelledby="clientspace-preview-title" className={styles.remotePreview}>
        <div>
          <p className={styles.kicker}>Exact Clientspace renderer</p>
          <h2 id="clientspace-preview-title">
            {ready ? 'Clientspace preview ready' : 'Prepare the final renderer when available'}
          </h2>
          <p>
            {ready
              ? 'Open the same private page Clientspace will render. This still does not hand anything off.'
              : remoteJob?.progressDetail ||
                'The same frozen report can also be copied to the protected Clientspace preview renderer.'}
          </p>
          {remoteJob?.status === 'failed' ? (
            <p className={styles.error} role="alert">
              {remoteJob.errorSummary || 'The Clientspace preview stopped.'}
            </p>
          ) : null}
        </div>
        {ready && remoteJob?.previewUrl ? (
          <ButtonLink href={remoteJob.previewUrl} rel="noreferrer" target="_blank">
            Open Clientspace preview <ExternalLink aria-hidden="true" size={16} />
          </ButtonLink>
        ) : (
          <Button
            disabled={!reportPreviewWorkerAvailable || active}
            onClick={() => void onRequestRemotePreview(current.id)}
          >
            {active ? <LoaderCircle aria-hidden="true" className={styles.spin} size={16} /> : null}
            {active ? 'Preparing preview…' : 'Prepare Clientspace preview'}
          </Button>
        )}
        {!reportPreviewWorkerAvailable && !ready ? (
          <small>
            The protected renderer worker is currently offline. This Studio preview remains
            available.
          </small>
        ) : null}
      </section>
    </div>
  );
}
