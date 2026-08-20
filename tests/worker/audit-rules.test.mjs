import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditSpecialistKinds,
  generateAuditFindings,
  generateSpecialistAuditFindings,
} from '../../worker/audit-rules.mjs';

test('creates traceable findings only for observed capture signals', () => {
  const findings = generateAuditFindings({
    pages: [
      {
        url: 'https://example.test/contact',
        title: '',
        canonical_url: '',
        page_type: 'contact',
        metadata: {
          headingCount: 0,
          formCount: 0,
          imagesWithoutAlt: 2,
          unlabelledFormFieldCount: 1,
          viewportPresent: false,
        },
      },
    ],
    facts: [{ id: 'fact-contact', source_url: 'https://example.test/contact' }],
    accessibilityReports: [
      {
        sourceUrl: 'https://example.test/contact',
        violations: [
          {
            id: 'color-contrast',
            help: 'Elements must meet contrast requirements',
            impact: 'serious',
            nodeCount: 3,
          },
        ],
      },
    ],
    performanceReports: [
      { sourceUrl: 'https://example.test/contact', navigation: { loadMs: 3200 } },
    ],
    screenshots: [
      {
        sourceUrl: 'https://example.test/contact',
        metadata: { pageWidth: 900, layoutViewportWidth: 375 },
      },
    ],
  });

  assert.ok(findings.some((entry) => entry.title.includes('document title')));
  assert.ok(findings.some((entry) => entry.area === 'Accessibility' && entry.severity === 'high'));
  assert.ok(findings.some((entry) => entry.area === 'Mobile'));
  assert.ok(findings.every((entry) => entry.sourceUrls.includes('https://example.test/contact')));
  assert.ok(findings.every((entry) => entry.evidenceFactIds.includes('fact-contact')));
  assert.ok(findings.every((entry) => entry.customerImpact.length > 0));
});

test('keeps touch-target screening measurable and explicitly subject to review', () => {
  const findings = generateSpecialistAuditFindings('responsive_ui', {
    pages: [
      {
        url: 'https://example.test/',
        title: 'Example',
        canonical_url: 'https://example.test/',
        page_type: 'homepage',
        metadata: { headingCount: 1, viewportPresent: true },
      },
    ],
    facts: [],
    accessibilityReports: [],
    performanceReports: [],
    evidenceArtifacts: [
      { id: 'screenshot-mobile', sourceUrl: 'https://example.test/', kind: 'screenshot' },
    ],
    screenshots: [
      {
        sourceUrl: 'https://example.test/',
        metadata: {
          viewport: { label: 'mobile', width: 375, height: 812 },
          pageWidth: 375,
          layoutViewportWidth: 375,
          undersizedTargetCount: 2,
          undersizedTargets: [
            { element: 'a', label: 'Call', width: 36, height: 32 },
            { element: 'button', label: 'Menu', width: 40, height: 40 },
          ],
        },
      },
    ],
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].findingClass, 'usability_concern');
  assert.equal(findings[0].confidence, 'medium');
  assert.equal(findings[0].measurement.candidateCount, 2);
  assert.match(findings[0].finding, /exceptions still require human review/i);
  assert.deepEqual(findings[0].evidenceArtifactIds, ['screenshot-mobile']);
});

test('assigns deterministic findings to one specialist section', () => {
  const input = {
    pages: [
      {
        url: 'https://example.test/contact',
        title: '',
        canonical_url: '',
        page_type: 'contact',
        metadata: {
          headingCount: 0,
          formCount: 0,
          imagesWithoutAlt: 1,
          unlabelledFormFieldCount: 1,
          viewportPresent: false,
        },
      },
    ],
    facts: [{ id: 'fact-contact', source_url: 'https://example.test/contact' }],
    accessibilityReports: [],
    performanceReports: [],
    screenshots: [],
    evidenceArtifacts: [
      { id: 'artifact-contact', sourceUrl: 'https://example.test/contact', kind: 'html' },
    ],
  };

  const accessibility = generateSpecialistAuditFindings('accessibility', input);
  const seo = generateSpecialistAuditFindings('technical_seo', input);
  const conversion = generateSpecialistAuditFindings('conversion_journey', input);

  assert.equal(auditSpecialistKinds.length, 6);
  assert.ok(accessibility.length > 0);
  assert.ok(accessibility.every((entry) => entry.area === 'Accessibility'));
  assert.ok(seo.every((entry) => ['SEO', 'Content'].includes(entry.area)));
  assert.ok(conversion.every((entry) => ['Trust', 'Conversion'].includes(entry.area)));
  assert.ok(
    [...accessibility, ...seo, ...conversion].every((entry) =>
      entry.evidenceArtifactIds.includes('artifact-contact'),
    ),
  );
});

test('reports Wix only as a measured platform condition, not a platform defect', () => {
  const findings = generateSpecialistAuditFindings('platform_integrations', {
    pages: [],
    facts: [{ id: 'fact-home', source_url: 'https://example.test/' }],
    accessibilityReports: [],
    screenshots: [],
    evidenceArtifacts: [
      { id: 'artifact-home', sourceUrl: 'https://example.test/', kind: 'performance' },
    ],
    performanceReports: [
      {
        sourceUrl: 'https://example.test/',
        structure: { integrations: ['https://static.wixstatic.com/runtime.js'] },
      },
    ],
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].area, 'Platform');
  assert.equal(findings[0].findingClass, 'observed_condition');
  assert.equal(findings[0].confidence, 'medium');
  assert.match(findings[0].finding, /does not, by itself, establish a defect/i);
});

test('turns measured mobile UX obstructions into screenshot-linked findings', () => {
  const findings = generateSpecialistAuditFindings('responsive_ui', {
    pages: [
      {
        url: 'https://example.test/',
        title: 'Example',
        canonical_url: 'https://example.test/',
        page_type: 'homepage',
        metadata: { headingCount: 2, viewportPresent: true },
      },
    ],
    facts: [],
    accessibilityReports: [],
    performanceReports: [],
    evidenceArtifacts: [{ id: 'ux-shot', sourceUrl: 'https://example.test/', kind: 'screenshot' }],
    screenshots: [
      {
        sourceUrl: 'https://example.test/',
        metadata: {
          viewport: { label: 'mobile', width: 375, height: 812 },
          pageWidth: 375,
          layoutViewportWidth: 375,
          chromeHeightPx: 360,
          chromeViewportRatio: 0.443,
          oversizedLogo: { viewportAreaRatio: 0.62, selector: '#logo' },
          largestMedia: { viewportAreaRatio: 0.62, selector: '#logo' },
          feedbackRegions: [
            {
              kind: 'image-based-feedback',
              selector: '#feedback',
              imageCount: 4,
              readableTextLength: 35,
            },
          ],
        },
      },
    ],
  });

  assert.deepEqual(
    findings.map((finding) => finding.title),
    [
      'Navigation takes up too much of the first mobile screen',
      'An oversized logo dominates the visible page',
      'Customer feedback is presented mainly as images',
    ],
  );
  assert.ok(findings.every((finding) => finding.evidenceArtifactIds.includes('ux-shot')));
  assert.equal(findings[0].measurement.maximumViewportRatio, 0.443);
});
