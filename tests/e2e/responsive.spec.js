import { expect, test } from '@playwright/test';

const expectedViewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

async function openReadyBuildManifest(page) {
  await page.goto('/');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();

  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = new Date().toISOString();
    const businessId = 'business-demo-local-services';
    const brief = {
      id: 'brief-manifest-layout-check',
      businessId,
      researchPacketId: 'packet-manifest-layout-check',
      crawlRunId: 'capture-manifest-layout-check',
      status: 'approved',
      version: 1,
      sourceSelections: { pageUrls: [], assetIds: [], uncertainties: ['Confirm service area'] },
      draft: {
        strategy: 'Keep the redesign grounded in selected evidence.',
        proposedSitemap: [],
        pagePlans: [],
        assetGuidance: [],
        assumptions: [],
        openQuestions: ['Confirm service area'],
      },
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
    };
    const manifest = {
      id: 'manifest-layout-check',
      businessId,
      redesignBriefId: brief.id,
      researchPacketId: brief.researchPacketId,
      crawlRunId: brief.crawlRunId,
      schemaVersion: 1,
      builderContractVersion: 'siteforge-codex-builder-v1',
      status: 'ready',
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
      data: {
        source: {
          businessName: 'Demo Local Services',
          researchPacketId: brief.researchPacketId,
          crawlRunId: brief.crawlRunId,
          redesignBriefId: brief.id,
        },
        permittedFacts: [{ id: 'fact-1' }, { id: 'fact-2' }],
        selectedPages: [
          { url: 'https://example.com/', title: 'Home' },
          { url: 'https://example.com/services', title: 'Services' },
        ],
        selectedAssets: [{ artifactId: 'asset-1' }],
        approvedAssetGuidance: [],
        strategy: brief.draft.strategy,
        proposedSitemap: [],
        pagePlans: [],
        assumptions: [],
        openQuestions: brief.draft.openQuestions,
        uncertainties: brief.sourceSelections.uncertainties,
        builderRules: ['Use only permitted facts.', 'Keep the preview private.'],
      },
    };
    const transaction = database.transaction(['briefs', 'buildManifests'], 'readwrite');
    transaction.objectStore('briefs').put(brief);
    transaction.objectStore('buildManifests').put(manifest);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.goto('/#/prospects/business-demo-local-services/redesign');
  await expect(page.getByRole('heading', { name: 'Build Manifest ready' })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
}

test('uses the required viewport dimensions', async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  expect(viewport).toEqual(expectedViewports[testInfo.project.name]);
});

