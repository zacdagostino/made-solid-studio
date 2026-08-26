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
      const request = indexedDB.open('siteforge-os', 9);
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
        const request = indexedDB.open('siteforge-os', 9);
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

async function seedVerifiedEditedWebsite(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('siteforge-os', 9);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ['buildManifests', 'builderRuns', 'sourceReleaseAttestations'],
            'readwrite',
          );
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          const businessId = 'business-demo-local-services';
          const manifestId = 'manifest-report-e2e';
          const builderRunId = 'builder-report-e2e';
          const now = '2099-08-18T13:00:00.000Z';
          transaction.objectStore('buildManifests').put({
            id: manifestId,
            businessId,
            status: 'ready',
            createdAt: now,
            updatedAt: now,
          });
          transaction.objectStore('builderRuns').put({
            id: builderRunId,
            businessId,
            buildManifestId: manifestId,
            buildMode: 'full_site',
            status: 'ready',
            createdAt: now,
            updatedAt: now,
          });
          transaction.objectStore('sourceReleaseAttestations').put({
            id: 'release-report-e2e',
            attestationId: 'a'.repeat(64),
            businessId,
            sourceBuilderRunId: builderRunId,
            sourceManifestId: manifestId,
            sourceRepositoryUrl: 'https://github.com/made-solid/demo-local-services',
            sourceCommit: 'b'.repeat(40),
            sourceTree: 'c'.repeat(40),
            sourceBranch: 'main',
            sourceEditVersion: 3,
            verificationProfile: 'made-solid-edited-site-release-v1',
            verifiedAt: now,
            checks: [
              ['source-verification', 'Source verification'],
              ['responsive-layout', 'Responsive layout'],
              ['responsive-navigation', 'Responsive navigation'],
              ['accessibility', 'Accessibility'],
            ].map(([id, label]) => ({
              id,
              label,
              detail: `${label} passed for the exact edited website.`,
              status: 'passed',
            })),
            sourceBuilderStatus: 'ready',
            sourceBuilderQualitySummary: { status: 'passed' },
            createdAt: now,
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
  const reportLink = page.getByRole('link', { name: 'Open automated report' });
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

test('automatically selects supported report evidence and shows the single remaining prerequisite', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReviewedAudit(page);
  await page.goto('/#/prospects/business-demo-local-services/report');

  await expect(
    page.getByRole('heading', { name: 'Demo Local Services website report' }),
  ).toBeVisible();
  await expect(page.getByText('No manual review is required.')).toBeVisible();
  await expect(page.getByText('Website verification required')).toBeVisible();
  const verifyWebsite = page.getByRole('link', { name: 'Verify current edited website' });
  await expect(verifyWebsite).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/editing',
  );
  if (testInfo.project.name === 'mobile') {
    const actionBox = await verifyWebsite.boundingBox();
    expect(actionBox && actionBox.y + actionBox.height).toBeLessThanOrEqual(812);
  }
  await expect(page.getByText(/1 supported case will become up to 1 client theme/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Approve/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Exclude/i })).toHaveCount(0);

  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(page.viewportSize().width);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('automated-report-verification-required.png', {
    fullPage: true,
    animations: 'disabled',
  });

  const automaticSelection = page.getByText('What Studio selected automatically');
  await automaticSelection.click();
  await expect(page.getByText('Mobile experience')).toBeVisible();
  await expect(page.getByText('Platform', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('generates one current report automatically when the verified edit is ready', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedReviewedAudit(page);
  await seedVerifiedEditedWebsite(page);
  await page.goto('/#/prospects/business-demo-local-services/report');

  await expect(
    page.getByRole('heading', { name: 'Demo Local Services website report' }),
  ).toBeVisible();
  await expect(page.getByText('Value report v1 is current')).toBeVisible();
  await expect(page.getByText(/Edit v3 passed release checks/i)).toBeVisible();
  const previewReport = page.getByRole('link', { name: 'Preview client report' });
  await expect(previewReport).toHaveAttribute(
    'href',
    '#/prospects/business-demo-local-services/report-preview',
  );
  if (testInfo.project.name === 'mobile') {
    const actionBox = await previewReport.boundingBox();
    expect(actionBox && actionBox.y + actionBox.height).toBeLessThanOrEqual(812);
  }
  await expect(page.getByRole('button', { name: /Approve/i })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Value report v1 is current')).toBeVisible();
  const savedReportCount = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('siteforge-os', 9);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('reportVersions', 'readonly');
          const count = transaction.objectStore('reportVersions').count();
          count.onerror = () => reject(count.error);
          count.onsuccess = () => {
            database.close();
            resolve(count.result);
          };
        };
      }),
  );
  expect(savedReportCount).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('automated-report-ready.png', {
    fullPage: true,
    animations: 'disabled',
  });
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    await expect(page).toHaveScreenshot('automated-report-ready-compact-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  }
});
