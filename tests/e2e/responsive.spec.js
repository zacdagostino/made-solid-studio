import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const expectedViewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const brandIntroRuntime = new URL('../../worker/builder-template/src/main.js', import.meta.url);
const mobileNavigationContract = new URL(
  '../../worker/builder-template/feature-contracts/mobile-navigation.md',
  import.meta.url,
);

async function mountBrandIntro(page) {
  await page.goto('/');
  await page.setContent(`
    <style>
      body { margin: 0; font: 16px system-ui, sans-serif; }
      header { display: flex; align-items: center; min-height: 72px; padding: 0 24px; background: white; }
      header img { width: 124px; height: 40px; }
      main { padding: 48px 24px; }
      .hero { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) minmax(120px, 0.65fr); align-items: center; }
      .hero figure { margin: 0; }
      .hero figure img { display: block; width: 100%; max-width: 260px; border-radius: 16px; }
    </style>
    <header><a href="#main" data-siteforge-brand-logo><img alt="Demo brand" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='124' height='40'%3E%3Crect width='124' height='40' rx='8' fill='%23155e75'/%3E%3Ctext x='16' y='26' fill='white' font-size='18'%3EDemo%3C/text%3E%3C/svg%3E"></a></header>
    <main id="main"><section class="hero"><div><h1>Private preview</h1><p>The preview remains available while the logo enters.</p></div><figure><img alt="Preview detail" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='160'%3E%3Crect width='260' height='160' rx='16' fill='%23e2e8f0'/%3E%3Ccircle cx='130' cy='80' r='42' fill='%23c2410c'/%3E%3C/svg%3E"></figure></section></main>
  `);
  await page.addScriptTag({ content: await readFile(brandIntroRuntime, 'utf8') });
}

async function mountResponsiveSidebar(page, { reducedMotion = true } = {}) {
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.setItem('siteforge-brand-intro', 'seen'));
  await page.setContent(`
    <style>
      :root { --color-brand: #0f766e; --color-primary: #0f766e; }
      body { margin: 0; color: #173344; background: #f7fbfa; font: 16px system-ui, sans-serif; }
      header { display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 0 24px; border-bottom: 1px solid #b6d8d3; background: #ffffff; }
      header > a { display: inline-flex; color: #0f766e; font-weight: 800; text-decoration: none; }
      header > a img { width: 124px; height: 40px; }
      header nav { display: flex; align-items: center; gap: 16px; margin-left: auto; }
      header nav a { color: #173344; font-weight: 700; text-decoration: none; }
      main { min-height: 200vh; padding: 48px 24px; }
    </style>
    <header><a href="#top" data-siteforge-brand-logo><img alt="Demo brand" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='124' height='40'%3E%3Crect width='124' height='40' rx='8' fill='%230f766e'/%3E%3Ctext x='16' y='26' fill='white' font-size='18'%3EDemo%3C/text%3E%3C/svg%3E"></a><nav aria-label="Primary navigation"><a href="#top">Home</a><a href="#services">Services</a><a href="#contact">Contact</a></nav></header>
    <main id="top"><h1>Private preview</h1><p id="services">A responsive navigation test.</p><p id="contact">Contact details.</p></main>
  `);
  await page.addScriptTag({ content: await readFile(brandIntroRuntime, 'utf8') });
}

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
  await expect(page.getByRole('heading', { name: 'Usage scope' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'View' })).toHaveValue('overview');
  await expect(page.getByRole('combobox', { name: 'Prospect' })).toHaveValue('all');
  await expect(page.getByRole('combobox', { name: 'Build' })).toBeDisabled();
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

