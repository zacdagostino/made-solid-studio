import type { DecisionReport } from './domain';

export const prospectValueReportSchemaVersion = 10;
export const prospectValueReportKind = 'verified_redesign_value';

export type ProspectValueReportTheme = {
  id: string;
  area: string;
  title: string;
  before: string;
  redesignResponse: string;
  value: string;
  occurrenceCount: number;
  sourceUrls: string[];
  evidenceArtifactId?: string;
  afterEvidenceArtifactId: string;
  evidenceCaption?: string;
  viewport?: string;
  viewportHeight: number;
  viewportWidth: number;
  whatToNotice?: string;
  designPriority: string;
  whatChanged: string;
  whyBetter: string;
  comparisonProof: string;
  originalOverflowPx: number;
  redesignedOverflowPx: number;
  hasEditedSiteProof: boolean;
};

export type ProspectValueReportStrength = {
  id: string;
  title: string;
  detail: string;
};

export type ProspectValueReportFinding = {
  id: string;
  area: string;
  title: string;
  originalProblem: string;
  visitorImpact: string;
  whyItMatters: string;
  evidenceArtifactId: string;
  viewportHeight: number;
  viewportWidth: number;
};

export type ProspectValueReportDecision = {
  id: string;
  title: string;
  detail: string;
};

export type ProspectValueReportTechnology = {
  id: string;
  title: string;
  detail: string;
};

export type ProspectValueReportProof = {
  id: string;
  label: string;
  detail: string;
  status: 'passed';
};

export type ProspectValueReportView = {
  title: string;
  summary: string;
  transformationStatement: string;
  strengths: ProspectValueReportStrength[];
  majorFindings: ProspectValueReportFinding[];
  themes: ProspectValueReportTheme[];
  designDecisions: ProspectValueReportDecision[];
  technologyFoundation: ProspectValueReportTechnology[];
  deliveredWork: ProspectValueReportProof[];
  nextStep: string;
  methodology: string[];
  limitations: string[];
  redesign: {
    attestationId: string;
    sourceBuilderRunId: string;
    sourceManifestId: string;
    sourceCommit: string;
    sourceEditVersion: number;
    verifiedAt: string;
    verificationProfile: string;
  };
};

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

