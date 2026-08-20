import { ArrowLeft, ArrowRight, ExternalLink, LoaderCircle, LockKeyhole } from 'lucide-react';
import type { Audit, DecisionReport, ReportPreviewJob } from '../lib/domain';
import { Button, ButtonGroup, ButtonLink, StatusBadge } from './ui';
import styles from './ClientReportPreview.module.css';

type ReportFinding = {
  id: string;
  area: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  observation: string;
  impact: string;
  recommendation: string;
  sourceUrls: string[];
  evidenceArtifactId?: string;
  evidenceCaption?: string;
  viewport?: string;
};

type ActionStage = { id: string; label: string; items: string[] };

export type FrozenReportView = {
  title: string;
  summary: string;
  findings: ReportFinding[];
  actionPlan: ActionStage[];
  methodology: string[];
  limitations: string[];
  nextStep: string;
  platform?: { name: string; summary: string; tradeoffs: string[]; recommendation: string };
};

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

export function frozenReportView(report: DecisionReport): FrozenReportView {
  const data = record(report.data);
  const findings = Array.isArray(data.findings)
    ? data.findings.slice(0, 8).map((raw, index) => {
        const finding = record(raw);
        const evidence = record(finding.evidence);
        const viewport = record(evidence.viewport);
        const severity = text(finding.severity || finding.priority);
        const width = typeof viewport.width === 'number' ? viewport.width : undefined;
        const height = typeof viewport.height === 'number' ? viewport.height : undefined;
        return {
          id: text(finding.id) || `finding-${index + 1}`,
          area: text(finding.area) || 'Website experience',
          severity: severity === 'low' || severity === 'medium' ? severity : 'high',
          title: text(finding.title) || 'Website experience opportunity',
          observation: text(finding.observation || finding.finding),
          impact: text(finding.impact || finding.customerImpact),
          recommendation: text(finding.recommendation),
          sourceUrls: textList(finding.sourceUrls),
          evidenceArtifactId: text(evidence.artifactId) || undefined,
          evidenceCaption: text(evidence.caption) || undefined,
          viewport: width && height ? `${width} × ${height}` : undefined,
        } satisfies ReportFinding;
      })
    : [];
  const actionPlan = Array.isArray(data.actionPlan)
    ? data.actionPlan.map((raw, index) => {
        const stage = record(raw);
        return {
          id: text(stage.id) || `stage-${index + 1}`,
          label: text(stage.label) || `Stage ${index + 1}`,
          items: textList(stage.items),
        };
      })
    : [];
  const platform = record(data.platform);
  return {
    title: text(data.title) || 'Website experience report',
    summary: text(data.summary) || report.summary,
    findings,
    actionPlan,
    methodology: textList(data.methodology),
    limitations: textList(data.limitations),
    nextStep: text(data.nextStep),
    platform: Object.keys(platform).length
      ? {
          name: text(platform.name) || 'Current website platform',
          summary: text(platform.summary),
          tradeoffs: textList(platform.tradeoffs),
          recommendation: text(platform.recommendation),
        }
      : undefined,
  };
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

export function ClientReportPreview({
  activeCaptureRunId,
  audit,
  clientName,
  evidenceUrls,
  onRequestRemotePreview,
  remoteJob,
  report,
  reportPreviewWorkerAvailable,
}: {
  activeCaptureRunId?: string;
  audit?: Audit;
  clientName: string;
  evidenceUrls: Record<string, string>;
  onRequestRemotePreview: (reportVersionId: string) => Promise<void>;
  remoteJob?: ReportPreviewJob;
  report?: DecisionReport;
  reportPreviewWorkerAvailable: boolean;
}) {
  const current = previewReportIsCurrent(report, audit, activeCaptureRunId) ? report : undefined;
  const view = current ? frozenReportView(current) : undefined;
  const active = remoteJob?.status === 'queued' || remoteJob?.status === 'running';
  const ready = Boolean(
    remoteJob?.status === 'ready' &&
    remoteJob.previewUrl &&
    remoteJob.previewExpiresAt &&
    new Date(remoteJob.previewExpiresAt).valueOf() > Date.now(),
  );

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
          <p>Made Solid · Website experience review</p>
          <h1>{view.title}</h1>
          <p className={styles.lede}>{view.summary}</p>
          <div className={styles.reportMeta}>
            <span>Prepared for {clientName}</span>
            <span>Reviewed report · Version {current.version}</span>
          </div>
        </header>

        <section className={styles.intro} aria-labelledby="findings-title">
          <div>
            <p className={styles.kicker}>The clearest opportunities</p>
            <h2 id="findings-title">What currently makes the website harder to use</h2>
          </div>
          <p>
            These are the reviewed themes frozen into this report—not every technical test result.
            They focus on what a visitor can understand, navigate and act on.
          </p>
        </section>

        <div className={styles.findings}>
          {view.findings.map((finding, index) => (
            <section className={styles.finding} key={finding.id}>
              <header>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <p>{finding.area}</p>
                  <h3>{finding.title}</h3>
                </div>
                <StatusBadge
                  tone={
                    finding.severity === 'high'
                      ? 'danger'
                      : finding.severity === 'medium'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {finding.severity === 'high'
                    ? 'Fix first'
                    : finding.severity === 'medium'
                      ? 'Improve next'
                      : 'Future opportunity'}
                </StatusBadge>
              </header>
              {finding.evidenceArtifactId && evidenceUrls[finding.evidenceArtifactId] ? (
                <figure>
                  <img
                    alt={`Current website evidence for ${finding.title}`}
                    src={evidenceUrls[finding.evidenceArtifactId]}
                  />
                  <figcaption>
                    {finding.evidenceCaption || 'Current website screenshot'}
                    {finding.viewport ? ` · ${finding.viewport}` : ''}
                  </figcaption>
                </figure>
              ) : null}
              <div className={styles.findingCopy}>
                <div>
                  <h4>What we observed</h4>
                  <p>{finding.observation}</p>
                </div>
                <div>
                  <h4>Why it matters</h4>
                  <p>{finding.impact}</p>
                </div>
                <div className={styles.recommendation}>
                  <h4>A clearer approach</h4>
                  <p>{finding.recommendation}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {view.actionPlan.length ? (
          <section className={styles.actionPlan} aria-labelledby="action-plan-title">
            <p className={styles.kicker}>A practical order of work</p>
            <h2 id="action-plan-title">Where to begin</h2>
            <div>
              {view.actionPlan.map((stage) => (
                <section key={stage.id}>
                  <h3>{stage.label}</h3>
                  <ul>
                    {stage.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        {view.platform ? (
          <section className={styles.platform} aria-labelledby="platform-title">
            <p className={styles.kicker}>Platform context</p>
            <h2 id="platform-title">{view.platform.name}</h2>
            <p>{view.platform.summary}</p>
            {view.platform.tradeoffs.length ? (
              <ul>
                {view.platform.tradeoffs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {view.platform.recommendation ? (
              <p>
                <strong>Recommendation:</strong> {view.platform.recommendation}
              </p>
            ) : null}
          </section>
        ) : null}

        <footer className={styles.footer}>
          <div>
            <p className={styles.kicker}>Next step</p>
            <h2>
              {view.nextStep ||
                'Talk through the improvements that best fit the business and its customers.'}
            </h2>
          </div>
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