test('centres the brand intro before carrying the logo into navigation', async ({
  page,
}, testInfo) => {
  await mountBrandIntro(page);

  const intro = page.locator('.sf-brand-intro');
  await expect(intro).toBeVisible();
  await expect(intro).toHaveClass(/is-entered/);
  await expect(intro).toHaveClass(/is-showcasing/);
  await expect(intro.locator('.sf-brand-intro__status')).toHaveText('Preparing your site');
  await expect(intro.locator('.sf-brand-intro__mark')).toBeVisible();
  const heroTitle = page.getByRole('heading', { name: 'Private preview' });
  const heroMedia = page.getByAltText('Preview detail');
  await expect(heroTitle).toHaveAttribute('data-sf-hero-copy', 'true');
  await expect(heroMedia).toHaveAttribute('data-sf-hero-media', 'true');
  await expect(heroTitle).not.toHaveClass(/is-visible/);
  await expect(heroMedia).not.toHaveClass(/is-visible/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.screenshot({ path: testInfo.outputPath(`brand-intro-${testInfo.project.name}.png`) });
  await expect(intro).toBeHidden({ timeout: 3_000 });
  await expect(page.locator('[data-siteforge-brand-logo] img')).toHaveCSS('opacity', '1');
  await expect(heroTitle).toHaveClass(/is-visible/);
  await expect(heroMedia).toHaveClass(/is-visible/);
  await page.screenshot({
    path: testInfo.outputPath(`hero-after-intro-${testInfo.project.name}.png`),
  });
});

test('skips the brand intro for reduced-motion users', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'This accessibility behavior is checked once.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountBrandIntro(page);
  await expect(page.locator('.sf-brand-intro')).toHaveCount(0);
  await expect(page.locator('[data-siteforge-brand-logo] img')).toHaveCSS('opacity', '1');
});