export function reportUsesProspectValueContract(report?: DecisionReport) {
  if (!report || report.schemaVersion !== prospectValueReportSchemaVersion) return false;
  const data = record(report.data);
  const redesign = record(data.redesign);
  const themes = Array.isArray(data.valueThemes) ? data.valueThemes : [];
  const majorFindings = Array.isArray(data.majorFindings) ? data.majorFindings : [];
  const designDecisions = Array.isArray(data.designDecisions) ? data.designDecisions : [];
  const technology = record(data.technologyFoundation);
  const technologyItems = Array.isArray(technology.items) ? technology.items.map(record) : [];
  const deliveredWork = Array.isArray(data.deliveredWork) ? data.deliveredWork : [];
  const themesHaveOldSiteEvidence = themes.every((raw) => {
    const theme = record(raw);
    const evidence = record(theme.evidence);
    const viewport = record(evidence.viewport);
    const afterEvidence = record(theme.afterEvidence);
    const afterViewport = record(afterEvidence.viewport);
    const comparison = record(theme.comparison);
    const verification = record(afterEvidence.verification);
    return Boolean(
      text(evidence.artifactId) &&
      text(evidence.sourceUrl) &&
      number(viewport.width) > 0 &&
      number(viewport.height) > 0 &&
      text(theme.whatToNotice) &&
      text(theme.designPriority) &&
      text(theme.businessOpportunity || theme.value) &&
      text(afterEvidence.artifactId) &&
      text(afterEvidence.sourceUrl) === text(evidence.sourceUrl) &&
      number(afterViewport.width) === number(viewport.width) &&
      number(afterViewport.height) === number(viewport.height) &&
      text(comparison.whatChanged) &&
      text(comparison.whyBetter) &&
      verification.status === 'passed' &&
      verification.captureContract === 'verified-comparison-page-ready-v1' &&
      verification.pageReady === true &&
      verification.loaderVisible === false &&
      verification.sameViewport === true &&
      number(verification.redesignedHorizontalOverflowPx) <= 1,
    );
  });
  return Boolean(
    data.reportKind === prospectValueReportKind &&
    data.generatorRevision === 'gpt-5.6-sol-design-showcase-v2' &&
    redesign.status === 'passed' &&
    text(redesign.attestationId) &&
    text(redesign.sourceBuilderRunId) &&
    text(redesign.sourceManifestId) &&
    /^[a-f0-9]{40}$/.test(text(redesign.sourceCommit)) &&
    number(redesign.sourceEditVersion) > 0 &&
    text(redesign.verifiedAt) &&
    themes.length > 0 &&
    themes.length <= 4 &&
    themesHaveOldSiteEvidence &&
    majorFindings.length > 0 &&
    majorFindings.length <= 6 &&
    majorFindings.every((raw) => {
      const finding = record(raw);
      const evidence = record(finding.evidence);
      const viewport = record(evidence.viewport);
      return Boolean(
        text(finding.title) &&
        text(finding.originalProblem) &&
        text(finding.visitorImpact) &&
        text(finding.whyItMatters) &&
        text(evidence.artifactId) &&
        number(viewport.width) > 0 &&
        number(viewport.height) > 0,
      );
    }) &&
    designDecisions.length > 0 &&
    designDecisions.length <= 5 &&
    technology.evidenceStatus === 'verified' &&
    technologyItems.some((item) => item.id === 'nextjs') &&
    technologyItems.some((item) => item.id === 'typescript') &&
    deliveredWork.length > 0 &&
    deliveredWork.every((raw) => record(raw).status === 'passed'),
  );
}

