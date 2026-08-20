import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const specialistKinds = [
  'responsive_ui',
  'accessibility',
  'performance_engineering',
  'technical_seo',
  'conversion_journey',
  'platform_integrations',
];

async function seedReviewedAudit(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await page.evaluate((kinds) => {
    const businessId = 'business-demo-local-services';
    const auditId = 'audit-report-e2e';
    const crawlRunId = 'crawl-report-e2e';
    const now = '2099-08-18T12:00:00.000Z';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('siteforge-os', 8);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          [
            'crawlRuns',
            'facts',
            'artifacts',
            'audits',
            'auditSpecialistTasks',
            'auditObservations',
          ],
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
          requestedAt: now,
          startedAt: now,
          completedAt: now,
          discoveredPageCount: 3,
          capturedPageCount: 3,
          failedPageCount: 0,
        });
        transaction.objectStore('facts').put({
          id: 'fact-mobile-navigation',
          businessId,
          crawlRunId,
          label: 'Mobile navigation structure',
          value: 'The enquiry link is beyond the first visible navigation group.',
          evidence: 'Saved from the 375 × 812 responsive capture.',
          sourceUrl: 'https://demo-local-services.example/contact',
          confidence: 'high',
          verificationState: 'verified',
          capturedAt: now,
        });
        transaction.objectStore('artifacts').put({
          id: 'artifact-platform-signal',
          businessId,
          crawlRunId,
          kind: 'performance',
          label: 'Platform and resource capture',
          storageBucket: 'research-artifacts',
          storagePath: 'audit-report-e2e/platform.json',
          contentType: 'application/json',
          metadata: {
            sourceUrl: 'https://demo-local-services.example/',
            observation: 'The saved page source contains Wix runtime identifiers.',
          },
          createdAt: now,
        });
        transaction.objectStore('audits').put({
          id: auditId,
          businessId,
          version: 4,
          crawlRunId,
          status: 'ready',
          findings: [],
          progressPhase: 'complete',
          progressDetail: 'All specialist audit sections are ready for human review.',
          totalItems: 6,
          completedItems: 6,
          createdAt: now,
          updatedAt: now,
        });
        kinds.forEach((specialistKind, index) => {
          transaction.objectStore('auditSpecialistTasks').put({
            id: `specialist-task-${index}`,
            businessId,
            auditId,
            crawlRunId,
            specialistKind,
            status: 'ready',
            progressPhase: 'complete',
            progressDetail: 'Evidence saved for review.',
            totalItems: 3,
            completedItems: 3,
            createdAt: now,
            updatedAt: now,
          });
        });
        transaction.objectStore('auditObservations').put({
          id: 'observation-mobile-navigation',
          businessId,
          auditId,
          specialistTaskId: 'specialist-task-0',
          crawlRunId,
          specialistKind: 'responsive_ui',
          area: 'Mobile',
          findingClass: 'observed_defect',
          severity: 'high',
          title: 'The mobile enquiry route is hard to reach',
          observation:
            'At 375 × 812, the primary enquiry link sits beyond the first visible navigation group.',
          customerImpact:
            'A visitor ready to ask for a quote has to work harder to find the next step.',
          recommendation:
            'Use a focused mobile menu with the enquiry action visible in the first navigation view.',
          sourceUrls: ['https://demo-local-services.example/contact'],
          evidenceFactIds: ['fact-mobile-navigation'],
          evidenceArtifactIds: [],
          viewport: { width: 375, height: 812, label: 'Mobile' },
          measurement: {
            testedWidth: 375,
            source: 'multimodal_ux_model',
            priorityScore: 96,
            occurrenceCount: 2,
          },
          confidence: 'high',
          reviewState: 'needs_review',
          createdAt: now,
          updatedAt: now,
        });
        transaction.objectStore('auditObservations').put({
          id: 'observation-platform-signal',
          businessId,
          auditId,
          specialistTaskId: 'specialist-task-5',
          crawlRunId,
          specialistKind: 'platform_integrations',
          area: 'Platform',
          findingClass: 'observed_condition',
          severity: 'low',
          title: 'The current site uses Wix runtime services',
          observation:
            'The saved public page source contains Wix runtime identifiers and hosted resource paths.',
          customerImpact:
            'This is a platform trade-off to consider, not evidence that Wix caused another issue.',
          recommendation:
            'Compare editing, performance, integration and ownership needs before choosing a future platform.',
          sourceUrls: ['https://demo-local-services.example/'],
          evidenceFactIds: [],
          evidenceArtifactIds: ['artifact-platform-signal'],
          measurement: { detectedPlatform: 'Wix' },
          confidence: 'high',
          reviewState: 'needs_review',
          createdAt: now,
          updatedAt: now,
        });
      };
    });
  }, specialistKinds);
}

