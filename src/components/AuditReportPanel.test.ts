import { describe, expect, it } from 'vitest';
import type { Audit, AuditFinding } from '../lib/domain';
import {
  auditBelongsToActiveRun,
  currentRunEvidence,
  evidenceForFinding,
  findingFromObservation,
  groupAuditFindings,
  reportBelongsToCurrentAudit,
  summariseReportReview,
  type AuditReportEvidence,
} from './AuditReportPanel';

const finding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  id: 'finding-1',
  area: 'UI',
  severity: 'high',
  title: 'Navigation clips on mobile',
  finding: 'The final navigation action extends beyond the visible screen.',
  recommendation: 'Allow the navigation to reflow into a mobile disclosure.',
  evidenceIds: ['evidence-current'],
  sourceUrls: ['https://example.com/'],
  reviewState: 'needs_review',
  ...overrides,
});

const audit = (crawlRunId?: string): Audit => ({
  id: 'audit-1',
  businessId: 'business-1',
  crawlRunId,
  status: 'ready',
  findings: [finding()],
  totalItems: 1,
  completedItems: 1,
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
});

const evidence: AuditReportEvidence[] = [
  {
    id: 'evidence-current',
    crawlRunId: 'run-current',
    label: 'Mobile screenshot',
    sourceUrl: 'https://example.com/',
  },
  {
    id: 'evidence-old',
    crawlRunId: 'run-old',
    label: 'Old screenshot',
    sourceUrl: 'https://example.com/',
  },
];

describe('AuditReportPanel current-run safeguards', () => {
  it('accepts only an audit belonging to the active capture', () => {
    expect(auditBelongsToActiveRun('run-current', audit('run-current'))).toBe(true);
    expect(auditBelongsToActiveRun('run-current', audit('run-old'))).toBe(false);
    expect(auditBelongsToActiveRun(undefined, audit('run-current'))).toBe(false);
    expect(auditBelongsToActiveRun('run-current', audit())).toBe(false);
  });

  it('removes evidence from previous runs before matching findings', () => {
    const activeEvidence = currentRunEvidence('run-current', evidence);

    expect(activeEvidence.map((item) => item.id)).toEqual(['evidence-current']);
    expect(
      evidenceForFinding(
        finding({ evidenceIds: ['evidence-current', 'evidence-old'] }),
        activeEvidence,
      ),
    ).toEqual([evidence[0]]);
  });

  it('does not return evidence without an active run', () => {
    expect(currentRunEvidence(undefined, evidence)).toEqual([]);
  });

  it('shows only an approved report frozen from the current audit and capture', () => {
    const currentAudit = audit('run-current');
    const report = {
      id: 'report-1',
      businessId: 'business-1',
      auditId: currentAudit.id,
      crawlRunId: 'run-current',
      status: 'approved' as const,
      version: 1,
      summary: 'One approved finding frozen in this report.',
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    };

    expect(reportBelongsToCurrentAudit('run-current', currentAudit, report)).toBe(true);
    expect(
      reportBelongsToCurrentAudit('run-current', currentAudit, {
        ...report,
        crawlRunId: 'run-old',
      }),
    ).toBe(false);
    expect(
      reportBelongsToCurrentAudit('run-current', currentAudit, {
        ...report,
        status: 'draft',
      }),
    ).toBe(false);
  });
});

describe('AuditReportPanel review readiness', () => {
  it('groups repeated page-level cases into one client review theme', () => {
    const grouped = groupAuditFindings([
      finding({ id: 'mobile-home', sourceUrls: ['https://example.com/'] }),
      finding({
        id: 'mobile-contact',
        sourceUrls: ['https://example.com/contact'],
        evidenceIds: ['evidence-contact'],
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ occurrenceCount: 2, affectedPages: 2 });
    expect(grouped[0].finding.evidenceIds).toEqual(['evidence-current', 'evidence-contact']);
  });

  it('counts approved, pending, excluded, and unsupported approved findings', () => {
    const findings = [
      finding({ id: 'approved', reviewState: 'approved' }),
      finding({ id: 'pending', reviewState: 'needs_review' }),
      finding({ id: 'excluded', reviewState: 'blocked' }),
      finding({
        id: 'unsupported',
        evidenceIds: ['evidence-not-in-run'],
        reviewState: 'approved',
      }),
    ];

    expect(summariseReportReview(findings, currentRunEvidence('run-current', evidence))).toEqual({
      approved: 2,
      excluded: 1,
      needsReview: 1,
      approvedWithoutEvidence: 1,
      approvedLowConfidence: 0,
    });
  });

  it('keeps low-confidence approvals out of a publish-ready summary', () => {
    expect(
      summariseReportReview(
        [finding({ confidence: 'low', reviewState: 'approved' })],
        currentRunEvidence('run-current', evidence),
      ),
    ).toMatchObject({ approved: 1, approvedLowConfidence: 1 });
  });

  it('adapts specialist observations without dropping fact or artifact evidence', () => {
    expect(
      findingFromObservation({
        id: 'observation-1',
        businessId: 'business-1',
        auditId: 'audit-1',
        specialistTaskId: 'task-1',
        crawlRunId: 'run-current',
        specialistKind: 'responsive_ui',
        area: 'UI',
        findingClass: 'observed_defect',
        severity: 'high',
        title: 'Navigation clips on mobile',
        observation: 'The final navigation action extends beyond the visible screen.',
        customerImpact: 'A visitor may not see the enquiry route.',
        recommendation: 'Allow the navigation to reflow into a mobile disclosure.',
        sourceUrls: ['https://example.com/'],
        evidenceFactIds: ['fact-1'],
        evidenceArtifactIds: ['artifact-1'],
        viewport: { width: 375, height: 812, label: 'Mobile' },
        measurement: { overflowPixels: 24 },
        confidence: 'high',
        reviewState: 'needs_review',
        createdAt: '2026-08-18T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'observation-1',
      evidenceIds: ['fact-1', 'artifact-1'],
      customerImpact: 'A visitor may not see the enquiry route.',
      finding: 'The final navigation action extends beyond the visible screen.',
    });
  });
});
