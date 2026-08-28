import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const businessId = 'business-demo-local-services';
const crawlRunId = 'crawl-value-report-e2e';
const auditId = 'audit-value-report-e2e';

function valueReport() {
  return {
    id: 'report-value-e2e',
    businessId,
    auditId,
    crawlRunId,
    status: 'approved',
    reviewState: 'approved',
    version: 4,
    schemaVersion: 10,
    summary: 'Four reviewed cases consolidated into two value themes and tied to verified edit v3.',
    data: {
      schemaVersion: 10,
      generatorRevision: 'gpt-5.6-sol-design-showcase-v2',
      reportKind: 'verified_redesign_value',
      title: 'See the difference for Demo Local Services',
      summary:
        'Demo Local Services now has a complete, verified website redesign grounded in reviewed evidence from the original site.',
      transformationStatement:
        'A crowded, uncertain experience has become a focused website that makes the service and next step easier to understand.',
      majorFindings: [
        {
          id: 'finding-navigation',
          area: 'Mobile navigation',
          title: 'The interface crowded out the first message',
          originalProblem:
            'Navigation and page chrome occupied too much of the first phone screen.',
          visitorImpact:
            'Visitors had to work past the interface before reaching the useful service content.',
          whyItMatters: 'The first screen should establish relevance quickly.',
          evidence: {
            artifactId: 'old-site-mobile-screenshot',
            sourceUrl: 'https://demo-local-services.example/',
            viewport: { width: 375, height: 812 },
          },
        },
        {
          id: 'finding-enquiry',
          area: 'Enquiry journey',
          title: 'The next action was difficult to recognise',
          originalProblem: 'The original contact experience did not establish a clear visual path.',
          visitorImpact:
            'Interested customers could hesitate when they were ready to make contact.',
          whyItMatters: 'A service website should make the next step feel obvious and low effort.',
          evidence: {
            artifactId: 'old-site-enquiry-screenshot',
            sourceUrl: 'https://demo-local-services.example/contact',
            viewport: { width: 768, height: 1024 },
          },
        },
      ],
      designDecisions: [
        {
          id: 'decision-hierarchy',
          title: 'Make the service story lead',
          detail: 'Branding and navigation support the content instead of competing with it.',
        },
        {
          id: 'decision-actions',
          title: 'Keep customer actions in context',
          detail: 'Enquiry prompts now appear where customers have enough information to act.',
        },
      ],
      technologyFoundation: {
        evidenceStatus: 'verified',
        items: [
          {
            id: 'nextjs',
            title: 'Modern Next.js foundation',
            detail: 'The website uses a maintainable, production-ready web foundation.',
          },
          {
            id: 'typescript',
            title: 'Reliable TypeScript source',
            detail: 'Typed source code makes future changes safer to maintain.',
          },
        ],
        responsiveVerification: {
          title: 'Responsive by design',
          detail: 'The complete website was checked across phone, tablet and desktop layouts.',
        },
      },
      strengths: [
        {
          id: 'identity',
          title: 'An established identity worth carrying forward',
          detail:
            'The redesign uses the reviewed organisation logo and brand direction rather than replacing the business with a generic identity.',
        },
        {
          id: 'working-redesign',
          title: 'There is already a complete website to review',
          detail:
            'The proposed solution is a working edited website, not a mock-up or a list of future recommendations.',
        },
      ],
      valueThemes: [
        {
          id: 'theme-mobile',
          area: 'Mobile',
          title: 'A dependable experience on every screen',
          before:
            'Important service and enquiry content could clip or become difficult to reach on smaller screens.',
          redesignResponse:
            'The completed website uses responsive page structure and a focused compact navigation pattern across every generated route.',
          businessOpportunity:
            'Visitors can understand the offer and reach the next action without fighting the interface.',
          value:
            'Visitors can understand the offer and reach the next action without fighting the interface.',
          whatToNotice: 'Important information is clipped at the edge of the original page.',
          designPriority: 'Keep essential messages clear across every screen size.',
          editedSiteProof: null,
          evidence: {
            artifactId: 'old-site-mobile-screenshot',
            caption: 'Important information is clipped at the edge of the original page.',
            sourceUrl: 'https://demo-local-services.example/',
            viewport: { width: 375, height: 812 },
          },
          afterEvidence: {
            artifactId: 'new-site-mobile-screenshot',
            sourceUrl: 'https://demo-local-services.example/',
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
            whatChanged: 'The redesigned page creates a deliberate mobile hierarchy.',
            whyBetter: 'Customers can understand the page without cropped content.',
          },
          occurrenceCount: 3,
          sourceUrls: ['https://demo-local-services.example/'],
        },
        {
          id: 'theme-conversion',
          area: 'Conversion',
          title: 'Clearer paths from interest to enquiry',
          before:
            'The original experience made the next step less obvious at moments of high visitor intent.',
          redesignResponse:
            'The new journey places relevant enquiry actions alongside service and trust information.',
          businessOpportunity:
            'Prospective customers can move from understanding the service to starting a conversation with less uncertainty.',
          value:
            'Prospective customers can move from understanding the service to starting a conversation with less uncertainty.',
          whatToNotice: 'The original page does not make the next step easy to find.',
          designPriority: 'Keep the next action visible when customer interest is highest.',
          editedSiteProof: null,
          evidence: {
            artifactId: 'old-site-enquiry-screenshot',
            caption: 'The original page does not make the next step easy to find.',
            sourceUrl: 'https://demo-local-services.example/contact',
            viewport: { width: 768, height: 1024 },
          },
          afterEvidence: {
            artifactId: 'new-site-enquiry-screenshot',
            sourceUrl: 'https://demo-local-services.example/contact',
            generatedRoute: '/contact/',
            viewport: { width: 768, height: 1024 },
            verification: {
              status: 'passed',
              captureContract: 'verified-comparison-page-ready-v1',
              pageReady: true,
              loaderVisible: false,
              sameViewport: true,
              originalHorizontalOverflowPx: 160,
              redesignedHorizontalOverflowPx: 0,
            },
          },
          comparison: {
            whatChanged: 'The redesigned page creates a clearer enquiry journey.',
            whyBetter: 'Customers can recognise the next step sooner.',
          },
          occurrenceCount: 1,
          sourceUrls: ['https://demo-local-services.example/contact'],
        },
        {
          id: 'theme-trust',
          area: 'Trust',
          title: 'A clearer reason to choose the business',
          before: 'Proof of experience was easy to miss while comparing providers.',
          redesignResponse:
            'The completed website brings relevant credentials and experience into the decision journey.',
          businessOpportunity: 'Visitors can make a more confident decision before they enquire.',
          value: 'Visitors can make a more confident decision before they enquire.',
          whatToNotice: 'The original page separates proof from the information customers need.',
          designPriority: 'Place relevant proof alongside the information customers use to decide.',
          editedSiteProof: null,
          evidence: {
            artifactId: 'old-site-trust-screenshot',
            caption: 'The original page separates proof from the information customers need.',
            sourceUrl: 'https://demo-local-services.example/about',
            viewport: { width: 1440, height: 900 },
          },
          afterEvidence: {
            artifactId: 'new-site-trust-screenshot',
            sourceUrl: 'https://demo-local-services.example/about',
            generatedRoute: '/about/',
            viewport: { width: 1440, height: 900 },
            verification: {
              status: 'passed',
              captureContract: 'verified-comparison-page-ready-v1',
              pageReady: true,
              loaderVisible: false,
              sameViewport: true,
              originalHorizontalOverflowPx: 0,
              redesignedHorizontalOverflowPx: 0,
            },
          },
          comparison: {
            whatChanged: 'The redesign presents business proof beside relevant information.',
            whyBetter: 'Customers receive a more confident first impression.',
          },
          occurrenceCount: 2,
          sourceUrls: ['https://demo-local-services.example/about'],
        },
      ],
      deliveredWork: [
        {
          id: 'source-verification',
          label: 'The complete website source passed verification',
          detail: 'Formatting, lint, type checks, build and project quality gates passed.',
          status: 'passed',
        },
        {
          id: 'responsive-layout',
          label: 'Every generated route was checked across required screen sizes',
          detail: 'All 12 routes passed at mobile, tablet and desktop viewports.',
          status: 'passed',
        },
        {
          id: 'responsive-navigation',
          label: 'Mobile and tablet navigation interactions were checked',
          detail: 'Open, close, Escape and focus restoration passed.',
          status: 'passed',
        },
        {
          id: 'accessibility',
          label: 'Automated accessibility checks passed across responsive views',
          detail: 'No blocking automated accessibility violations were found.',
          status: 'passed',
        },
      ],
      redesign: {
        status: 'passed',
        attestationId: 'a'.repeat(64),
        sourceBuilderRunId: 'builder-value-report-e2e',
        sourceManifestId: 'manifest-value-report-e2e',
        sourceCommit: 'b'.repeat(40),
        sourceTree: 'c'.repeat(40),
        sourceBranch: 'main',
        sourceEditVersion: 3,
        verificationProfile: 'made-solid-edited-site-release-v1',
        verifiedAt: '2099-08-26T03:56:55.654Z',
      },
      methodology: [
        'The original website themes are selected automatically from supported current-capture evidence with high or medium confidence.',
        'The delivered-work claims come from the exact edited Git commit named in this report.',
      ],
      limitations: [
        'The report does not claim guaranteed traffic, rankings, enquiries or revenue.',
      ],
      nextStep:
        'Review the completed Demo Local Services website together, confirm it represents the business accurately, and choose the right path to launch.',
    },
    createdAt: '2099-08-26T04:00:00.000Z',
    updatedAt: '2099-08-26T04:00:00.000Z',
  };
}

