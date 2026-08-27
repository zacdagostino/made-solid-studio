import { describe, expect, it } from 'vitest';
import type { Audit, DecisionReport } from '../lib/domain';
import {
  prospectValueReportView,
  reportUsesProspectValueContract,
} from '../lib/prospect-value-report';
import {
  clientReportContractState,
  clientReportThemes,
  clientspaceCopyStatus,
  previewReportIsCurrent,
} from './ClientReportPreview';

const report = (overrides: Partial<DecisionReport> = {}): DecisionReport => ({
  id: 'report-1',
  businessId: 'business-1',
  auditId: 'audit-1',
  crawlRunId: 'crawl-1',
  status: 'approved',
  version: 2,
  schemaVersion: 8,
  summary: 'Frozen summary',
  data: {
    schemaVersion: 8,
    generatorRevision: 'verified-ready-design-comparison-v2',
    reportKind: 'verified_redesign_value',
    title: 'A stronger digital foundation for Client',
    summary: 'Frozen client value summary',
    strengths: [{ id: 'identity', title: 'Established identity', detail: 'Approved identity.' }],
    valueThemes: [
      {
        id: 'theme-1',
        area: 'UX',
        title: 'A clearer journey',
        before: 'The original journey was unclear.',
        businessOpportunity: 'Visitors can find the right next action.',
        whatToNotice: 'The next action is difficult to find.',
        designPriority: 'Keep the next action visible and easy to understand.',
        occurrenceCount: 4,
        sourceUrls: ['https://example.com'],
        evidence: {
          artifactId: 'artifact-1',
          sourceUrl: 'https://example.com',
          viewport: { width: 375, height: 812 },
        },
        afterEvidence: {
          artifactId: 'after-artifact-1',
          sourceUrl: 'https://example.com',
          generatedRoute: '/',
          viewport: { width: 375, height: 812 },
          verification: {
            status: 'passed',
            captureContract: 'verified-comparison-page-ready-v1',
            pageReady: true,
            loaderVisible: false,
            sameViewport: true,
            originalHorizontalOverflowPx: 240,
            redesignedHorizontalOverflowPx: 0,
          },
        },
        comparison: {
          whatChanged: 'The redesigned page creates a clearer reading order.',
          whyBetter: 'Customers can understand the page more quickly.',
        },
        editedSiteProof: {
          artifactId: 'edited-artifact-1',
          clientOutcome: 'The edited website provides a direct path.',
        },
      },
    ],
    deliveredWork: [
      {
        id: 'responsive-layout',
        label: 'Responsive layouts checked',
        detail: 'Passed all routes.',
        status: 'passed',
      },
    ],
    redesign: {
      status: 'passed',
      attestationId: 'a'.repeat(64),
      sourceBuilderRunId: 'builder-1',
      sourceManifestId: 'manifest-1',
      sourceCommit: 'b'.repeat(40),
      sourceEditVersion: 3,
      verifiedAt: '2026-08-26T00:00:00.000Z',
      verificationProfile: 'made-solid-edited-site-release-v1',
    },
  },
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
  ...overrides,
});

const audit: Audit = {
  id: 'audit-1',
  businessId: 'business-1',
  crawlRunId: 'crawl-1',
  status: 'ready',
  findings: [],
  totalItems: 6,
  completedItems: 6,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

describe('ClientReportPreview frozen report boundary', () => {
  it('accepts only the approved report matching the current audit and capture', () => {
    expect(previewReportIsCurrent(report(), audit, 'crawl-1')).toBe(true);
    expect(previewReportIsCurrent(report({ crawlRunId: 'crawl-old' }), audit, 'crawl-1')).toBe(
      false,
    );
    expect(previewReportIsCurrent(report({ auditId: 'audit-old' }), audit, 'crawl-1')).toBe(false);
    expect(previewReportIsCurrent(report({ status: 'draft' }), audit, 'crawl-1')).toBe(false);
  });

  it('requires exact redesign lineage and renders the frozen value themes', () => {
    const view = prospectValueReportView(report());
    expect(reportUsesProspectValueContract(report())).toBe(true);
    expect(view?.title).toBe('A stronger digital foundation for Client');
    expect(view?.summary).toBe('Frozen client value summary');
    expect(view?.themes).toHaveLength(1);
    expect(view?.themes[0]).toMatchObject({
      evidenceArtifactId: 'artifact-1',
      afterEvidenceArtifactId: 'after-artifact-1',
      viewport: '375 × 812',
    });
    expect(reportUsesProspectValueContract(report({ schemaVersion: 4 }))).toBe(false);
    expect(clientReportContractState(report())).toBe('ready');
    expect(clientReportContractState(report({ schemaVersion: 4 }))).toBe('legacy');
    expect(clientReportContractState(report({ schemaVersion: 9 }))).toBe('studio_update_required');
    expect(
      clientReportContractState(
        report({
          data: { ...report().data, valueThemes: [] },
        }),
      ),
    ).toBe('invalid');
  });

  it('keeps the client story to three themes and prioritises themes with screenshots', () => {
    const themes = [
      { id: 'without-image' },
      { id: 'first-image', evidenceArtifactId: 'artifact-1' },
      { id: 'second-image', evidenceArtifactId: 'artifact-2' },
      { id: 'third-image', evidenceArtifactId: 'artifact-3' },
    ];

    expect(clientReportThemes(themes).map((theme) => theme.id)).toEqual([
      'first-image',
      'second-image',
      'third-image',
    ]);
  });

  it('keeps Clientspace copy preparation separate from client report readiness', () => {
    const baseJob = {
      id: 'preview-job-1',
      reportVersionId: 'report-1',
      businessId: 'business-1',
      status: 'queued' as const,
      progressPhase: 'queued',
      progressDetail: 'Waiting for the renderer.',
      totalItems: 1,
      completedItems: 0,
      createdAt: '2026-08-27T00:00:00.000Z',
      updatedAt: '2026-08-27T00:00:00.000Z',
    };

    expect(clientspaceCopyStatus(undefined)).toBe('idle');
    expect(clientspaceCopyStatus(baseJob)).toBe('creating');
    expect(clientspaceCopyStatus({ ...baseJob, status: 'failed' })).toBe('failed');
    expect(
      clientspaceCopyStatus(
        {
          ...baseJob,
          status: 'ready',
          previewUrl: 'https://clientspace.example/report',
          previewExpiresAt: '2026-08-27T01:00:00.000Z',
        },
        new Date('2026-08-27T00:30:00.000Z').valueOf(),
      ),
    ).toBe('ready');
    expect(
      clientspaceCopyStatus(
        {
          ...baseJob,
          status: 'ready',
          previewUrl: 'https://clientspace.example/report',
          previewExpiresAt: '2026-08-27T01:00:00.000Z',
        },
        new Date('2026-08-27T02:00:00.000Z').valueOf(),
      ),
    ).toBe('idle');
  });
});
