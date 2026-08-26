import { describe, expect, it } from 'vitest';
import type { Audit, DecisionReport } from '../lib/domain';
import {
  prospectValueReportView,
  reportUsesProspectValueContract,
} from '../lib/prospect-value-report';
import { previewReportIsCurrent } from './ClientReportPreview';

const report = (overrides: Partial<DecisionReport> = {}): DecisionReport => ({
  id: 'report-1',
  businessId: 'business-1',
  auditId: 'audit-1',
  crawlRunId: 'crawl-1',
  status: 'approved',
  version: 2,
  schemaVersion: 5,
  summary: 'Frozen summary',
  data: {
    schemaVersion: 5,
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
        redesignResponse: 'The edited website provides a direct path.',
        value: 'Visitors can find the right next action.',
        occurrenceCount: 4,
        sourceUrls: ['https://example.com'],
        evidence: { artifactId: 'artifact-1', viewport: { width: 375, height: 812 } },
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
      viewport: '375 × 812',
    });
    expect(reportUsesProspectValueContract(report({ schemaVersion: 4 }))).toBe(false);
  });
});