async function seedReport(page, report) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.evaluate(
    ({ auditId, businessId, crawlRunId, report }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('siteforge-os', 9);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ['crawlRuns', 'audits', 'artifacts', 'reportVersions', 'sourceReleaseAttestations'],
            'readwrite',
          );
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.objectStore('crawlRuns').put({
            id: crawlRunId,
            businessId,
            websiteId: 'website-demo-local-services',
            targetUrl: 'https://demo-local-services.example',
            scope: 'key_pages',
            status: 'ready',
            requestedAt: '2099-08-26T02:00:00.000Z',
            startedAt: '2099-08-26T02:00:00.000Z',
            completedAt: '2099-08-26T02:05:00.000Z',
            discoveredPageCount: 3,
            capturedPageCount: 3,
            failedPageCount: 0,
          });
          transaction.objectStore('audits').put({
            id: auditId,
            businessId,
            version: 5,
            crawlRunId,
            status: 'ready',
            findings: [],
            totalItems: 6,
            completedItems: 6,
            createdAt: '2099-08-26T03:00:00.000Z',
            updatedAt: '2099-08-26T03:00:00.000Z',
          });
          [
            ['old-site-mobile-screenshot', 'https://demo-local-services.example/', 375, 812],
            [
              'old-site-enquiry-screenshot',
              'https://demo-local-services.example/contact',
              768,
              1024,
            ],
            ['old-site-trust-screenshot', 'https://demo-local-services.example/about', 1440, 900],
          ].forEach(([id, sourceUrl, width, height]) => {
            transaction.objectStore('artifacts').put({
              id,
              businessId,
              crawlRunId,
              kind: 'screenshot',
              label: 'Original website problem',
              storageBucket: 'e2e-fixtures',
              storagePath: '/test-fixtures/old-site-problem.svg',
              contentType: 'image/svg+xml',
              metadata: { sourceUrl, viewport: { width, height } },
              createdAt: '2099-08-26T02:04:00.000Z',
            });
          });
          [
            ['new-site-mobile-screenshot', 'https://demo-local-services.example/', 375, 812],
            [
              'new-site-enquiry-screenshot',
              'https://demo-local-services.example/contact',
              768,
              1024,
            ],
            ['new-site-trust-screenshot', 'https://demo-local-services.example/about', 1440, 900],
          ].forEach(([id, sourceUrl, width, height]) => {
            transaction.objectStore('artifacts').put({
              id,
              businessId,
              crawlRunId,
              kind: 'screenshot',
              label: 'Verified redesigned website',
              storageBucket: 'e2e-fixtures',
              storagePath: '/test-fixtures/new-site-improvement.svg',
              contentType: 'image/svg+xml',
              metadata: {
                evidenceKind: 'edited-site-comparison',
                releaseAttestationId: 'release-attestation-e2e',
                sourceUrl,
                viewport: { width, height },
              },
              createdAt: '2099-08-26T02:05:00.000Z',
            });
          });
          transaction.objectStore('reportVersions').put(report);
          transaction.objectStore('sourceReleaseAttestations').put({
            id: 'release-attestation-e2e',
            businessId,
            attestationId: 'a'.repeat(64),
            sourceBuilderRunId: 'builder-value-report-e2e',
            sourceManifestId: 'manifest-value-report-e2e',
            sourceRepositoryUrl: 'https://github.com/example/report-site',
            sourceCommit: 'b'.repeat(40),
            sourceTree: 'c'.repeat(40),
            sourceBranch: 'main',
            sourceEditVersion: 3,
            verificationProfile: 'made-solid-edited-site-release-v1',
            verifiedAt: '2099-08-26T03:56:55.654Z',
            createdAt: '2099-08-26T03:56:55.654Z',
            checks: [
              ['source-verification', 'Source verification'],
              ['responsive-layout', 'Responsive layout'],
              ['responsive-navigation', 'Responsive navigation'],
              ['accessibility', 'Accessibility'],
            ].map(([id, label]) => ({ id, label, detail: 'Passed.', status: 'passed' })),
            sourceBuilderStatus: 'review_required',
          });
        };
      }),
    { auditId, businessId, crawlRunId, report },
  );
}

