import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  Audit,
  AuditObservation,
  ResearchArtifact,
  SourceReleaseAttestation,
} from '../lib/domain';
import type { AuditReportSpecialistTask } from './AuditReportPanel';
import { AutomatedReportPanel, reportComparisonEvidenceReadiness } from './AutomatedReportPanel';

const audit: Audit = {
  id: 'audit-1',
  businessId: 'business-1',
  crawlRunId: 'capture-1',
  status: 'ready',
  findings: [],
  totalItems: 6,
  completedItems: 6,
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const observation: AuditObservation = {
  id: 'observation-1',
  businessId: 'business-1',
  auditId: audit.id,
  specialistTaskId: 'specialist-1',
  crawlRunId: 'capture-1',
  specialistKind: 'responsive_ui',
  area: 'Mobile',
  findingClass: 'observed_defect',
  severity: 'high',
  title: 'Sticky actions cover the footer',
  observation: 'The persistent action bar covers footer content.',
  customerImpact: 'Footer links cannot be read or selected reliably.',
  recommendation: 'Reserve space for persistent actions.',
  sourceUrls: ['https://example.com/contact'],
  evidenceFactIds: [],
  evidenceArtifactIds: ['original-1'],
  measurement: {},
  confidence: 'high',
  reviewState: 'needs_review',
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const release: SourceReleaseAttestation = {
  id: 'release-1',
  attestationId: 'a'.repeat(64),
  businessId: 'business-1',
  sourceBuilderRunId: 'builder-1',
  sourceManifestId: 'manifest-1',
  sourceRepositoryUrl: 'https://github.com/example/site',
  sourceCommit: 'b'.repeat(40),
  sourceTree: 'c'.repeat(40),
  sourceBranch: 'main',
  sourceEditVersion: 3,
  verificationProfile: 'made-solid-edited-site-release-v1',
  verifiedAt: '2026-09-02T00:00:00.000Z',
  checks: ['source', 'layout', 'navigation', 'accessibility'].map((id) => ({
    id,
    label: id,
    detail: 'Passed.',
    status: 'passed' as const,
  })),
  sourceBuilderStatus: 'ready',
  createdAt: '2026-09-02T00:00:00.000Z',
};

const original: ResearchArtifact = {
  id: 'original-1',
  businessId: 'business-1',
  crawlRunId: 'capture-1',
  kind: 'screenshot',
  storageBucket: 'private',
  storagePath: 'original.png',
  metadata: {
    captureContract: 'real-device-responsive-audit-v1',
    evidenceKind: 'scroll-bottom',
    scrollState: { scrollProgress: 1 },
    viewportIntegrity: { status: 'passed' },
  },
  createdAt: '2026-09-02T00:00:00.000Z',
};

const comparison: ResearchArtifact = {
  id: 'comparison-1',
  businessId: 'business-1',
  crawlRunId: 'capture-1',
  kind: 'screenshot',
  storageBucket: 'private',
  storagePath: 'comparison.png',
  metadata: {
    captureContract: 'verified-comparison-page-ready-v1',
    captureStatus: 'passed',
    evidenceKind: 'edited-site-comparison',
    horizontalOverflowPx: 0,
    loaderVisible: false,
    originalArtifactId: original.id,
    originalEvidenceKind: 'scroll-bottom',
    pageReady: true,
    releaseAttestationId: release.id,
    scrollState: { scrollProgress: 1 },
  },
  createdAt: '2026-09-02T00:00:00.000Z',
};

const tasks: AuditReportSpecialistTask[] = [
  'responsive_ui',
  'accessibility',
  'performance_engineering',
  'technical_seo',
  'conversion_journey',
  'platform_integrations',
].map((specialistKind, index) => ({
  id: `task-${index}`,
  auditId: audit.id,
  crawlRunId: 'capture-1',
  specialistKind: specialistKind as AuditReportSpecialistTask['specialistKind'],
  status: 'ready',
  totalItems: 1,
  completedItems: 1,
}));

describe('AutomatedReportPanel comparison readiness', () => {
  it('does not claim generation is active when current observations lack trusted comparisons', () => {
    const markup = renderToStaticMarkup(
      createElement(AutomatedReportPanel, {
        activeCaptureRunId: 'capture-1',
        artifacts: [],
        audit,
        clientName: 'Client',
        generationWorkerAvailable: true,
        observations: [observation],
        onPrepareReport: () => undefined,
        onRetryAudit: () => undefined,
        releaseAttestation: release,
        tasks,
      }),
    );

    expect(markup).toContain('Fresh comparison evidence required');
    expect(markup).toContain('The new report has not started');
    expect(markup).toContain('No report job is running');
    expect(markup).toContain('Run fresh responsive audit');
    expect(markup).not.toContain('Generating automatically');
  });

  it('requires the trusted original and exact position-matched redesign screenshot', () => {
    expect(
      reportComparisonEvidenceReadiness({
        activeCaptureRunId: 'capture-1',
        artifacts: [original],
        audit,
        observations: [observation],
        releaseAttestation: release,
      }),
    ).toEqual({ matchedCandidateCount: 0, trustedOriginalCount: 1 });

    expect(
      reportComparisonEvidenceReadiness({
        activeCaptureRunId: 'capture-1',
        artifacts: [original, comparison],
        audit,
        observations: [observation],
        releaseAttestation: release,
      }),
    ).toEqual({ matchedCandidateCount: 1, trustedOriginalCount: 1 });
  });
});
