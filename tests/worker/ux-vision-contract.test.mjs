import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseVisionAnalysis,
  normaliseVisionObservations,
  rankVisionCandidates,
  uxVisionResponseSchema,
} from '../../worker/ux-vision-contract.mjs';

const runId = 'run-current';
const auditId = 'audit-current';

function screenshot(overrides = {}) {
  return {
    id: 'shot-mobile',
    kind: 'screenshot',
    crawl_run_id: runId,
    metadata: {
      auditId,
      sourceUrl: 'https://example.com/',
      viewport: { label: 'mobile', width: 375, height: 812 },
      captureContract: 'real-device-responsive-audit-v1',
      viewportIntegrity: { status: 'passed', profileId: 'mobile-android-chrome-v1' },
    },
    ...overrides,
  };
}

function rawObservation(overrides = {}) {
  return {
    issueType: 'navigation_obstruction',
    area: 'Mobile',
    severity: 'high',
    title: 'Navigation dominates the first mobile screen',
    observation: 'The visible header and navigation occupy most of the initial mobile view.',
    customerImpact: 'Visitors see little useful page content before scrolling.',
    recommendation: 'Reduce the collapsed mobile header and reveal the page purpose sooner.',
    sourceUrl: 'https://example.com/',
    screenshotArtifactId: 'shot-mobile',
    confidence: 0.9,
    region: {
      label: 'Header and navigation',
      selector: 'body > header',
      bounds: { x: 0, y: 0, width: 375, height: 300 },
    },
    ...overrides,
  };
}

const matchingRule = {
  id: 'rule-navigation',
  title: 'Navigation takes up too much of the first mobile screen',
  finding: 'The header occupies a large part of the mobile viewport.',
  sourceUrls: ['https://example.com/'],
  evidenceArtifactIds: ['shot-mobile'],
};

test('normalises a corroborated model observation as a private review candidate', () => {
  const result = normaliseVisionObservations([rawObservation()], {
    screenshotArtifacts: [screenshot()],
    auditId,
    crawlRunId: runId,
    ruleFindings: [matchingRule],
  });

  assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.accepted[0].evidenceArtifactIds, ['shot-mobile']);
  assert.equal(result.accepted[0].candidateState, 'ranked_candidate');
  assert.equal(result.accepted[0].confidence, 'high');
  assert.equal(result.accepted[0].reviewState, 'needs_review');
  assert.equal(result.accepted[0].publicationEligible, false);
});

test('rejects observations that do not bind to exact same-run screenshot evidence', () => {
  const cases = [
    {
      artifact: screenshot({ kind: 'asset' }),
      expectedReason: 'missing_screenshot_evidence',
    },
    {
      artifact: screenshot({ crawl_run_id: 'run-old' }),
      expectedReason: 'evidence_from_different_run',
    },
    {
      artifact: screenshot({ metadata: { ...screenshot().metadata, auditId: 'audit-old' } }),
      expectedReason: 'evidence_from_different_run',
    },
    {
      artifact: screenshot({
        metadata: { ...screenshot().metadata, sourceUrl: 'https://other.example/' },
      }),
      expectedReason: 'evidence_source_mismatch',
    },
  ];

  for (const entry of cases) {
    const result = normaliseVisionObservations([rawObservation()], {
      screenshotArtifacts: [entry.artifact],
      auditId,
      crawlRunId: runId,
    });
    assert.equal(result.accepted.length, 0);
    assert.equal(result.rejected[0].reason, entry.expectedReason);
  }
});

test('rejects screenshots that were not captured with a verified responsive browser profile', () => {
  const artifact = screenshot({
    metadata: {
      ...screenshot().metadata,
      captureContract: 'legacy-responsive-capture',
      viewportIntegrity: { status: 'failed' },
    },
  });
  const result = normaliseVisionObservations([rawObservation()], {
    screenshotArtifacts: [artifact],
    auditId,
    crawlRunId: runId,
  });

  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, 'untrusted_capture_profile');
});