export function prospectValueReportView(
  report: DecisionReport,
): ProspectValueReportView | undefined {
  if (!reportUsesProspectValueContract(report)) return undefined;
  const data = record(report.data);
  const redesign = record(data.redesign);
  const strengths = Array.isArray(data.strengths)
    ? data.strengths
        .map((raw, index) => {
          const item = record(raw);
          const title = text(item.title);
          const detail = text(item.detail);
          return title && detail
            ? { id: text(item.id) || `strength-${index + 1}`, title, detail }
            : undefined;
        })
        .filter((item): item is ProspectValueReportStrength => Boolean(item))
    : [];
  const themes: ProspectValueReportTheme[] = (data.valueThemes as unknown[]).flatMap(
    (raw, index) => {
      const item = record(raw);
      const evidence = record(item.evidence);
      const viewport = record(evidence.viewport);
      const width = number(viewport.width);
      const height = number(viewport.height);
      const title = text(item.title);
      const before = text(item.before || item.observation);
      const editedSiteProof = record(item.editedSiteProof);
      const afterEvidence = record(item.afterEvidence);
      const comparison = record(item.comparison);
      const verification = record(afterEvidence.verification);
      const businessOpportunity = text(item.businessOpportunity || item.value);
      if (!title || !before || !businessOpportunity || !text(evidence.artifactId)) return [];
      return [
        {
          id: text(item.id) || `theme-${index + 1}`,
          area: text(item.area) || 'Website experience',
          title,
          before,
          // The client report does not turn an audit recommendation into a delivered-work claim. The UI
          // may show a redesign outcome only when exact edited-site proof is frozen with the theme.
          redesignResponse: text(editedSiteProof.clientOutcome),
          value: businessOpportunity,
          occurrenceCount: Math.max(1, number(item.occurrenceCount)),
          sourceUrls: textList(item.sourceUrls),
          evidenceArtifactId: text(evidence.artifactId) || undefined,
          afterEvidenceArtifactId: text(afterEvidence.artifactId),
          evidenceCaption: text(evidence.caption) || undefined,
          viewport: width && height ? `${width} × ${height}` : undefined,
          viewportHeight: height,
          viewportWidth: width,
          whatToNotice: text(item.whatToNotice) || text(evidence.caption) || undefined,
          designPriority: text(item.designPriority),
          whatChanged: text(comparison.whatChanged),
          whyBetter: text(comparison.whyBetter),
          comparisonProof:
            text(comparison.verificationSummary) ||
            `Both screenshots were captured at ${width} × ${height}.`,
          originalOverflowPx: Math.max(0, number(verification.originalHorizontalOverflowPx)),
          redesignedOverflowPx: Math.max(0, number(verification.redesignedHorizontalOverflowPx)),
          hasEditedSiteProof: Boolean(
            text(editedSiteProof.artifactId) && text(editedSiteProof.clientOutcome),
          ),
        } satisfies ProspectValueReportTheme,
      ];
    },
  );
  const majorFindings: ProspectValueReportFinding[] = (data.majorFindings as unknown[]).flatMap(
    (raw, index) => {
      const item = record(raw);
      const evidence = record(item.evidence);
      const viewport = record(evidence.viewport);
      const title = text(item.title);
      const artifactId = text(evidence.artifactId);
      if (!title || !artifactId) return [];
      return [
        {
          id: text(item.id) || `finding-${index + 1}`,
          area: text(item.area) || 'Original website experience',
          title,
          originalProblem: text(item.originalProblem),
          visitorImpact: text(item.visitorImpact),
          whyItMatters: text(item.whyItMatters),
          evidenceArtifactId: artifactId,
          viewportWidth: number(viewport.width),
          viewportHeight: number(viewport.height),
        },
      ];
    },
  );
  const designDecisions: ProspectValueReportDecision[] = (data.designDecisions as unknown[])
    .map((raw, index) => {
      const item = record(raw);
      const title = text(item.title);
      const detail = text(item.detail);
      return title && detail
        ? { id: text(item.id) || `decision-${index + 1}`, title, detail }
        : undefined;
    })
    .filter((item): item is ProspectValueReportDecision => Boolean(item));
  const technology = record(data.technologyFoundation);
  const technologyFoundation: ProspectValueReportTechnology[] = [
    ...(Array.isArray(technology.items) ? technology.items : []),
    technology.responsiveVerification,
  ]
    .map((raw, index) => {
      const item = record(raw);
      const title = text(item.title);
      const detail = text(item.detail);
      return title && detail
        ? { id: text(item.id) || `technology-${index + 1}`, title, detail }
        : undefined;
    })
    .filter((item): item is ProspectValueReportTechnology => Boolean(item));
  const deliveredWork = (data.deliveredWork as unknown[])
    .map((raw, index) => {
      const item = record(raw);
      const label = text(item.label);
      const detail = text(item.detail);
      return label && detail && item.status === 'passed'
        ? {
            id: text(item.id) || `proof-${index + 1}`,
            label,
            detail,
            status: 'passed' as const,
          }
        : undefined;
    })
    .filter((item): item is ProspectValueReportProof => Boolean(item));
  return {
    title: text(data.title) || 'A stronger digital foundation',
    summary: text(data.summary) || report.summary,
    transformationStatement: text(data.transformationStatement),
    strengths,
    majorFindings,
    themes,
    designDecisions,
    technologyFoundation,
    deliveredWork,
    nextStep: text(data.nextStep) || 'Review the completed website and choose the right next step.',
    methodology: textList(data.methodology),
    limitations: textList(data.limitations),
    redesign: {
      attestationId: text(redesign.attestationId),
      sourceBuilderRunId: text(redesign.sourceBuilderRunId),
      sourceManifestId: text(redesign.sourceManifestId),
      sourceCommit: text(redesign.sourceCommit),
      sourceEditVersion: number(redesign.sourceEditVersion),
      verifiedAt: text(redesign.verifiedAt),
      verificationProfile: text(redesign.verificationProfile),
    },
  };
}