test('provides a collapsible sidebar menu on mobile and tablet', async ({ page }, testInfo) => {
  test.skip(true, 'Mobile navigation is now generated from the feature contract, not main.js.');
  await mountResponsiveSidebar(page);

  const sourceNavigation = page.locator('header nav');
  const trigger = page.getByRole('button', { name: 'Open navigation menu' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  if (testInfo.project.name === 'desktop') {
    await expect(trigger).toBeHidden();
    await expect(sourceNavigation).toBeVisible();
    return;
  }

  await expect(trigger).toBeVisible();
  await expect(sourceNavigation).toBeHidden();
  const [triggerBox, brandBox] = await Promise.all([
    trigger.boundingBox(),
    page.getByRole('link', { name: 'Demo brand' }).boundingBox(),
  ]);
  expect(triggerBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  if (!triggerBox || !brandBox) return;
  expect(triggerBox.x).toBeLessThanOrEqual(brandBox.x);
  await expect(page).toHaveScreenshot('responsive-sidebar-closed.png');

  await trigger.click();
  const sidebar = page.locator('.sf-sidebar');
  const sidebarPanel = page.getByRole('dialog', { name: 'Site navigation' });
  const close = sidebarPanel.getByRole('button', { name: 'Close navigation menu' });
  await expect(sidebarPanel).toBeVisible();
  await expect(sidebar).toHaveAttribute('data-side', 'left');
  await expect(sidebarPanel.locator('.sf-sidebar__brand img')).toBeVisible();
  const panelBox = await sidebarPanel.boundingBox();
  expect(panelBox).not.toBeNull();
  if (!panelBox) return;
  expect(panelBox.x).toBeLessThanOrEqual(1);
  await expect(close).toBeFocused();
  await expect(page).toHaveScreenshot('responsive-sidebar-open.png');
  await page.keyboard.press('Tab');
  await expect(sidebarPanel.getByRole('link', { name: 'Home' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sidebarPanel).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await sidebarPanel.getByRole('link', { name: 'Services' }).click();
  await expect(sidebarPanel).toBeHidden();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await trigger.click();
    await expect(sidebarPanel).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('hides the header after downward scrolling and restores it on any upward scroll', async ({
  page,
}, testInfo) => {
  test.skip(true, 'Mobile navigation is now generated from the feature contract, not main.js.');
  test.skip(
    testInfo.project.name !== 'desktop',
    'The runtime behavior is shared across breakpoints.',
  );
  await mountResponsiveSidebar(page, { reducedMotion: false });
  const header = page.locator('header');

  await expect(header).toHaveClass(/sf-scroll-header/);
  await page.evaluate(() => window.scrollTo(0, 280));
  await expect(header).toHaveClass(/is-hidden/);
  await page.evaluate(() => window.scrollTo(0, 276));
  await expect(header).not.toHaveClass(/is-hidden/);
});

test('resumes scroll hiding after the mobile sidebar closes', async ({ page }, testInfo) => {
  test.skip(true, 'Mobile navigation is now generated from the feature contract, not main.js.');
  test.skip(testInfo.project.name !== 'mobile', 'The drawer is a compact-navigation behavior.');
  await mountResponsiveSidebar(page, { reducedMotion: false });
  const header = page.locator('header');
  const trigger = page.getByRole('button', { name: 'Open navigation menu' });

  await trigger.click();
  const sidebarPanel = page.getByRole('dialog', { name: 'Site navigation' });
  await sidebarPanel.getByRole('button', { name: 'Close navigation menu' }).click();
  await expect(sidebarPanel).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 280));
  await expect(header).toHaveClass(/is-hidden/);
});

test('defines the generated mobile navigation contract with creative ownership', async () => {
  const contract = await readFile(mobileNavigationContract, 'utf8');
  expect(contract).toContain('Implement this feature in the generated page');
  expect(contract).toContain('Creative ownership');
  expect(contract).toContain('icon choreography');
  expect(contract).toContain('first link begins first');
  expect(contract).toContain('coherent, accessible colour relationship');
  expect(contract).toContain('overall colour coherence');
  expect(contract).toContain('Escape');
  expect(contract).toContain('320x568');
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

  const reflowsWithoutOverlap =
    second.y >= first.y + first.height - 1 || second.x >= first.x + first.width - 1;
  expect(reflowsWithoutOverlap).toBe(true);
  if (testInfo.project.name === 'mobile') {
    expect(second.x + second.width).toBeLessThanOrEqual(375);
  }
});

test('keeps transparent logo versions responsive while the SVG converter stays collapsed', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<main class="page-shell"><section class="brand-kit__logo-versions" aria-labelledby="logo-versions-test-title">
        <div><p class="eyebrow">Normal logo workflow</p><h3 id="logo-versions-test-title">High-fidelity logo versions</h3><p>Transparent logo versions.</p></div>
        <div class="brand-kit__alpha-matte"><button class="brand-kit__logo-version-preview" aria-label="Open saved alpha matte"><img alt="Saved black and white alpha matte" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='96'%3E%3Crect width='240' height='96' fill='white'/%3E%3Crect x='48' y='24' width='144' height='48' fill='black'/%3E%3C/svg%3E"></button><span><strong>Saved alpha matte</strong><small>Black is logo coverage; white is removed background.</small></span></div>
        <div class="brand-kit__logo-version-grid">
          <article class="brand-kit__logo-version"><button class="brand-kit__logo-version-preview" aria-label="Open Original colours"><img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='96'%3E%3Crect width='240' height='96' fill='%230f766e'/%3E%3C/svg%3E"></button><strong>Original colours</strong><span>Transparent PNG</span></article>
          <article class="brand-kit__logo-version"><button class="brand-kit__logo-version-preview" aria-label="Open Black"><img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='96'%3E%3Crect width='240' height='96' fill='%23000'/%3E%3C/svg%3E"></button><strong>Black</strong><span>Transparent PNG</span></article>
          <article class="brand-kit__logo-version"><button class="brand-kit__logo-version-preview" aria-label="Open White"><img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='96'%3E%3Crect width='240' height='96' fill='white'/%3E%3C/svg%3E"></button><strong>White</strong><span>Transparent PNG</span></article>
        </div>
        <div class="brand-kit__logo-version-actions">
          <div><button class="button" type="button">Push &amp; update build assets</button><p class="muted-copy">Approves these transparent logo versions and refreshes the Brand Kit, Brief, and Build Manifest in one step. The alpha matte is never included.</p></div>
          <button class="button" type="button">Refresh logo versions</button>
        </div>
      </section><details class="brand-kit__svg-beta"><summary>Experimental SVG converter <span class="brand-kit__beta-tag">Beta</span></summary><fieldset class="brand-kit__editable-logo"><legend>Editable SVG logo</legend></fieldset></details></main>`,
    );
  });

  const versions = page.locator('.brand-kit__logo-version');
  const beta = page.locator('.brand-kit__svg-beta');
  const alphaMatte = page.locator('.brand-kit__alpha-matte');
  const pushButton = page.getByRole('button', { name: 'Push & update build assets' });
  await expect(versions).toHaveCount(3);
  await expect(alphaMatte).toBeVisible();
  await expect(pushButton).toBeVisible();
  await expect(page.getByText('The alpha matte is never included.')).toBeVisible();
  await expect(beta).not.toHaveAttribute('open', '');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const [first, second] = await Promise.all([
    versions.nth(0).boundingBox(),
    versions.nth(1).boundingBox(),
  ]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  if (!first || !second) return;
  if (testInfo.project.name === 'mobile') {
    expect(second.y).toBeGreaterThan(first.y);
    const matteText = await alphaMatte.locator('span').boundingBox();
    const mattePreview = await alphaMatte.locator('button').boundingBox();
    expect(matteText?.y).toBeGreaterThan((mattePreview?.y ?? 0) + (mattePreview?.height ?? 0) - 1);
    const action = await pushButton.boundingBox();
    const actionGroup = await page.locator('.brand-kit__logo-version-actions').boundingBox();
    expect(action?.width).toBeGreaterThanOrEqual((actionGroup?.width ?? 0) - 1);
  } else {
    expect(Math.abs(second.y - first.y)).toBeLessThan(3);
  }

  await pushButton.focus();
  await expect(pushButton).toBeFocused();

  await beta.locator('summary').click();
  await expect(beta).toHaveAttribute('open', '');
  await expect(beta.locator('.brand-kit__editable-logo')).toBeVisible();
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
  await expect(identity.locator('.image-file-type')).toHaveCount(0);
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

  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v4');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const publishedPackage = JSON.parse(packageRecord.value);
    const now = new Date().toISOString();
    store.put({
      id: 'agent-package-v4',
      value: JSON.stringify([
        publishedPackage,
        {
          ...publishedPackage,
          id: 'agent-package-local-v5',
          version: 5,
          status: 'test_ready',
          basePackageId: publishedPackage.id,
          summary:
            'Derived v5 test package: verified brand-aware first-visit logo introduction with a safe header handoff.',
          capabilityAssessment: 'foundation_change_required',
          capabilityProposal:
            'The v5 foundation adds a local, dependency-free brand-introduction runtime and an automated quality check for the real header-logo target.',
          updatedAt: now,
          approvedAt: now,
          publishedAt: undefined,
        },
        {
          ...publishedPackage,
          id: 'agent-package-local-v6',
          version: 6,
          status: 'production_ready',
          basePackageId: publishedPackage.id,
          summary: 'A saved production draft that must not be reused as a test package.',
          capabilityAssessment: 'policy_only',
          updatedAt: now,
          approvedAt: now,
          publishedAt: undefined,
        },
      ]),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Build Manifest ready' })).toBeVisible();

  await studioAction.click();
  await expect(page).toHaveURL(/\/agent-studio\/refine\/business-demo-local-services$/);
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /prepared prospect demo local services/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Page to test')).toHaveValue('');
  await expect(page.getByLabel('Test agent package')).toHaveValue('agent-package-local-v5');
  expect(
    await page.getByLabel('Test agent package').locator('option').allTextContents(),
  ).not.toContain('v6 · Production draft');
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Create page from scratch' })).toBeChecked();
  await page.getByRole('radio', { name: 'Revise previous page' }).check();
  await expect(page.getByLabel('Previous built page')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revise private page' })).toBeDisabled();
  await expect(page.getByText('There are no completed private tests to revise yet.')).toBeVisible();
  await page.getByRole('radio', { name: 'Create page from scratch' }).check();
  await expect(page.getByLabel('Page to test')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build complete prospect website' })).toHaveCount(
    0,
  );
  await expect(
    page.getByText('It does not read, continue, or change an earlier private draft'),
  ).toBeVisible();
  const inheritedBehaviour = page.getByText('Inherited package behaviour');
  await expect(inheritedBehaviour).toBeVisible();
  await expect(page.getByText('Built-in capability · motion runtime')).toBeHidden();
  const testingBehaviour = page.locator('.builder-workflow__testing-behaviour');
  await expect(testingBehaviour).toBeVisible();
  await expect(testingBehaviour).toContainText('Testing behaviour');
  await expect(testingBehaviour).toContainText('Package v5 testing behaviour');
  await expect(testingBehaviour).toContainText('brand-introduction runtime');
  await expect(testingBehaviour).toContainText('Visible hero entrance after the logo handoff');
  await expect(testingBehaviour).toContainText('Mobile & tablet sidebar navigation');
  await expect(testingBehaviour).toContainText('Behaviour revision · v5.3');
  await expect(testingBehaviour).toContainText(
    'navigation is now generated from its Markdown feature contract',
  );
  await expect(testingBehaviour).toContainText(
    'Select behaviours to stage for the next production draft',
  );
  await expect(
    testingBehaviour.getByRole('checkbox', { name: 'Mobile & tablet sidebar navigation' }),
  ).not.toBeChecked();
  await expect(
    testingBehaviour.getByRole('button', { name: 'Stage selected for production draft' }),
  ).toBeVisible();
  await testingBehaviour
    .locator('article', { hasText: 'Visible hero entrance after the logo handoff' })
    .getByRole('button', { name: 'Workshop behaviour' })
    .click();
  const behaviourWorkshop = page.getByRole('dialog', {
    name: 'Entrance motion & factual counters',
  });
  await expect(behaviourWorkshop).toContainText('Foundation workshop');
  await expect(behaviourWorkshop.getByText('Workshoped', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    testingBehaviour
      .locator('article', { hasText: 'Mobile & tablet sidebar navigation' })
      .getByRole('button', { name: 'Workshop behaviour' }),
  ).toHaveCount(0);
  const testFeatureFiles = page.locator('.feature-implementation-files--compact');
  await expect(testFeatureFiles).not.toHaveAttribute('open', '');
  await testFeatureFiles.locator('summary').click();
  await expect(testFeatureFiles).toHaveAttribute('open', '');
  await expect(
    testFeatureFiles.getByRole('heading', { name: 'Files behind this test' }),
  ).toBeVisible();
  await expect(testFeatureFiles).toContainText('Brand introduction');
  await testFeatureFiles
    .getByRole('button', { name: 'Workshop JavaScript: Motion runtime' })
    .first()
    .click();
  const fileWorkshop = page.getByRole('dialog', { name: 'Entrance motion & factual counters' });
  await expect(fileWorkshop).toContainText('Foundation workshop');
  await page.keyboard.press('Escape');
  await testFeatureFiles
    .getByRole('button', { name: /worker\/builder-template\/src\/main\.js/i })
    .last()
    .click();
  const testFeatureDialog = page.getByRole('dialog', { name: 'Motion runtime' });
  await expect(testFeatureDialog.getByRole('button', { name: 'Full file' })).toBeVisible();
  await expect(testFeatureDialog.locator('.is-changed')).not.toHaveCount(0);
  await testFeatureDialog.getByRole('button', { name: 'Full file' }).click();
  await expect(testFeatureDialog.getByRole('button', { name: 'Excerpt' })).toBeVisible();
  await page.keyboard.press('Escape');
  await testFeatureFiles.locator('summary').click();
  await expect(testFeatureFiles).not.toHaveAttribute('open', '');
  await inheritedBehaviour.click();
  await expect(page.getByText('Built-in capability · motion runtime')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agent architecture' })).toBeVisible();
  await expect(page.getByText('Codex activity')).toHaveCount(0);
  await expect(page.getByText('Build diagnostics')).toHaveCount(0);
  const reviewInputs = page.getByRole('button', { name: 'Review prospect inputs' });
  const prospectPicker = page.locator('.agent-studio__prospect-picker');
  await expect(reviewInputs).toHaveAttribute('title', 'Review prospect inputs');
  await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBe(44);
  await reviewInputs.hover();
  if (testInfo.project.name === 'mobile') {
    const [pickerBox, reviewBox] = await Promise.all([
      prospectPicker.boundingBox(),
      reviewInputs.boundingBox(),
    ]);
    expect(pickerBox).not.toBeNull();
    expect(reviewBox).not.toBeNull();
    if (!pickerBox || !reviewBox) return;
    expect(reviewBox.x).toBeGreaterThan(pickerBox.x);
    expect(
      Math.abs(reviewBox.y + reviewBox.height - (pickerBox.y + pickerBox.height)),
    ).toBeLessThanOrEqual(1);
    await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBe(44);
    await expect(reviewInputs.locator('.agent-studio__review-inputs-label')).toHaveCSS(
      'opacity',
      '0',
    );
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBe(44);
    await page.setViewportSize({ width: 375, height: 812 });
  } else {
    await expect.poll(async () => (await reviewInputs.boundingBox())?.width).toBeGreaterThan(44);
    await expect(reviewInputs.locator('.agent-studio__review-inputs-label')).toHaveCSS(
      'opacity',
      '1',
    );
  }
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
  await inheritedBehaviour.click();
  await expect(page.locator('details.builder-workflow__motion')).not.toHaveAttribute('open', '');
  await expect(page.locator('.agent-studio')).toHaveScreenshot('agent-studio.png');
  const advancedDirections = page.locator('details.builder-workflow__directions');
  await expect(advancedDirections).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'Add direction' })).toBeHidden();
  await advancedDirections.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(advancedDirections).toHaveAttribute('open', '');
  await expect(
    page.getByText('Prefer a conversation with Codex for agent refinements.'),
  ).toBeVisible();
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
  const featureImplementation = page.locator('.feature-implementation-files').filter({
    has: page.getByRole('heading', { name: 'Built-in feature implementation' }),
  });
  await expect(featureImplementation).toContainText('Brand introduction');
  await expect(featureImplementation).toContainText('Scoped page refinement');
  const navigationFeature = featureImplementation.locator('article').filter({
    hasText: 'Mobile & tablet sidebar navigation',
  });
  await expect(navigationFeature.getByRole('button', { name: 'Workshop feature' })).toHaveCount(0);
  await navigationFeature
    .getByRole('button', {
      name: /worker\/builder-template\/feature-contracts\/mobile-navigation\.md/i,
    })
    .click();
  const navigationContractDialog = page.getByRole('dialog', { name: 'Mobile navigation contract' });
  await expect(navigationContractDialog).toContainText('Creative ownership');
  await expect(navigationContractDialog.locator('.is-changed')).not.toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(navigationContractDialog).toBeHidden();
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

  const brandFeature = featureImplementation.locator('article').filter({
    hasText: 'Brand introduction',
  });
  await brandFeature
    .getByRole('button', { name: /worker\/builder-template\/src\/main\.js/i })
    .click();
  const featureDialog = page.getByRole('dialog', { name: 'Motion runtime' });
  await expect(featureDialog.locator('.is-changed')).not.toHaveCount(0);
  await page.keyboard.press('Escape');

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