test('accepts a visually confirmed persistent-content obstruction when overlap evidence corroborates it', () => {
  const raw = rawObservation({
    issueType: 'content_obstruction',
    area: 'UX',
    title: 'Sticky contact actions cover footer information',
    observation:
      'The fixed action bar visibly sits over the footer content at the end of the page.',
    customerImpact: 'Visitors cannot comfortably read or use the covered footer information.',
    recommendation: 'Reserve space for the actions or collapse them before the footer is reached.',
    region: {
      label: 'Fixed contact actions over footer',
      selector: 'body > aside',
      bounds: { x: 0, y: 690, width: 375, height: 122 },
    },
  });
  const overlapRule = {
    id: 'rule-persistent-overlay',
    title: 'Persistent interface elements cover page content',
    finding: 'A fixed interface element overlaps meaningful footer content.',
    sourceUrls: ['https://example.com/'],
    evidenceArtifactIds: ['shot-mobile'],
  };
  const result = normaliseVisionObservations([raw], {
    screenshotArtifacts: [screenshot()],
    auditId,
    crawlRunId: runId,
    ruleFindings: [overlapRule],
  });

  assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted[0].issueType, 'content_obstruction');
  assert.equal(result.accepted[0].candidateState, 'ranked_candidate');
});

test('rejects unobservable or off-screen regions', () => {
  const invalidRegions = [
    { label: '', selector: 'header', bounds: { x: 0, y: 0, width: 100, height: 100 } },
    {
      label: 'Outside screenshot',
      selector: 'header',
      bounds: { x: 350, y: 0, width: 100, height: 100 },
    },
    {
      label: 'No useful size',
      selector: 'header',
      bounds: { x: 0, y: 0, width: 2, height: 2 },
    },
  ];

  for (const region of invalidRegions) {
    const result = normaliseVisionObservations([rawObservation({ region })], {
      screenshotArtifacts: [screenshot()],
      auditId,
      crawlRunId: runId,
    });
    assert.equal(result.rejected[0].reason, 'unverifiable_visible_region');
  }
});

test('keeps unmatched and low-confidence suggestions out of ranked candidates', () => {
  const unmatched = normaliseVisionObservations([rawObservation()], {
    screenshotArtifacts: [screenshot()],
    auditId,
    crawlRunId: runId,
  }).accepted[0];
  const lowConfidence = normaliseVisionObservations([rawObservation({ confidence: 0.42 })], {
    screenshotArtifacts: [screenshot()],
    auditId,
    crawlRunId: runId,
    ruleFindings: [matchingRule],
  }).accepted[0];
  const ranked = rankVisionCandidates([unmatched, lowConfidence]);

  assert.equal(unmatched.confidence, 'low');
  assert.equal(unmatched.candidateState, 'review_only');
  assert.equal(lowConfidence.candidateState, 'review_only');
  assert.equal(ranked.rankedCandidates.length, 0);
  assert.equal(ranked.reviewOnly.length, 2);
  assert.ok(ranked.reviewOnly.every((entry) => entry.reviewState === 'needs_review'));
  assert.ok(ranked.reviewOnly.every((entry) => entry.publicationEligible === false));
});

