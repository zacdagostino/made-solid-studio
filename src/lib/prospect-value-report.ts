import type { DecisionReport } from './domain';

export const prospectValueReportSchemaVersion = 5;
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
  evidenceCaption?: string;
  viewport?: string;
};

export type ProspectValueReportStrength = {
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
  strengths: ProspectValueReportStrength[];
  themes: ProspectValueReportTheme[];
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
  const deliveredWork = Array.isArray(data.deliveredWork) ? data.deliveredWork : [];
  return Boolean(
    data.reportKind === prospectValueReportKind &&
    redesign.status === 'passed' &&
    text(redesign.attestationId) &&
    text(redesign.sourceBuilderRunId) &&
    text(redesign.sourceManifestId) &&
    /^[a-f0-9]{40}$/.test(text(redesign.sourceCommit)) &&
    number(redesign.sourceEditVersion) > 0 &&
    text(redesign.verifiedAt) &&
    themes.length > 0 &&
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
      const redesignResponse = text(item.redesignResponse || item.recommendation);
      const value = text(item.value || item.customerImpact);
      if (!title || !before || !redesignResponse || !value) return [];
      return [
        {
          id: text(item.id) || `theme-${index + 1}`,
          area: text(item.area) || 'Website experience',
          title,
          before,
          redesignResponse,
          value,
          occurrenceCount: Math.max(1, number(item.occurrenceCount)),
          sourceUrls: textList(item.sourceUrls),
          evidenceArtifactId: text(evidence.artifactId) || undefined,
          evidenceCaption: text(evidence.caption) || undefined,
          viewport: width && height ? `${width} × ${height}` : undefined,
        } satisfies ProspectValueReportTheme,
      ];
    },
  );
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
    strengths,
    themes,
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
