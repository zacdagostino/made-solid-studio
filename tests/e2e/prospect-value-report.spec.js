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
    schemaVersion: 5,
    summary: 'Four reviewed cases consolidated into two value themes and tied to verified edit v3.',
    data: {
      schemaVersion: 5,
      reportKind: 'verified_redesign_value',
      title: 'A stronger digital foundation for Demo Local Services',
      summary:
        'Demo Local Services now has a complete, verified website redesign grounded in reviewed evidence from the original site.',
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
          value:
            'Visitors can understand the offer and reach the next action without fighting the interface.',
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
          value:
            'Prospective customers can move from understanding the service to starting a conversation with less uncertainty.',
          occurrenceCount: 1,
          sourceUrls: ['https://demo-local-services.example/contact'],
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
            ['crawlRuns', 'audits', 'reportVersions'],
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
          transaction.objectStore('reportVersions').put(report);
        };
      }),
    { auditId, businessId, crawlRunId, report },
  );
}

test('renders the prospect-specific verified value report at every required viewport', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReport(page, valueReport());
  await page.goto(`/#/prospects/${businessId}/report-preview`);

  await expect(
    page.getByRole('heading', { name: 'A stronger digital foundation for Demo Local Services' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A foundation worth building on' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Where the old experience lost clarity—and what changed' }),
  ).toBeVisible();
  await expect(page.getByText('Verified redesign · Edit v3')).toBeVisible();
  await expect(page.getByText('3 supported cases')).toBeVisible();
  await expect(page.getByText('The complete website source passed verification')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('prospect-value-report.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page
    .getByRole('heading', { name: 'Where the old experience lost clarity—and what changed' })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('prospect-value-report-themes.png', {
    animations: 'disabled',
  });
  await page
    .getByRole('heading', { name: 'Confidence in the website you are reviewing' })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('prospect-value-report-proof.png', {
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