async function failResponsiveSpecialist(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('siteforge-os', 8);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(['audits', 'auditSpecialistTasks'], 'readwrite');
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          const now = '2099-08-18T12:05:00.000Z';
          transaction.objectStore('audits').put({
            id: 'audit-report-e2e',
            businessId: 'business-demo-local-services',
            version: 4,
            crawlRunId: 'crawl-report-e2e',
            status: 'failed',
            findings: [],
            progressPhase: 'failed',
            progressDetail: 'The responsive specialist stopped during browser verification.',
            errorSummary: 'One of six specialist sections failed. Saved evidence remains private.',
            totalItems: 6,
            completedItems: 5,
            createdAt: '2099-08-18T12:00:00.000Z',
            updatedAt: now,
          });
          transaction.objectStore('auditSpecialistTasks').put({
            id: 'specialist-task-0',
            businessId: 'business-demo-local-services',
            auditId: 'audit-report-e2e',
            crawlRunId: 'crawl-report-e2e',
            specialistKind: 'responsive_ui',
            status: 'failed',
            progressPhase: 'failed',
            progressDetail: 'Browser verification stopped on the contact page.',
            errorSummary: 'The mobile browser timed out while loading /contact.',
            totalItems: 3,
            completedItems: 1,
            createdAt: '2099-08-18T12:00:00.000Z',
            updatedAt: now,
          });
        };
      }),
  );
}

test('shows specialist completion and durable worker errors on the Audit screen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReviewedAudit(page);
  await page.goto('/#/prospects/business-demo-local-services/audit');

  await expect(page.getByRole('heading', { name: 'Audit version 4' })).toBeVisible();
  await expect(page.getByText('6 of 6 complete')).toBeVisible();
  await expect(page.getByText('2 observations are ready')).toBeVisible();
  const reportLink = page.getByRole('link', { name: 'Review report findings' });
  await expect(reportLink).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/report',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('audit-specialist-lifecycle.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await failResponsiveSpecialist(page);
  await page.reload();

  await expect(page.getByRole('alert').first()).toContainText(
    'One of six specialist sections failed. Saved evidence remains private.',
  );
  await expect(
    page.getByText('The mobile browser timed out while loading /contact.'),
  ).toBeVisible();
  await expect(page.getByText('1 specialist section failed')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('audit-specialist-error.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('reviews current-run specialist evidence and freezes a report version', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReviewedAudit(page);
  await page.goto('/#/prospects/business-demo-local-services/report');

  await expect(
    page.getByRole('heading', { name: 'Website findings for Demo Local Services' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Specialist coverage' })).toBeVisible();
  await expect(page.getByText('6 tasks')).toBeVisible();
  const platformTheme = page.getByRole('button', {
    name: /The current site uses Wix runtime services/,
  });
  await expect(platformTheme).toBeVisible();

  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(page.viewportSize().width);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('audit-report-review.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page
    .getByRole('heading', { name: 'The mobile enquiry route is hard to reach', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('audit-report-findings.png', {
    animations: 'disabled',
  });

  const approve = page.getByRole('button', { name: 'Approve for report' }).first();
  await approve.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Approved for report' })).toBeVisible();
  await expect(page.getByText('1 unselected observation stays private.')).toBeVisible();
  const approveAll = page.getByRole('button', { name: 'Approve all recommended (1)' });
  await expect(approveAll).toBeEnabled();
  await approveAll.click();
  await expect(page.getByLabel('Review summary')).toContainText('2Client themes selected');

  const createReport = page.getByRole('button', {
    name: 'Create report from 2 selected themes',
  });
  await expect(createReport).toBeEnabled();
  await createReport.click();
  await expect(page.getByText('Report version 1 created')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Report version 1 is ready' })).toBeVisible();
  await expect(page.getByText('Saved in report history')).toBeVisible();
  const previewReport = page.getByRole('link', { name: 'Preview client report' });
  await expect(previewReport).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/report-preview',
  );
  await expect(page.getByRole('link', { name: 'Continue to handoff' })).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/handoff',
  );
  await expect(page.getByRole('button', { name: 'Create updated report version' })).toBeVisible();
  await previewReport.click();
  await expect(page).toHaveURL(/#\/prospects\/business-demo-local-services\/report-preview$/);
  await expect(page.getByText('Private Studio preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /website report/i, level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to report' })).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/report',
  );
  await expect(page.getByRole('link', { name: 'Continue to handoff' })).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/handoff',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('audit-report-client-preview.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