async function seedReportGenerationJob(page, overrides = {}) {
  await page.evaluate(
    ({ auditId, businessId, crawlRunId, overrides }) => {
      window.localStorage.setItem(
        'siteforge-e2e-report-generation-job',
        JSON.stringify({
          id: 'report-generation-e2e',
          businessId,
          auditId,
          crawlRunId,
          releaseAttestationId: 'release-attestation-e2e',
          generatorContractVersion: 'client-value-report-agent-v2',
          model: 'gpt-5.6-sol',
          reasoningEffort: 'max',
          status: 'running',
          progressPhase: 'analysing_comparisons',
          progressDetail: 'Comparing six verified design candidates.',
          totalItems: 5,
          completedItems: 1,
          errorContext: {},
          createdAt: '2099-08-27T00:00:00.000Z',
          updatedAt: '2099-08-27T00:00:00.000Z',
          ...overrides,
        }),
      );
    },
    { auditId, businessId, crawlRunId, overrides },
  );
}

test('renders the prospect-specific verified value report at every required viewport', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReport(page, valueReport());
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'See the difference for Demo Local Services' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Client report generated and ready' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Create a shareable Clientspace copy' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create shareable copy' })).toBeVisible();
  const comparisons = page.getByRole('slider', {
    name: /Compare the original and redesigned/i,
  });
  await expect(comparisons).toHaveCount(3);
  await expect(page.getByText('Before', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('After', { exact: true }).first()).toBeVisible();
  await comparisons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(comparisons.first()).toHaveValue('51');
  await page.getByRole('button', { name: 'After', exact: true }).first().click();
  await expect(comparisons).toHaveCount(2);
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(comparisons).toHaveCount(3);
  await expect(
    page.getByText(
      'The client report above is already generated and ready. Create this separate copy only when you want to prepare it for Clientspace sharing.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A foundation worth building on' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'What was holding the website back' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: "See what changed—and why it's better",
    }),
  ).toBeVisible();
  await expect(page.getByText('Complete website ready to review')).toBeVisible();
  await expect(page.getByText('Reviewed across mobile, tablet and desktop')).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Original Demo Local Services website/i }),
  ).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: 'The choices shaping the new experience' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A modern website foundation' })).toBeVisible();
  await expect(page.getByText('Modern Next.js foundation')).toBeVisible();
  await expect(page.getByText('What to notice')).toHaveCount(3);
  await expect(
    page.locator('section[aria-labelledby="themes-title"]').getByText(/^0[1-3]$/),
  ).toHaveCount(3);

  // Technical provenance can remain available to Studio, but it must not lead the client story.
  const visibleCopy = await page.locator('body').innerText();
  expect(visibleCopy).not.toMatch(/\b(?:npm|axe|ARIA|viewport|commit [a-f0-9]{7,40})\b/i);
  await expect(page.getByText(/Source commit/i)).not.toBeVisible();
  await expect(page.getByText(/Internal Studio evidence and verification/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('prospect-value-report.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page
    .getByRole('heading', {
      name: "See what changed—and why it's better",
    })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('prospect-value-report-themes.png', {
    animations: 'disabled',
  });
  await page
    .getByRole('heading', { name: 'Your complete website is ready to review' })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('prospect-value-report-proof.png', {
    animations: 'disabled',
  });
  await page
    .getByRole('heading', { name: 'Create a shareable Clientspace copy' })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('prospect-value-report-delivery.png', {
    animations: 'disabled',
  });

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    await expect(page).toHaveScreenshot('prospect-value-report-compact-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  }
});

test('blocks a report tied to an earlier edited website release', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReport(page, valueReport());
  await page.evaluate(
    ({ businessId }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('siteforge-os', 9);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('sourceReleaseAttestations', 'readwrite');
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.objectStore('sourceReleaseAttestations').put({
            id: 'attestation-current-e2e',
            businessId,
            attestationId: 'd'.repeat(64),
            sourceBuilderRunId: 'builder-value-report-e2e',
            sourceManifestId: 'manifest-value-report-e2e',
            sourceCommit: 'e'.repeat(40),
            sourceTree: 'f'.repeat(40),
            sourceBranch: 'main',
            sourceEditVersion: 4,
            verificationProfile: 'made-solid-edited-site-release-v1',
            status: 'passed',
            verifiedAt: '2099-08-26T05:00:00.000Z',
            createdAt: '2099-08-26T05:00:00.000Z',
            checks: [],
          });
        };
      }),
    { businessId },
  );
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'Regenerate the report for the current edited website' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create current report' })).toHaveAttribute(
    'href',
    `#/prospects/${businessId}/report`,
  );
  await expect(
    page.getByRole('heading', { name: 'A stronger digital foundation for Demo Local Services' }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('explains that an earlier report contract must be regenerated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const legacy = {
    ...valueReport(),
    id: 'report-legacy-e2e',
    version: 2,
    schemaVersion: 4,
    data: {
      schemaVersion: 4,
      title: 'Demo Local Services website report',
      summary: 'An earlier report contract.',
      findings: [],
    },
  };
  await seedReport(page, legacy);
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'This report needs to be regenerated' }),
  ).toBeVisible();
  await expect(page.getByText(/Version 2 uses an earlier report contract/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Regenerate report' })).toHaveAttribute(
    'href',
    `#/prospects/${businessId}/report`,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('legacy-report-regeneration.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('does not ask for regeneration while Studio is updating to a newer report format', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const newerReport = {
    ...valueReport(),
    id: 'report-newer-than-studio-e2e',
    version: 12,
    schemaVersion: 11,
    data: {
      ...valueReport().data,
      schemaVersion: 11,
    },
  };
  await seedReport(page, newerReport);
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'Studio is updating to open report version 12' }),
  ).toBeVisible();
  await expect(page.getByText('The report does not need to be regenerated.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload updated Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Regenerate report' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('newer-report-studio-update.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('shows the active replacement job instead of the stale report on Preview', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const legacy = {
    ...valueReport(),
    id: 'report-running-replacement-e2e',
    schemaVersion: 8,
    data: { schemaVersion: 8, title: 'Earlier report', findings: [] },
  };
  await seedReport(page, legacy);
  await seedReportGenerationJob(page);
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'GPT-5.6 Sol is building the design story' }),
  ).toBeVisible();
  await expect(page.getByText('Step 2 of 5 · gpt-5.6-sol · max reasoning')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel generation' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'This report needs to be regenerated' }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('client-report-generation-running.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('shows the saved report error with a direct retry control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const legacy = {
    ...valueReport(),
    id: 'report-failed-replacement-e2e',
    schemaVersion: 8,
    data: { schemaVersion: 8, title: 'Earlier report', findings: [] },
  };
  await seedReport(page, legacy);
  await seedReportGenerationJob(page, {
    status: 'failed',
    progressPhase: 'validating_selection',
    progressDetail: 'Report generation stopped before a new client report was saved.',
    errorCode: 'selection_rejected',
    errorSummary: 'The report agent returned an unsupported client claim.',
    errorContext: { retryable: true, recoveryAction: 'retry' },
  });
  await page.goto(`/#/prospects/${businessId}/report`);

  await expect(page.getByText('Report generation stopped', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Error selection_rejected · phase validating_selection/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry report generation' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('client-report-generation-error.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
