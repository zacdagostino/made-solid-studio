import { describe, expect, it } from 'vitest';
import type { Audit, DecisionReport } from '../lib/domain';
import { frozenReportView, previewReportIsCurrent } from './ClientReportPreview';

const report = (overrides: Partial<DecisionReport> = {}): DecisionReport => ({
  id: 'report-1',
  businessId: 'business-1',
  auditId: 'audit-1',
  crawlRunId: 'crawl-1',
  status: 'approved',
  version: 2,
  summary: 'Frozen summary',
  data: {
    title: 'Client website report',
    summary: 'Frozen client summary',
    findings: Array.from({ length: 10 }, (_, index) => ({
      id: `finding-${index}`,
      area: 'UX',
      severity: index === 0 ? 'high' : 'medium',
      title: `Finding ${index}`,
      observation: 'Observed problem',
      impact: 'Visitor impact',
      recommendation: 'Recommended improvement',
      evidence: { artifactId: `artifact-${index}`, viewport: { width: 375, height: 812 } },
    })),
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

  it('renders frozen wording and defensively limits the client shortlist to eight', () => {
    const view = frozenReportView(report());
    expect(view.title).toBe('Client website report');
    expect(view.summary).toBe('Frozen client summary');
    expect(view.findings).toHaveLength(8);
    expect(view.findings[0]).toMatchObject({
      evidenceArtifactId: 'artifact-0',
      viewport: '375 × 812',
    });
  });
});