test('renders without unintended horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('keeps the AI usage page responsive and reachable from navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/#/usage');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'AI usage & spend' })).toBeVisible();
  await expect(page.getByText('No AI usage recorded yet')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer.getByRole('button', { name: 'AI usage' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('contains page content horizontally across workspace sections', async ({ page }) => {
  const sections = ['overview', 'research', 'assets', 'audit', 'brief', 'redesign', 'settings'];

  for (const section of sections) {
    await page.goto(`/#/prospects/business-demo-local-services/${section}`);
    await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('lays out asset selections as a responsive image grid', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<section class="asset-analysis-selection"><fieldset class="brief-assets">
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox"><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content">One</span></label>
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox"><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content">Two</span></label>
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox"><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content">Three</span></label>
      </fieldset></section>`,
    );
  });

  const items = page.locator('.asset-analysis-selection .brief-source-option');
  const [first, second] = await Promise.all([
    items.nth(0).boundingBox(),
    items.nth(1).boundingBox(),
  ]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  if (testInfo.project.name === 'mobile') {
    expect(second.y).toBeGreaterThan(first.y);
  } else {
    expect(Math.abs(second.y - first.y)).toBeLessThan(3);
  }
});

test('supports keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const activeTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(activeTag).not.toBe('BODY');
});

test('opens prospect settings from the header and restores focus when dismissed', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await page.goto('/#/prospects/business-demo-local-services/overview');

  const trigger = page.getByLabel('Open prospect settings');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Prospect settings' }).last()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('keeps the prospect identity controls in a full-width header container', async ({ page }) => {
  await page.goto('/#/prospects/business-demo-local-services/overview');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();

  const header = page.locator('.workspace-header');
  const identityRow = page.locator('.workspace-header__identity-row');
  const identity = identityRow.locator('.business-identity--title');
  const settings = page.getByLabel('Open prospect settings');
  const [headerBox, identityBox, businessBox, settingsBox] = await Promise.all([
    header.boundingBox(),
    identityRow.boundingBox(),
    identity.boundingBox(),
    settings.boundingBox(),
  ]);

  expect(headerBox).not.toBeNull();
  expect(identityBox).not.toBeNull();
  expect(businessBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(Math.abs(identityBox.width - headerBox.width)).toBeLessThanOrEqual(1);
  expect(settingsBox.x).toBeGreaterThan(businessBox.x);
  expect(Math.abs(settingsBox.y - businessBox.y)).toBeLessThanOrEqual(16);
});

test('transitions the workspace title from loading into navigation', async ({ page }) => {
  await page.goto('/');

  const loader = page.getByLabel('Loading SiteForge OS workspace');
  await expect(loader).toBeVisible();
  await expect(loader.locator('.workspace-loading__letters > span')).toHaveCount(12);
  await expect(loader).toHaveAttribute('data-phase', 'entering');
  await expect(loader).toBeHidden();
  await expect(page.locator('.brand--loading-hidden')).toHaveCount(0);
  await expect(page.locator('.brand').first()).toContainText('SiteForge OS');
});

test('positions the workspace loading title for each viewport', async ({ page }, testInfo) => {
  await page.goto('/');

  const title = page.locator('.workspace-loading__letters');
  const description = page.locator('.workspace-loading p');
  await expect(title).toBeVisible();
  await expect(description).toBeVisible();

  const [titleBox, descriptionBox, viewportHeight] = await Promise.all([
    title.boundingBox(),
    description.boundingBox(),
    page.evaluate(() => window.visualViewport?.height ?? window.innerHeight),
  ]);
  expect(titleBox).not.toBeNull();
  expect(descriptionBox).not.toBeNull();

  if (!titleBox || !descriptionBox) return;

  const titleCenter = titleBox.y + titleBox.height / 2;
  const expectedCenter =
    testInfo.project.name === 'mobile' ? viewportHeight / 2 - 48 : viewportHeight / 2;
  expect(Math.abs(titleCenter - expectedCenter)).toBeLessThanOrEqual(1);
  const descriptionGap = descriptionBox.y - (titleBox.y + titleBox.height);
  expect(descriptionGap).toBeGreaterThanOrEqual(24);
  expect(descriptionGap).toBeLessThanOrEqual(56);
});

test('gives the page a restrained elastic response at its scroll boundaries', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: -80 }));
  });
  await expect(page.locator('main')).toHaveAttribute('data-overscroll', 'top');

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: 80 }));
  });
  await expect(page.locator('main')).toHaveAttribute('data-overscroll', 'bottom');
});

test('uses a compact navigation drawer on mobile and tablet', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'This behavior is specific to compact layouts.');
  await page.goto('/');

  await expect(page.locator('.sidebar')).toBeHidden();
  const trigger = page.getByRole('button', { name: 'Open navigation menu' });
  const brand = page.locator('.mobile-header .brand');
  const [triggerBox, brandBox] = await Promise.all([trigger.boundingBox(), brand.boundingBox()]);
  expect(triggerBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(brandBox.x);

  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox).not.toBeNull();
  expect(drawerBox.width).toBeLessThan(353);
  const [todayBox, prospectsBox] = await Promise.all([
    drawer.getByRole('button', { name: 'Today' }).boundingBox(),
    drawer.getByRole('button', { name: 'Prospects' }).boundingBox(),
  ]);
  expect(todayBox).not.toBeNull();
  expect(prospectsBox).not.toBeNull();
  expect(Math.abs(prospectsBox.x - todayBox.x)).toBeLessThan(3);
  expect(prospectsBox.y).toBeGreaterThan(todayBox.y);

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await drawer.getByRole('button', { name: 'Prospects' }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Prospects' })).toBeVisible();
});

test('uses a persistent desktop sidebar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'This behavior is specific to the desktop shell.');
  await page.goto('/');

  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS('position', 'fixed');
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Today' }).first()).toBeVisible();

  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<div style="height: 1200px"></div>');
    window.scrollTo(0, 600);
  });
  await expect
    .poll(async () => {
      const box = await sidebar.boundingBox();
      return box?.y;
    })
    .toBe(0);
});

test('keeps the persistent sidebar beside content above the compact-navigation breakpoint', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'This behavior is covered by the desktop shell.');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();

  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeHidden();

  const [sidebar, main, today, prospects] = await Promise.all([
    page.locator('.sidebar').boundingBox(),
    page.locator('main').boundingBox(),
    page.getByRole('button', { name: 'Today' }).first().boundingBox(),
    page.getByRole('button', { name: 'Prospects' }).first().boundingBox(),
  ]);
  expect(sidebar).not.toBeNull();
  expect(main).not.toBeNull();
  expect(today).not.toBeNull();
  expect(prospects).not.toBeNull();
  expect(main.x).toBeGreaterThanOrEqual(sidebar.width);
  expect(Math.abs(prospects.x - today.x)).toBeLessThan(3);
  expect(prospects.y).toBeGreaterThan(today.y);
  await expect(page).toHaveScreenshot('desktop-sidebar-intermediate.png');

  await page.goto('/#/agent-studio');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  const testBox = await page.locator('.agent-studio__test').boundingBox();
  expect(testBox).not.toBeNull();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps the build manifest package separate from the Agent Studio test controls', async ({
  page,
}, testInfo) => {
  await openReadyBuildManifest(page);

  await expect(page.locator('.brief-panel')).toHaveScreenshot('build-manifest-ready.png');

  const manifestPackage = page.getByRole('button', { name: /approved and ready for the builder/i });
  const summaryItems = manifestPackage.locator('.build-manifest-summary > span');
  await expect(summaryItems).toHaveCount(4);
  const [firstItem, secondItem] = await Promise.all([
    summaryItems.nth(0).boundingBox(),
    summaryItems.nth(1).boundingBox(),
  ]);
  expect(firstItem).not.toBeNull();
  expect(secondItem).not.toBeNull();
  const studioAction = page.getByRole('button', { name: 'Open Agent Studio' });
  const prospectBuildAction = page.getByRole('button', {
    name: 'Build complete prospect website',
  });
  await expect(prospectBuildAction).toBeVisible();
  await expect(prospectBuildAction).toBeDisabled();
  const studioActionBox = await studioAction.boundingBox();
  expect(studioActionBox).not.toBeNull();
  if (!firstItem || !studioActionBox) return;
  expect(firstItem.y + firstItem.height).toBeLessThanOrEqual(studioActionBox.y);
  expect(Math.abs(secondItem.y - firstItem.y)).toBeLessThan(3);

  await manifestPackage.click();
  const dialog = page.getByRole('dialog', { name: 'Build Manifest ready' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Permitted facts remain tied');
  await expect(dialog).toContainText('Keep the preview private.');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(manifestPackage).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await studioAction.click();
  await expect(page).toHaveURL(/\/agent-studio\/refine\/business-demo-local-services$/);
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /prepared prospect demo local services/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Page to test')).toHaveValue('');
  await expect(page.getByLabel('Test agent package')).toHaveValue('agent-package-local-v4');
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build complete prospect website' })).toHaveCount(
    0,
  );
  await expect(page.getByText('it never changes the prospect’s public website')).toBeVisible();
  const inheritedBehaviour = page.getByText('Inherited package behaviour');
  await expect(inheritedBehaviour).toBeVisible();
  await expect(page.getByText('Built-in capability · motion runtime')).toBeHidden();
  await inheritedBehaviour.click();
  await expect(page.getByText('Built-in capability · motion runtime')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agent architecture' })).toBeVisible();
  await expect(page.getByText('Codex activity')).toHaveCount(0);
  await expect(page.getByText('Build diagnostics')).toHaveCount(0);
  const reviewInputs = page.getByRole('button', { name: 'Review prospect inputs' });
  await expect(reviewInputs).toHaveAttribute('title', 'Review prospect inputs');
  await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBe(44);
  await reviewInputs.hover();
  await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBeGreaterThan(44);
  await expect(reviewInputs.locator('.agent-studio__review-inputs-label')).toHaveCSS(
    'opacity',
    '1',
  );
  await page.mouse.move(0, 0);
  const studioActions = page.locator('.agent-studio__header-actions');
  const [settingsBox, statusBox] = await Promise.all([
    studioActions.getByRole('button', { name: 'Builder settings' }).boundingBox(),
    studioActions.locator('.status-badge').boundingBox(),
  ]);
  expect(settingsBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  if (!settingsBox || !statusBox) return;
  if (testInfo.project.name === 'mobile') {
    expect(settingsBox.y).toBeGreaterThan(statusBox.y + statusBox.height);
  } else {
    expect(
      Math.abs(settingsBox.y + settingsBox.height / 2 - (statusBox.y + statusBox.height / 2)),
    ).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('button', { name: 'About private test builds' })).toBeVisible();
  await expect(page.locator('.agent-studio')).toHaveScreenshot('agent-studio.png');
  await page.getByRole('button', { name: 'Add direction' }).click();
  await expect(page.getByRole('textbox', { name: 'Build direction 1' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Build direction 1' })
    .fill('Keep the homepage calm and focused.');
  await page.getByRole('button', { name: 'Add another' }).click();
  await expect(page.getByRole('textbox', { name: 'Build direction 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove direction 2' }).click();
  await expect(page.getByRole('textbox', { name: 'Build direction 2' })).toBeHidden();
  await page.getByLabel('Page to test').selectOption('https://example.com/services');
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeDisabled();
  await expect(
    page.getByText('Complete and review the homepage test before testing another selected page.'),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('separates test refinement from the published builder agent package', async ({ page }) => {
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await page.getByRole('button', { name: 'Agent architecture' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/agent\/business-demo-local-services$/);
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agent architecture' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { name: /Builder agent package/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'How a website build is assembled' }),
  ).toBeVisible();
  await expect(page.getByText('Built-in capabilities', { exact: true })).toBeVisible();
  await expect(page.getByText('Build direction', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Directions can propose a capability, not create one' }),
  ).toBeVisible();
  await expect(page.getByText('No unpublished package exists yet.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create a derived test package' })).toBeVisible();
  await expect(page.getByLabel(/Direction for a v5 test package/i)).toBeVisible();
  await expect(page.locator('.agent-package-config')).toHaveScreenshot(
    'agent-package-architecture.png',
  );

  await page.getByRole('button', { name: 'Agent policy Builder contract' }).click();
  const fileDialog = page.getByRole('dialog', { name: 'Builder contract' });
  await expect(fileDialog).toBeVisible();
  await expect(fileDialog.locator('pre')).toContainText('SiteForge Codex Builder Contract');
  await page.keyboard.press('Escape');
  await expect(fileDialog).toBeHidden();

  await page.getByRole('button', { name: 'Refine' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/refine\/business-demo-local-services$/);
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Builder agent package' })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('groups linked build records and offers one package deletion action in Data', async ({
  page,
}) => {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(['briefs', 'buildManifests'], 'readonly');
    const readComplete = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    const brief = await new Promise((resolve, reject) => {
      const request = transaction.objectStore('briefs').get('brief-manifest-layout-check');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const manifest = await new Promise((resolve, reject) => {
      const request = transaction.objectStore('buildManifests').get('manifest-layout-check');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await readComplete;
    const writeTransaction = database.transaction(['briefs', 'buildManifests'], 'readwrite');
    writeTransaction.objectStore('briefs').put({
      ...brief,
      id: 'brief-manifest-layout-check-v2',
      version: 2,
      updatedAt: new Date(Date.now() + 1_000).toISOString(),
    });
    writeTransaction.objectStore('buildManifests').put({
      ...manifest,
      id: 'manifest-layout-check-v2',
      redesignBriefId: 'brief-manifest-layout-check-v2',
    });
    await new Promise((resolve, reject) => {
      writeTransaction.oncomplete = resolve;
      writeTransaction.onerror = () => reject(writeTransaction.error);
      writeTransaction.onabort = () => reject(writeTransaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await page.goto('/#/data');

  const prospect = page.locator('.data-management__prospect').filter({
    hasText: 'Demo Local Services',
  });
  await expect(prospect).toContainText('2 brief versions');
  const buildPackage = prospect.locator('.data-management__version').filter({
    hasText: 'Build package · Brief v1',
  });
  await expect(buildPackage).toContainText('Brief v1 · approved');
  await expect(buildPackage).toContainText('Build Manifest · Version 1');
  await expect(buildPackage.getByRole('button', { name: 'Delete package' })).toBeVisible();
  await expect(prospect.locator('.data-management__version')).toHaveCount(2);
  await expect(prospect).toContainText('Build package · Brief v2');

  await buildPackage.getByRole('button', { name: 'Delete package' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete build package' });
  await expect(dialog).toContainText('including its brief, Build Manifest');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('opens the shared builder settings panel from the navigation settings page', async ({
  page,
}) => {
  await page.goto('/#/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Builder settings' }).click();
  const panel = page.getByRole('dialog', { name: 'Builder settings' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('gpt-5.6');
  await expect(panel).toContainText('Workspace write only');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Builder settings' })).toBeFocused();
});

test('opens builder settings from the Agent Studio header', async ({ page }) => {
  await openReadyBuildManifest(page);
  await page.getByRole('button', { name: 'Open Agent Studio' }).click();

  const studio = page.locator('.agent-studio');
  const settingsButton = studio.getByRole('button', { name: 'Builder settings' });
  await expect(settingsButton).toBeVisible();
  await settingsButton.click();
  const panel = page.getByRole('dialog', { name: 'Builder settings' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Private, expiring links');
});

test('switches appearance mode from navigation and persists the selection', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  const navigation =
    testInfo.project.name === 'desktop'
      ? page.locator('.sidebar')
      : await (async () => {
          await page.getByRole('button', { name: 'Open navigation menu' }).click();
          return page.getByRole('dialog', { name: 'Navigation' });
        })();
  const themeButton = navigation.getByRole('button', { name: 'Switch to dark mode' });

  await themeButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(navigation.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('renders workspace content with dark-mode surfaces', async ({ page }, testInfo) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('dark-palette-check.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await page.getByRole('tab', { name: 'Packet' }).click();

  const navigation =
    testInfo.project.name === 'desktop'
      ? page.locator('.sidebar')
      : await (async () => {
          await page.getByRole('button', { name: 'Open navigation menu' }).click();
          return page.getByRole('dialog', { name: 'Navigation' });
        })();
  await navigation.getByRole('button', { name: 'Switch to dark mode' }).click();
  if (testInfo.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Close navigation menu' }).click();
  }

  await expect(page).toHaveScreenshot('dark-workspace.png', { fullPage: true });
});

test('creates a persistent prospect workspace from a public URL', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('acme-plumbing.example');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('status')).toContainText('Prospect created');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCSS('animation-name', /(?:^|,\s*)toast-in(?:,|$)/);
  const toastBox = await page.locator('.toast-region').boundingBox();
  expect(toastBox).not.toBeNull();
  expect(toastBox.x).toBeGreaterThanOrEqual(12);
  await page.getByRole('button', { name: 'View prospect' }).click();
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(
    page.getByText('The website capture is queued for the protected worker'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Assets' }).click();
  await expect(page.getByRole('heading', { name: 'Asset review' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No captured assets' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(page).toHaveURL(/\/research$/);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Research' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByText('The website capture is queued for the protected worker'),
  ).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Research' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Overview' }).click();
  const task = page.getByLabel('Verify business identity, services, and contact details.');
  await task.check({ force: true });
  await expect(task).toBeChecked();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(task).toBeChecked();
});

test('queues one private website capture and keeps its state after reload', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('capture-foundation.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await page.getByRole('tab', { name: 'Research' }).click();

  const capturePanel = page.locator('.research-capture');
  const siteMap = page.locator('.captured-site-map');
  await expect(capturePanel).toContainText(
    'The website capture is queued for the protected worker',
  );
  await expect(siteMap).toHaveCount(0);
  await expect(
    capturePanel.getByRole('progressbar', { name: 'Website capture progress' }),
  ).toBeVisible();
  await expect(capturePanel.getByRole('button', { name: 'Capture queued' })).toBeDisabled();
  await expect(page.getByLabel('Refreshing website evidence')).toBeVisible();
  await expect(page.locator('.evidence-loading__fact')).toHaveCount(4);
  await expect(page.locator('.evidence-loading__screenshot')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(
    page.locator('.activity-row', {
      hasText:
        'Website capture requested. Discoverable public pages will remain private until a worker completes it.',
    }),
  ).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.reload();
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(capturePanel).toContainText(
    'The website capture is queued for the protected worker',
  );
  await expect(capturePanel.getByRole('button', { name: 'Capture queued' })).toBeDisabled();
});

test('cancels a queued website capture without hiding the workspace', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('cancel-capture.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await page.getByRole('tab', { name: 'Research' }).click();

  await expect(page.getByRole('button', { name: 'Cancel capture' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel capture' }).click();

  await expect(page.getByText('Capture cancelled')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capture website again' })).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps long prospect names inside the viewport', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
  }

  const longDomain = `${'verylong'.repeat(20)}.example`;
  const longName = `Verylong${'verylong'.repeat(19)}`;
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill(longDomain);
  await page.getByRole('button', { name: 'Create' }).click();

  const prospectName = page.locator('.prospect-row__identity strong', { hasText: longName });
  await expect(prospectName).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.getByRole('button', { name: 'View prospect' }).click();
  await expect(page.getByRole('heading', { name: longName })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps activity timestamps within their mobile and desktop rows', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('activity-date.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await page.getByRole('tab', { name: 'Activity' }).click();

  const row = page.locator('.activity-list .activity-row').first();
  const timestamp = row.locator('time');
  await expect(timestamp).toBeVisible();
  const [rowBox, timestampBox] = await Promise.all([row.boundingBox(), timestamp.boundingBox()]);
  expect(rowBox).not.toBeNull();
  expect(timestampBox).not.toBeNull();
  expect(timestampBox.x).toBeGreaterThanOrEqual(rowBox.x);
  expect(timestampBox.x + timestampBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width);
});

test('prevents duplicate prospect URLs and deletes a prospect after confirmation', async ({
  page,
}) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('duplicate-check.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await page.getByRole('button', { name: 'All prospects' }).click();

  await page.getByLabel('Public website URL').fill('https://duplicate-check.example/');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('alert')).toHaveText('You already have this website as a prospect.');
  await expect(
    page.locator('.prospect-row__identity strong', { hasText: 'Duplicate Check' }),
  ).toHaveCount(1);

  await page.getByRole('button', { name: 'Duplicate Check' }).click();
  await page.getByLabel('Open prospect settings').click();
  const settingsDialog = page.getByRole('dialog', { name: 'Prospect settings' });
  await expect(settingsDialog).toBeVisible();
  await settingsDialog.getByRole('button', { name: 'Delete prospect' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete this prospect?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete prospect' }).last().click();
  await expect(page.getByRole('heading', { name: 'Prospects' })).toBeVisible();
  await expect(
    page.locator('.prospect-row__identity strong', { hasText: 'Duplicate Check' }),
  ).toHaveCount(0);

  await page.reload();
  await expect(
    page.locator('.prospect-row__identity strong', { hasText: 'Duplicate Check' }),
  ).toHaveCount(0);
});

test('matches the approved visual baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading SiteForge OS workspace')).toBeHidden();
  await expect(page).toHaveScreenshot('siteforge-os.png', { fullPage: true });
});