test('deduplicates repeated device cases and ranks by impact without granting publication', () => {
  const desktopArtifact = screenshot({
    id: 'shot-desktop',
    metadata: {
      ...screenshot().metadata,
      viewport: { label: 'desktop', width: 1440, height: 900 },
    },
  });
  const desktopRule = {
    ...matchingRule,
    id: 'rule-desktop',
    evidenceArtifactIds: ['shot-desktop'],
  };
  const rawDesktop = rawObservation({
    title: 'Navigation dominates the opening screen',
    screenshotArtifactId: 'shot-desktop',
    region: {
      label: 'Desktop header',
      selector: 'body > header',
      bounds: { x: 0, y: 0, width: 1440, height: 250 },
    },
  });
  const accepted = normaliseVisionObservations([rawObservation(), rawDesktop], {
    screenshotArtifacts: [screenshot(), desktopArtifact],
    auditId,
    crawlRunId: runId,
    ruleFindings: [matchingRule, desktopRule],
  }).accepted;
  const result = rankVisionCandidates(accepted);

  assert.equal(result.rankedCandidates.length, 1);
  assert.equal(result.rankedCandidates[0].occurrenceCount, 2);
  assert.deepEqual(result.rankedCandidates[0].affectedViewports.sort(), ['desktop', 'mobile']);
  assert.deepEqual(result.rankedCandidates[0].evidenceArtifactIds.sort(), [
    'shot-desktop',
    'shot-mobile',
  ]);
  assert.equal(result.rankedCandidates[0].reviewState, 'needs_review');
  assert.equal(result.rankedCandidates[0].publicationEligible, false);
});

test('promotes repeated direct visual evidence to medium confidence without pretending it is rule-proven', () => {
  const desktopArtifact = screenshot({
    id: 'shot-desktop',
    metadata: {
      ...screenshot().metadata,
      viewport: { label: 'desktop', width: 1440, height: 900 },
    },
  });
  const accepted = normaliseVisionObservations(
    [
      rawObservation({ issueType: 'information_architecture' }),
      rawObservation({
        issueType: 'information_architecture',
        screenshotArtifactId: 'shot-desktop',
        region: {
          label: 'Repeated information structure',
          selector: 'body > main',
          bounds: { x: 0, y: 120, width: 1200, height: 600 },
        },
      }),
    ],
    {
      screenshotArtifacts: [screenshot(), desktopArtifact],
      auditId,
      crawlRunId: runId,
    },
  ).accepted;
  const result = rankVisionCandidates(accepted);

  assert.equal(result.rankedCandidates.length, 1);
  assert.equal(result.rankedCandidates[0].confidence, 'medium');
  assert.equal(result.rankedCandidates[0].candidateState, 'ranked_candidate');
  assert.equal(result.rankedCandidates[0].corroboratedCount, 0);
  assert.equal(result.rankedCandidates[0].publicationEligible, false);
});

test('strict response schema requires evidence, confidence, and an observable region', () => {
  const schema = uxVisionResponseSchema();
  const item = schema.properties.observations.items;

  assert.equal(schema.additionalProperties, false);
  assert.equal(item.additionalProperties, false);
  assert.ok(item.required.includes('screenshotArtifactId'));
  assert.ok(item.required.includes('confidence'));
  assert.ok(item.required.includes('region'));
  assert.deepEqual(item.properties.confidence, { type: 'number', minimum: 0, maximum: 1 });
  assert.equal(item.properties.region.additionalProperties, false);
  assert.deepEqual(item.properties.region.properties.bounds.required, [
    'x',
    'y',
    'width',
    'height',
  ]);
});

test('worker adapter emits existing finding shape without a direct publication path', () => {
  const result = normaliseVisionAnalysis({
    analysis: { observations: [rawObservation()] },
    screenshots: [screenshot()],
    page: { url: 'https://example.com/' },
    facts: [{ id: 'fact-current', source_url: 'https://example.com/' }],
    deterministicFindings: [matchingRule],
    task: { audit_id: auditId, crawl_run_id: runId },
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].findingClass, 'design_judgement');
  assert.deepEqual(result.findings[0].evidenceFactIds, ['fact-current']);
  assert.deepEqual(result.findings[0].evidenceArtifactIds, ['shot-mobile']);
  assert.equal(result.findings[0].measurement.vision.candidateState, 'ranked_candidate');
  assert.equal(result.findings[0].measurement.vision.publicationEligible, false);
  assert.equal('reviewState' in result.findings[0], false);
  assert.equal('publicationEligible' in result.findings[0], false);
});
