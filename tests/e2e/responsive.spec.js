import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const expectedViewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const brandIntroRuntime = new URL(
  '../../worker/builder-template/src/components/foundation/site-runtime.tsx',
  import.meta.url,
);
const mobileNavigationContract = new URL(
  '../../worker/builder-template/feature-contracts/mobile-navigation.md',
  import.meta.url,
);
const studioStyles = new URL('../../src/styles.css', import.meta.url);
const studioApp = new URL('../../src/App.tsx', import.meta.url);

async function mockStudioPushNotifications(page) {
  await page.addInitScript(() => {
    let subscription = null;
    const createSubscription = () => ({
      endpoint: 'https://push.example.test/studio-phone',
      toJSON: () => ({
        endpoint: 'https://push.example.test/studio-phone',
        expirationTime: null,
        keys: { auth: 'auth', p256dh: 'p256dh' },
      }),
      unsubscribe: async () => {
        subscription = null;
        return true;
      },
    });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: async () => {
          window.Notification.permission = 'granted';
          return 'granted';
        },
      },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: async () => ({
          pushManager: {
            getSubscription: async () => subscription,
            subscribe: async () => {
              subscription = createSubscription();
              return subscription;
            },
          },
        }),
      },
    });
  });
}

async function mountPopulatedBuilderActivity(page) {
  const codexItems = Array.from(
    { length: 24 },
    (_, index) => `
      <li class="builder-new-activity${index === 0 ? ' is-new' : ''}">
        <strong>Codex</strong>
        <span>Saved a complete responsive build update for the selected services page ${index + 1}.</span>
        <time>12:${String(index).padStart(2, '0')}</time>
      </li>`,
  ).join('');
  const diagnosticItems = Array.from(
    { length: 32 },
    (_, index) => `
      <li class="builder-new-activity">
        <details>
          <summary>
            <span class="status-badge">completed</span>
            <span>
              <strong>Verified browser output for page ${index + 1}</strong>
              <small>responsive_browser - 1240 ms</small>
            </span>
            <time>12:${String(index).padStart(2, '0')}</time>
          </summary>
        </details>
      </li>`,
  ).join('');

  await page.goto('/');
  await page.setContent(`
    <main style="height: auto">
      <section aria-labelledby="builder-codex-stream-title">
        <details class="builder-codex-stream builder-evidence-disclosure" open>
          <summary class="builder-evidence-disclosure__summary">
            <span>
              <p class="eyebrow">Build conversation</p>
              <strong id="builder-codex-stream-title">Codex is working on this build</strong>
              <small>25 messages · separate from Studio chat</small>
            </span>
            <span class="builder-evidence-disclosure__aside">
              <span class="status-badge">Live</span>
              <span class="status-badge">Build only</span>
              <span aria-hidden="true">⌄</span>
            </span>
          </summary>
          <ol aria-label="Build conversation messages" aria-live="polite" aria-relevant="additions text" tabindex="0">
            <li class="builder-new-activity builder-conversation__message builder-conversation__message--user">
              <strong>You</strong>
              <div class="markdown-content"><p>Build a complete responsive website from the approved manifest.</p></div>
              <time>11:59</time>
            </li>
            ${codexItems}
          </ol>
        </details>
      </section>
      <details class="builder-diagnostics builder-evidence-disclosure" open>
        <summary class="builder-evidence-disclosure__summary">
          <span>
            <p class="eyebrow">Build diagnostics</p>
            <strong>Worker, terminal, and browser output</strong>
            <small>32 private entries</small>
          </span>
          <span class="builder-evidence-disclosure__aside"><span class="status-badge">Private</span><span aria-hidden="true">⌄</span></span>
        </summary>
        <ol>${diagnosticItems}</ol>
      </details>
    </main>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.addStyleTag({ content: '[hidden] { display: none !important; }' });
}

async function mountCompletedBuilderEvidence(page) {
  const evidence = [
    [
      'builder-diagnostics',
      'Build diagnostics',
      'Worker, terminal, and browser output',
      '12 private entries',
    ],
    [
      'builder-timeline',
      'Latest build timeline',
      'What the builder has completed',
      '8 saved updates',
    ],
    [
      'builder-quality',
      'Quality checks',
      'Generated preview review',
      '14 checks · review required',
    ],
    ['builder-screenshots', 'Responsive captures', 'Generated website', '3 screenshots'],
  ]
    .map(
      ([className, eyebrow, title, count]) => `
        <details class="${className} builder-evidence-disclosure">
          <summary class="builder-evidence-disclosure__summary">
            <span><p class="eyebrow">${eyebrow}</p><strong>${title}</strong><small>${count}</small></span>
            <span class="builder-evidence-disclosure__aside"><span aria-hidden="true">⌄</span></span>
          </summary>
          <div class="builder-evidence-test-content">Saved finished-build evidence</div>
        </details>`,
    )
    .join('');

  await page.goto('/');
  await page.setContent(`<main style="height: auto">${evidence}</main>`);
  await page.addStyleTag({ path: studioStyles.pathname });
}

async function mountLiveBuilderProgress(page) {
  const stages = [
    [
      'complete',
      'Prepare workspace',
      'Load the immutable manifest, captured content, and approved assets.',
    ],
    [
      'complete',
      'Generate website',
      'Create the routes, components, content, and responsive design system.',
    ],
    ['active', 'Compile preview', 'Format, lint, type-check, and compile the generated website.'],
    [
      'upcoming',
      'Verify website',
      'Check routes, interactions, accessibility, and browser behaviour.',
    ],
    [
      'upcoming',
      'Check viewports',
      'Run mobile, tablet, and desktop browser checks without storing screenshots.',
    ],
    [
      'upcoming',
      'Save private output',
      'Persist source, compiled files, logs, and quality results.',
    ],
  ]
    .map(
      ([state, label, detail], index) => `
        <li class="is-${state}">
          <span aria-hidden="true" class="builder-live-progress__stage-marker">${state === 'complete' ? '✓' : index + 1}</span>
          <span><strong>${label}</strong><small>${detail}</small><small class="builder-live-progress__stage-time">◷ ${state === 'complete' ? ['Took 18s', 'Took 21m 44s'][index] : state === 'active' ? '3m 16s so far' : 'Not started'}</small></span>
        </li>`,
    )
    .join('');

  await page.goto('/');
  await page.setContent(`
    <main style="height: auto">
      <section aria-labelledby="fixture-live-progress-title" aria-live="polite" class="builder-live-progress builder-live-progress--live">
        <header class="builder-live-progress__header">
          <div><p class="eyebrow">Live build progress</p><h4 id="fixture-live-progress-title">Compiling the private preview</h4></div>
          <span class="builder-live-progress__signal"><span aria-hidden="true" class="builder-live-progress__signal-dot"></span>Worker connected</span>
        </header>
        <div class="builder-live-progress__current">
          <span aria-hidden="true" class="builder-live-progress__spinner">◌</span>
          <div><strong>Compiling the generated website into a private preview.</strong><p>Next: Verify website.</p></div>
        </div>
        <dl class="builder-live-progress__facts">
          <div><dt>Working time</dt><dd>25m 18s</dd></div>
          <div><dt>Worker signal</dt><dd>Just now</dd></div>
          <div><dt>Build attempt</dt><dd>Attempt 1</dd></div>
          <div><dt>Saved activity</dt><dd>275 updates</dd></div>
        </dl>
        <ol aria-label="Build stages" class="builder-live-progress__stages">${stages}</ol>
        <footer class="builder-live-progress__latest">
          <span>Latest saved activity</span>
          <strong>Next.js compiled all 49 routes successfully.</strong>
          <time title="7 August 2026 at 10:38 am">Just now</time>
        </footer>
      </section>
    </main>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
}

async function mountUsageTestAnalysis(page) {
  await page.goto('/');
  await page.setContent(`
    <main style="height: auto">
      <section class="usage-page" aria-labelledby="fixture-usage-title">
        <header class="page-header">
          <div>
            <p class="eyebrow">Operations finance</p>
            <h1 id="fixture-usage-title">AI usage &amp; spend</h1>
            <p>Open any test to understand its token use, build scope, version lineage, and worker evidence.</p>
          </div>
        </header>
        <section class="usage-panel" aria-labelledby="fixture-builds-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Builds</p>
              <h2 id="fixture-builds-title">Codex build usage</h2>
            </div>
          </div>
          <div class="usage-build-list">
            <article class="usage-build">
              <button aria-controls="fixture-analysis-22" aria-expanded="false" class="button button--quiet usage-build__trigger" type="button">
                <span class="usage-build__identity">
                  <span><strong>Test 22 · Homepage test</strong><small>Lecegroup</small></span>
                  <span class="status-badge status-badge--warning">Quality review required</span>
                </span>
                <span class="usage-build__summary">
                  <span><small>Total tokens</small><strong>398.8K</strong></span>
                  <span><small>Fresh / cached input</small><strong>56.9K / 330.8K</strong></span>
                  <span><small>Codex passes</small><strong>1</strong></span>
                  <span><small>Spend</small><strong>$0.78</strong></span>
                </span>
                <span class="usage-build__open-label">Open analysis <span aria-hidden="true">⌄</span></span>
              </button>
              <div class="usage-build__content" id="fixture-analysis-22" hidden>
                <div class="usage-build-analysis">
                  <section class="usage-build-analysis__section">
                    <div class="usage-build-analysis__heading">
                      <div><p class="eyebrow">Token composition</p><h3>What the total contains</h3></div>
                      <span>1 model pass</span>
                    </div>
                    <div aria-label="56.9K fresh input, 330.8K cached input, and 11.1K output tokens" class="usage-token-bar" role="img">
                      <span class="usage-token-bar__fresh" style="width: 14.3%"></span>
                      <span class="usage-token-bar__cached" style="width: 82.9%"></span>
                      <span class="usage-token-bar__output" style="width: 2.8%"></span>
                    </div>
                    <dl class="usage-token-breakdown">
                      <div><dt><span class="usage-token-key usage-token-key--fresh"></span>Fresh input</dt><dd>56.9K</dd></div>
                      <div><dt><span class="usage-token-key usage-token-key--cached"></span>Cached input</dt><dd>330.8K · 85% of input</dd></div>
                      <div><dt><span class="usage-token-key usage-token-key--output"></span>Model output</dt><dd>11.1K</dd></div>
                      <div><dt>Reasoning subset</dt><dd>0</dd></div>
                    </dl>
                  </section>
                  <section class="usage-build-analysis__section">
                    <div class="usage-build-analysis__heading">
                      <div><p class="eyebrow">Interpretation</p><h3>What likely drove usage</h3></div>
                    </div>
                    <ul class="usage-findings">
                      <li class="usage-finding usage-finding--success"><strong>One Codex pass</strong><p>This run did not multiply usage through a full model restart.</p></li>
                      <li class="usage-finding usage-finding--success"><strong>76% of unrelated manifest context removed</strong><p>344 KB was projected to 82.6 KB for one route before the agent ran.</p></li>
                      <li class="usage-finding usage-finding--neutral"><strong>No post-Codex continuation recorded</strong><p>Safe handoff failures can reuse validated saved source.</p></li>
                      <li class="usage-finding usage-finding--neutral"><strong>85% of input was cached</strong><p>Most input was reused context rather than newly supplied text.</p></li>
                      <li class="usage-finding usage-finding--warning"><strong>Context-heavy, not output-heavy</strong><p>Only 3% of recorded tokens were model output.</p></li>
                    </ul>
                  </section>
                  <section class="usage-build-analysis__section">
                    <div class="usage-build-analysis__heading">
                      <div><p class="eyebrow">Build context</p><h3>Scope and version lineage</h3></div>
                    </div>
                    <dl class="usage-context-grid">
                      <div><dt>Test scope</dt><dd>Homepage test</dd></div>
                      <div><dt>Selected routes</dt><dd>1</dd></div>
                      <div><dt>Stored immutable manifest</dt><dd>344 KB</dd></div>
                      <div><dt>Staged agent manifest</dt><dd>82.6 KB</dd></div>
                      <div><dt>Context reduction</dt><dd>76%</dd></div>
                      <div><dt>Staged assets</dt><dd>18</dd></div>
                      <div><dt>Agent package</dt><dd>v5.0 · superseded</dd></div>
                      <div><dt>Package contract</dt><dd>made-solid-studio-builder-agent-v5</dd></div>
                      <div><dt>Manifest contract</dt><dd>made-solid-studio-codex-builder-v8</dd></div>
                      <div><dt>Foundation</dt><dd>made-solid-studio-static-builder-v1</dd></div>
                      <div><dt>Parent checkpoint</dt><dd>Clean foundation build</dd></div>
                    </dl>
                    <div class="usage-context-projection">
                      <div class="usage-context-projection__heading">
                        <div><h4>What the agent actually received</h4><p>The immutable record stays complete. Narrow tests receive a route-scoped working copy so unrelated pages and assets do not consume the model window.</p></div>
                        <strong>76% smaller</strong>
                      </div>
                      <div aria-label="82.6 KB staged from 344 KB" class="usage-context-projection__bar" role="img"><span style="width: 24%"></span></div>
                      <div class="usage-context-contracts">
                        <span>Loaded contracts</span>
                        <ul><li>component architecture</li><li>mobile navigation</li><li>contextual logo selection</li></ul>
                      </div>
                      <div class="usage-context-sections">
                        <span>Route-scoped sections</span>
                        <ul>
                          <li><span>approvedAssetGuidance</span><strong>111 → 16</strong></li>
                          <li><span>permittedFacts</span><strong>227 → 31</strong></li>
                          <li><span>selectedAssets</span><strong>134 → 18</strong></li>
                        </ul>
                      </div>
                    </div>
                    <div class="usage-manifest-sections">
                      <h4>Largest manifest sections</h4>
                      <ol>
                        <li><span>approvedAssetGuidance · 111 items</span><strong>124 KB</strong></li>
                        <li><span>permittedFacts · 227 items</span><strong>79.8 KB</strong></li>
                        <li><span>selectedAssets · 134 items</span><strong>50.8 KB</strong></li>
                      </ol>
                    </div>
                  </section>
                  <section class="usage-build-analysis__section">
                    <div class="usage-build-analysis__heading">
                      <div><p class="eyebrow">Worker evidence</p><h3>Retry and diagnostic signals</h3></div>
                    </div>
                    <p class="muted-copy">No retry, restart, or worker-error signal was saved for this test.</p>
                  </section>
                  <div class="usage-build-analysis__actions">
                    <button class="button button--secondary" type="button">Open build workspace ↗</button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.locator('.usage-build__trigger').evaluate((trigger) => {
    trigger.addEventListener('click', () => {
      const content = document.getElementById('fixture-analysis-22');
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(open));
      trigger.closest('.usage-build')?.classList.toggle('is-open', open);
      trigger.querySelector('.usage-build__open-label').firstChild.textContent = open
        ? 'Close analysis '
        : 'Open analysis ';
      content.hidden = !open;
    });
  });
}

async function mountAgentPackageDialog(page) {
  await page.goto('/');
  await page.setContent(`
    <main style="height: auto">
      <article class="test-build-version">
        <strong>Test 22</strong>
        <button aria-haspopup="dialog" class="button button--inline" id="package-trigger" type="button">Package v5.0</button>
      </article>
      <div class="confirmation-overlay" id="package-overlay" hidden></div>
      <section aria-describedby="package-description" aria-labelledby="package-title" class="agent-package-detail-dialog" id="package-dialog" role="dialog" tabindex="-1" hidden>
        <header class="agent-package-detail-dialog__header">
          <div><p class="eyebrow">Immutable test package</p><h2 id="package-title">Build package v5.0</h2></div>
          <button aria-label="Close package details" class="button icon-button" id="package-close" type="button">×</button>
        </header>
        <p class="muted-copy" id="package-description">The package and foundation pinned to this exact test run. Package versions and manifest contract versions have separate release histories.</p>
        <div class="agent-package-detail-dialog__summary"><span class="status-badge">superseded</span><p>The complete package configuration used by Test 22.</p></div>
        <dl class="agent-package-detail-grid">
          <div><dt>Package version</dt><dd>v5.0</dd></div>
          <div><dt>Package ID</dt><dd>8a71d8f6-1928-47bd-b26c-21aca4489320</dd></div>
          <div><dt>Based on</dt><dd>Package v4.0</dd></div>
          <div><dt>Builder contract</dt><dd>made-solid-studio-builder-agent-v5.0</dd></div>
          <div><dt>Builder foundation</dt><dd>made-solid-studio-static-builder-v1</dd></div>
          <div><dt>Run template</dt><dd>siteforge-static-builder-v1</dd></div>
          <div><dt>Capability assessment</dt><dd>approved</dd></div>
          <div><dt>Created</dt><dd>28 July 2026, 10:46</dd></div>
        </dl>
        <section class="agent-package-detail-dialog__section">
          <h3>Included behaviours</h3>
          <ul class="agent-package-detail-dialog__behaviours">
            <li><span aria-hidden="true">✓</span><span>Next.js generated component architecture</span><code>next-component-architecture</code></li>
            <li><span aria-hidden="true">✓</span><span>Framework and responsive quality gates</span><code>framework-quality-gates</code></li>
          </ul>
        </section>
        <section class="agent-package-detail-dialog__section"><h3>Contract addendum</h3><pre>No package-specific contract addendum.</pre></section>
      </section>
    </main>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.addStyleTag({ content: '[hidden] { display: none !important; }' });
  await page.evaluate(() => {
    const trigger = document.getElementById('package-trigger');
    const dialog = document.getElementById('package-dialog');
    const overlay = document.getElementById('package-overlay');
    const close = document.getElementById('package-close');
    const setOpen = (open) => {
      dialog.hidden = !open;
      overlay.hidden = !open;
      if (open) dialog.focus();
      else trigger.focus();
    };
    trigger.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dialog.hidden) setOpen(false);
    });
  });
}

async function mountBuilderFileExplorer(page) {
  await page.goto('/');
  await page.setContent(`
    <div aria-describedby="file-explorer-description" aria-labelledby="file-explorer-title" class="builder-file-explorer-dialog" role="dialog">
      <div class="builder-file-preview-dialog__header">
        <div>
          <p class="eyebrow">Private build workspace</p>
          <h2 id="file-explorer-title">Generated files</h2>
        </div>
        <button aria-label="Close generated files" class="button icon-button" type="button">×</button>
      </div>
      <p class="muted-copy" id="file-explorer-description">Source is the editable Next.js project. Compiled site contains the browser-ready files produced from that source. Local-workspace downloads also contain approved assets, an agent refinement ledger, and the Studio learning-bundle tools.</p>
      <div class="builder-file-explorer">
        <div class="builder-file-explorer__toolbar">
          <div aria-label="Build file collection" class="builder-file-explorer__tabs" role="tablist">
            <button aria-selected="true" class="button button--segmented" role="tab" type="button">Source <span>18</span></button>
            <button aria-selected="false" class="button button--segmented" role="tab" type="button">Compiled site <span>32</span></button>
          </div>
          <div class="button-group">
            <button class="button button--primary" type="button"><span aria-hidden="true">↗</span> Preview website</button>
            <a class="button button--secondary builder-file-explorer__download" href="#download"><span aria-hidden="true">↓</span> Download local workspace</a>
          </div>
        </div>
        <label class="builder-file-explorer__search">
          <span>Search source files</span>
          <span><span aria-hidden="true">⌕</span><input autocomplete="off" placeholder="Search folders and files" type="search"></span>
        </label>
        <div class="builder-file-explorer__workspace">
          <nav aria-label="Generated source files" class="builder-file-explorer__tree">
            <div class="builder-file-explorer__branch">
              <details class="builder-file-explorer__folder" open>
                <summary><span aria-hidden="true">▸</span><span>src</span><small>12</small></summary>
                <div class="builder-file-explorer__branch">
                  <details class="builder-file-explorer__folder" open>
                    <summary><span aria-hidden="true">▸</span><span>app</span><small>4</small></summary>
                    <div class="builder-file-explorer__branch">
                      <button aria-current="true" class="button button--tree is-selected" type="button"><span aria-hidden="true">◇</span><span>page.tsx</span></button>
                      <button class="button button--tree" type="button"><span aria-hidden="true">◇</span><span>layout.tsx</span></button>
                      <button class="button button--tree" type="button"><span aria-hidden="true">◇</span><span>globals.css</span></button>
                    </div>
                  </details>
                  <details class="builder-file-explorer__folder">
                    <summary><span aria-hidden="true">▸</span><span>components</span><small>8</small></summary>
                    <div class="builder-file-explorer__branch">
                      <button class="button button--tree" type="button"><span aria-hidden="true">◇</span><span>site-header.tsx</span></button>
                    </div>
                  </details>
                </div>
              </details>
              <button class="button button--tree" type="button"><span aria-hidden="true">◇</span><span>package.json</span></button>
              <button class="button button--tree" type="button"><span aria-hidden="true">◇</span><span>next.config.ts</span></button>
            </div>
          </nav>
          <section aria-label="Selected build file" class="builder-file-explorer__preview">
            <header>
              <div>
                <p class="eyebrow">Project source</p>
                <h3>page.tsx</h3>
                <p>src/app/page.tsx</p>
              </div>
              <a aria-label="Open page.tsx" class="button button--quiet" href="#open"><span aria-hidden="true">↗</span> Open file</a>
            </header>
            <pre class="builder-file-preview-dialog__source" tabindex="0">import { SiteHeader } from "../components/site-header";

export default function HomePage() {
  return (
    &lt;main&gt;
      &lt;SiteHeader /&gt;
      &lt;h1&gt;Built for a better first impression.&lt;/h1&gt;
    &lt;/main&gt;
  );
}</pre>
          </section>
        </div>
      </div>
    </div>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.locator('[role="tab"]').evaluateAll((tabs) => {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((candidate) =>
          candidate.setAttribute('aria-selected', String(candidate === tab)),
        );
      });
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const nextTab = tabs.find((candidate) => candidate !== tab);
        nextTab?.click();
        nextTab?.focus();
      });
    });
  });
}

async function mountLocalDevelopmentPublication(page) {
  await page.goto('/');
  await page.setContent(`
    <div class="workspace-content-stack">
      <section class="card workspace-panel local-development" data-testid="local-development-publication">
        <div class="local-development__header">
          <div>
            <p class="eyebrow">Editable workspace</p>
            <h2>Work in a local prospect workspace</h2>
            <p class="muted-copy">Keep each editable prospect repository in this Studio Codespace under an ignored local directory, with approved assets, build origin, and refinement history intact.</p>
          </div>
          <span class="status-badge status-badge--success">Ready to export</span>
        </div>
        <section class="local-development__ready" aria-labelledby="local-workspace-ready">
          <span aria-hidden="true">▣</span>
          <div>
            <h3 id="local-workspace-ready">Editable source is ready</h3>
            <p>Build f906bbf7 can become a separate private workspace with editable source, approved assets, setup notes, and the Made Solid refinement ledger.</p>
            <p class="local-development__quality-note">Quality review still has findings. That does not block private development, but it still blocks client publishing.</p>
            <button aria-label="Open local prospect workspace" class="button button--primary" type="button">Open local workspace</button>
            <section class="local-refinement-ledger" aria-labelledby="local-refinement-ledger-title">
              <header>
                <div><span class="local-refinement-ledger__icon" aria-hidden="true">✓</span><div><h4 id="local-refinement-ledger-title">Refinement ledger</h4><p>Open the local workspace to start its live refinement ledger.</p></div></div>
                <span class="local-refinement-ledger__live"><span aria-hidden="true"></span>Live</span>
              </header>
              <div class="local-refinement-ledger__state" role="status"><span aria-hidden="true">◷</span>Entries appear here automatically after Codex records a verified change.</div>
            </section>
            <details class="local-development__manual">
              <summary>Manual command fallback</summary>
              <p>Use this only if the local workspace service cannot run the setup automatically.</p>
              <div class="local-development__command">
                <code>npm run export:local-build -- --run f906bbf7-a333-4bfa-bcfb-f667e7f1259b --destination prospect-workspaces/lecegroup</code>
                <button aria-label="Copy local workspace command" class="button button--secondary button--small" type="button">Copy command</button>
              </div>
            </details>
          </div>
        </section>
        <form class="local-development__form">
          <div class="local-development__form-heading">
            <span aria-hidden="true">◉</span>
            <div><h3>Create the private editing workspace</h3><p>Studio has filled in the destination. One click creates the separate private repository and pushes the complete editable handoff.</p></div>
          </div>
          <p class="local-development__target">Private destination: <strong>zacdagostino/lecegroup</strong></p>
          <details class="local-development__destination-settings">
            <summary>Change GitHub destination</summary>
            <div class="local-development__fields">
              <label><span>GitHub account or organization</span><input value="zacdagostino"></label>
              <label><span>Repository name</span><input value="lecegroup"></label>
              <label class="local-development__description"><span>Description (optional)</span><input value="Lecegroup website development"></label>
            </div>
          </details>
          <p class="local-development__privacy"><span aria-hidden="true">◇</span>Private only. Studio never exposes the GitHub token to this browser, never creates a public repository, and never changes the Made Solid Studio repository from this action.</p>
          <button class="button button--primary" type="submit">Create editable workspace</button>
        </form>
      </section>
    </div>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.addStyleTag({ content: 'body { height: auto; overflow: auto; }' });
}

async function mountEditableWorkspaceCreation(page) {
  const stages = [
    [
      'complete',
      'Connect the protected worker',
      'Reserve this request without exposing GitHub credentials to the browser.',
    ],
    [
      'complete',
      'Assemble the editable source',
      'Load the finished source, approved assets, setup notes, and refinement history.',
    ],
    [
      'complete',
      'Prepare a clean Git history',
      'Verify the project, add its agent instructions, and create the initial main commit.',
    ],
    [
      'current',
      'Create the private repository',
      'Create the named GitHub repository with public access disabled.',
    ],
    [
      'upcoming',
      'Push the complete handoff',
      'Send the editable source and confirm the main branch is available for development.',
    ],
  ]
    .map(
      ([state, label, detail], index) => `
        <li class="is-${state}">
          <span class="local-development__progress-marker" aria-hidden="true">${state === 'complete' ? '✓' : state === 'current' ? '◌' : index + 1}</span>
          <span><strong>${label}</strong><small>${detail}</small></span>
          <span class="status-badge status-badge--${state === 'complete' ? 'success' : state === 'current' ? 'warning' : 'neutral'}">${state}</span>
        </li>`,
    )
    .join('');

  await page.goto('/');
  await page.setContent(`
    <main style="height: auto">
      <section class="card workspace-panel local-development" data-testid="editable-workspace-creation">
        <div class="local-development__header">
          <div><p class="eyebrow">Editable workspace</p><h2>Work in a local prospect workspace</h2></div>
          <span class="status-badge status-badge--warning">running</span>
        </div>
        <section class="local-development__progress" aria-labelledby="editable-workspace-progress-title" aria-live="polite">
          <div class="local-development__progress-header">
            <span class="local-development__progress-icon" aria-hidden="true">◌</span>
            <div>
              <p class="eyebrow">Creating editable workspace</p>
              <h3 id="editable-workspace-progress-title">Preparing zacdagostino/lecegroup</h3>
              <p>Studio is turning the finished website into a separate private development repository. You can leave this page; persisted status will still be here when you return.</p>
            </div>
          </div>
          <div class="indeterminate-progress" role="status">
            <div aria-label="creating private repository" aria-valuetext="Creating the private GitHub repository zacdagostino/lecegroup." class="indeterminate-progress__track" role="progressbar"><span class="indeterminate-progress__bar"></span></div>
            <span>Creating the private GitHub repository zacdagostino/lecegroup.</span>
          </div>
          <ol class="local-development__progress-stages" aria-label="Workspace creation stages">${stages}</ol>
          <dl class="local-development__progress-facts">
            <div><dt>Destination</dt><dd>zacdagostino/lecegroup</dd></div>
            <div><dt>Visibility</dt><dd>Private only</dd></div>
            <div><dt>Source build</dt><dd>f906bbf7</dd></div>
            <div><dt>Files and setup items</dt><dd>124 of 126 prepared</dd></div>
          </dl>
          <p class="local-development__progress-note"><span aria-hidden="true">◇</span>The protected worker performs these steps server-side. It will not alter the Made Solid Studio repository, publish the website, or make the client repository public.</p>
          <button class="button button--secondary" type="button">Cancel workspace creation</button>
        </section>
      </section>
    </main>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.addStyleTag({ content: 'body { height: auto; overflow: auto; }' });
}

async function mountReadyEditableWorkspace(page) {
  await page.goto('/');
  await page.setContent(`
    <div class="workspace-content-stack">
      <section class="card workspace-panel local-development" data-testid="editable-workspace-ready">
        <div class="local-development__header">
          <div>
            <p class="eyebrow">Editable workspace</p>
            <h2>Work in a local prospect workspace</h2>
            <p class="muted-copy">The private client repository is stored in an ignored directory inside this Studio Codespace.</p>
          </div>
          <span class="status-badge status-badge--success">Repository ready</span>
        </div>
        <section class="local-development__ready" aria-labelledby="local-workspace-ready">
          <span aria-hidden="true">◉</span>
          <div>
            <h3 id="local-workspace-ready">Editable source is ready</h3>
            <p>Build f906bbf7 can become a private repository and a local folder inside <code>prospect-workspaces</code>, with its Made Solid refinement ledger.</p>
            <div class="button-group local-development__repository-actions">
              <button aria-label="Open local prospect workspace" class="button button--primary" type="button">Open local workspace</button>
            </div>
            <div class="local-workspace-setup local-workspace-setup--complete" hidden role="status" aria-live="polite">
              <strong class="local-workspace-setup__detail"></strong>
              <ol aria-label="Local workspace setup stages">
                ${[
                  'Check private GitHub access',
                  'Clone or safely update the repository',
                  'Verify refinement logging',
                  'Prepare website dependencies',
                  'Launch the website server',
                  'Open the website preview',
                ]
                  .map(
                    (label, index) =>
                      `<li class="${index === 0 ? 'is-current' : 'is-upcoming'}"><span aria-hidden="true">${index + 1}</span><span>${label}</span></li>`,
                  )
                  .join('')}
              </ol>
            </div>
            <section class="local-refinement-ledger" aria-labelledby="local-refinement-ledger-title">
              <header>
                <div><span class="local-refinement-ledger__icon" aria-hidden="true">✓</span><div><h4 id="local-refinement-ledger-title">Refinement ledger</h4><p>1 verified refinement recorded.</p></div></div>
                <span class="local-refinement-ledger__live"><span aria-hidden="true"></span>Live</span>
              </header>
              <div aria-live="polite" aria-relevant="additions text">
                <ol class="local-refinement-ledger__entries">
                  <li>
                    <div class="local-refinement-ledger__entry-heading"><strong>Resources appear immediately</strong><time datetime="2026-08-10T14:00:00.000Z">Aug 10, 02:00 PM</time></div>
                    <p><span>Problem</span>The resource library left a large blank area below the hero.</p>
                    <p><span>Fix</span>Kept the complete resource collection visible without a section-sized reveal delay.</p>
                    <div class="local-refinement-ledger__entry-meta"><span>project specific</span><span>/news/</span><span>375x812 · 768x1024 · 1440x900</span></div>
                  </li>
                </ol>
              </div>
            </section>
            <details class="local-development__manual">
              <summary>Manual command fallback</summary>
              <p>Use this only if the local workspace service cannot run the setup automatically.</p>
              <div class="local-development__command">
                <code>npm run workspace:open -- --repository made-solid-studio/lece-electrical-website</code>
                <button aria-label="Copy local workspace command" class="button button--secondary button--small" type="button">Copy command</button>
              </div>
            </details>
          </div>
        </section>
        <section class="local-development__repository" aria-labelledby="github-repository-ready">
          <span aria-hidden="true">◉</span>
          <div>
            <h3 id="github-repository-ready">Local prospect workspace</h3>
            <p><strong>made-solid-studio/lece-electrical-website</strong> is ready on <code>main</code>.</p>
            <p class="local-development__separation-note">Use <code>prospect-workspaces/lece-electrical-website</code> inside this Codespace.</p>
            <div class="button-group local-development__repository-actions">
              <a class="button button--secondary" href="https://github.com/made-solid-studio/lece-electrical-website">Open GitHub repository</a>
            </div>
          </div>
        </section>
      </section>
    </div>
  `);
  await page.addStyleTag({ path: studioStyles.pathname });
  await page.addStyleTag({ content: 'body { height: auto; overflow: auto; }' });
  await page.getByRole('button', { name: 'Open local prospect workspace' }).evaluate((button) => {
    button.addEventListener('click', async () => {
      button.setAttribute('disabled', '');
      button.textContent = 'Preparing local workspace';
      const setup = document.querySelector('.local-workspace-setup');
      const detail = document.querySelector('.local-workspace-setup__detail');
      if (setup instanceof HTMLElement) setup.hidden = false;
      if (detail) detail.textContent = 'Connecting to the local Studio workspace service.';
      const response = await fetch('/__made-solid/local-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: 'made-solid-studio/lece-electrical-website',
        }),
      });
      const events = (await response.text())
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line));
      const finalEvent = events.at(-1);
      if (detail) detail.textContent = finalEvent.detail;
      setup?.querySelectorAll('li').forEach((item) => {
        item.className = 'is-complete';
        const marker = item.firstElementChild;
        if (marker) marker.textContent = '✓';
      });
      if (finalEvent.previewUrl) {
        const previewLink = document.createElement('a');
        previewLink.className = 'button button--secondary';
        previewLink.href = finalEvent.previewUrl;
        previewLink.textContent = 'Open website preview';
        setup?.after(previewLink);
      }
      button.textContent = 'Website launched';
      button.removeAttribute('disabled');
    });
  });
}

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

async function waitForWorkspaceSync(page) {
  const syncStatus = page.getByLabel('Updating Studio');
  await syncStatus.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined);
  await syncStatus.waitFor({ state: 'hidden', timeout: 10000 });
}

async function waitForStudioObjectStores(page, expectedStores) {
  await expect
    .poll(
      () =>
        page.evaluate(async (stores) => {
          const database = await new Promise((resolve, reject) => {
            const request = window.indexedDB.open('siteforge-os');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const ready = stores.every((store) => database.objectStoreNames.contains(store));
          database.close();
          return ready;
        }, expectedStores),
      { timeout: 10000 },
    )
    .toBe(true);
}

async function openReadyBuildManifest(page) {
  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await waitForStudioObjectStores(page, ['briefs', 'buildManifests']);

  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-07-29T04:00:00.000Z';
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
      schemaVersion: 4,
      builderContractVersion: 'made-solid-studio-codex-builder-v8',
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
          {
            url: 'https://example.com/',
            title: 'Home',
            routePath: '/',
            publicPath: '/',
            outputPath: 'index.html',
            sourcePath: 'app/page.tsx',
            sourceSelected: true,
          },
          {
            url: 'https://example.com/services',
            title: 'Services',
            routePath: '/services',
            publicPath: '/services/',
            outputPath: 'services/index.html',
            sourcePath: 'app/services/page.tsx',
            sourceSelected: true,
          },
        ],
        selectedAssets: [{ artifactId: 'asset-1' }],
        approvedAssetGuidance: [],
        approvedCapabilities: [],
        approvedVisualContent: [],
        approvedVisualContentGroups: [],
        architecture: {
          sourceFramework: 'next-app-router',
          language: 'typescript-strict',
          styling: 'tailwind-and-semantic-css-tokens',
          interactionFoundation: 'base-ui-and-native-html',
          iconSystem: 'lucide',
          previewRuntime: 'static-export',
          productionRuntime: 'static-marketing',
          componentLayers: ['tokens', 'ui', 'patterns', 'sections', 'site', 'layouts', 'pages'],
          generationPolicy: {
            agentOwnsVisualSystem: true,
            agentOwnsSiteComponents: true,
            lockedBehaviourNotAppearance: true,
            dependenciesPinnedByFoundation: true,
            nativeHtmlFirst: true,
          },
          capabilityAdapters: [],
          qualityProfile: {
            standard: 'wcag-2.2-aa',
            requiredViewports: [
              { id: 'mobile-small', width: 320, height: 568 },
              { id: 'mobile', width: 375, height: 812 },
              { id: 'tablet', width: 768, height: 1024 },
              { id: 'desktop', width: 1440, height: 900 },
            ],
            checks: ['format', 'lint', 'strict-typecheck', 'production-build'],
          },
        },
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
  await waitForWorkspaceSync(page);
  const dismissNotification = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismissNotification.isVisible().catch(() => false)) await dismissNotification.click();
}

test('reviews captured page outcomes before brief approval', async ({ page }) => {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('briefs', 'readwrite');
    const store = transaction.objectStore('briefs');
    const brief = await new Promise((resolve, reject) => {
      const request = store.get('brief-manifest-layout-check');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    brief.status = 'draft';
    delete brief.approvedAt;
    brief.draft.capabilityInventory = [];
    brief.draft.proposedSitemap = [
      {
        label: 'Home',
        purpose: 'Primary visitor introduction',
        route: '/',
        sourceUrl: 'https://example.com/',
      },
      {
        label: 'Thank you',
        purpose: 'Form confirmation state',
        route: '/thank-you/',
        sourceUrl: 'https://example.com/thank-you',
      },
    ];
    brief.draft.pagePlans = [
      {
        title: 'Home',
        sourceUrl: 'https://example.com/',
        structure: ['Primary visitor introduction'],
        disposition: 'build',
        dispositionReason: 'The captured evidence supports a standalone visitor-facing page.',
      },
      {
        title: 'Alternate home',
        sourceUrl: 'https://example.com/home-1',
        structure: ['Review unique content'],
        disposition: 'needs_review',
        dispositionReason:
          'The URL resembles a CMS placeholder or legacy duplicate. Review its unique content before retaining a public route.',
        targetSourceUrl: 'https://example.com/',
      },
      {
        title: 'Thank you',
        sourceUrl: 'https://example.com/thank-you',
        structure: ['Confirmation state'],
        disposition: 'workflow_state',
        dispositionReason:
          'Confirmation pages belong to an approved form or booking flow, not global navigation.',
      },
    ];
    store.put(brief);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.goto('/#/prospects/business-demo-local-services/brief');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await waitForWorkspaceSync(page);
  await page.getByText('View 3 selected page plans').click();
  const decisions = page.getByLabel('Coverage outcome');
  await expect(decisions).toHaveCount(3);
  await decisions.nth(1).selectOption('redirect');
  await expect(page.getByLabel('Canonical destination')).toHaveValue('https://example.com/');
  await expect(page.getByRole('button', { name: 'Approve brief' })).toBeEnabled();

  const architecture = page.getByRole('region', { name: 'Sitemap and page plan' });
  await expect(architecture).toHaveScreenshot('reviewed-page-dispositions.png');
  const accessibility = await new AxeBuilder({ page }).include('.brief-architecture').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function seedPublishedProductionFeatures(page, stagedBehaviourIds) {
  await page.evaluate(async (featureIds) => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storedPackages = JSON.parse(packageRecord.value);
    const publishedPackage = Array.isArray(storedPackages)
      ? storedPackages.find((agentPackage) => agentPackage.status === 'published')
      : storedPackages;
    const now = '2026-07-29T04:10:00.000Z';
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify([
        {
          ...publishedPackage,
          status: 'superseded',
          stagedBehaviourIds: [],
        },
        {
          ...publishedPackage,
          id: 'agent-package-notification-published-v7',
          version: 7,
          status: 'published',
          basePackageId: publishedPackage.id,
          summary: `${featureIds.length} tested features published in production v7.`,
          stagedBehaviourIds: featureIds,
          updatedAt: now,
          approvedAt: now,
          publishedAt: now,
        },
      ]),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, stagedBehaviourIds);
}

async function seedAgentStudioWholeSiteSource(page) {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-07-29T04:05:00.000Z';
    const transaction = database.transaction('builderRuns', 'readwrite');
    const store = transaction.objectStore('builderRuns');
    store.put({
      id: 'builder-agent-studio-source',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'full_site',
      agentPackageId: 'agent-package-local-v6',
      agentPackageVersion: 6,
      agentStudioSourceAt: now,
      sourceCheckpointAvailable: true,
      status: 'ready',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'complete',
      progressDetail: 'Private website ready.',
      totalItems: 2,
      completedItems: 2,
      failureContext: {},
      qualitySummary: { status: 'passed', checks: [], generatedAt: now },
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    store.put({
      id: 'builder-agent-studio-navigation-v2',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      parentBuilderRunId: 'builder-agent-studio-source',
      buildMode: 'site_test',
      buildInstruction: 'Repair the multi-page navigation architecture.',
      agentPackageId: 'agent-package-local-v6',
      agentPackageVersion: 6,
      agentStudioSourceAt: '2026-07-29T04:10:00.000Z',
      agentStudioFeatureId: 'site-navigation-architecture',
      sourceCheckpointAvailable: true,
      status: 'ready',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'complete',
      progressDetail: 'Feature-only private test ready.',
      totalItems: 2,
      completedItems: 2,
      failureContext: {},
      qualitySummary: { status: 'passed', checks: [], generatedAt: now },
      startedAt: '2026-07-29T04:06:00.000Z',
      completedAt: '2026-07-29T04:10:00.000Z',
      createdAt: '2026-07-29T04:06:00.000Z',
      updatedAt: '2026-07-29T04:10:00.000Z',
    });
    store.put({
      id: 'builder-agent-studio-homepage-test',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'homepage_test',
      agentPackageId: 'agent-package-local-v6',
      agentPackageVersion: 6,
      status: 'ready',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'complete',
      progressDetail: 'Homepage test ready.',
      totalItems: 2,
      completedItems: 2,
      failureContext: {},
      qualitySummary: { status: 'passed', checks: [], generatedAt: now },
      startedAt: '2026-07-29T04:11:00.000Z',
      completedAt: '2026-07-29T04:12:00.000Z',
      createdAt: '2026-07-29T04:11:00.000Z',
      updatedAt: '2026-07-29T04:12:00.000Z',
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
}

test('opens Agent Studio Testing for a legacy manifest without page output paths', async ({
  page,
}) => {
  await seedAgentStudioWholeSiteSource(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('buildManifests', 'readwrite');
    const store = transaction.objectStore('buildManifests');
    const manifest = await new Promise((resolve, reject) => {
      const request = store.get('manifest-layout-check');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const legacyData = {
      ...manifest.data,
      selectedPages: manifest.data.selectedPages.map((pageItem) => {
        const item = { ...pageItem };
        delete item.outputPath;
        return item;
      }),
    };
    store.put({ ...manifest, data: legacyData });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Testing could not be displayed' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('radio', { name: 'Revise a website' })).toBeVisible();
  const legacyPageDisclosure = page.getByRole('button', { name: '2 pages built' }).first();
  await legacyPageDisclosure.click();
  await expect(page.getByRole('list', { name: 'Built pages' }).first()).toContainText('Services');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page }).include('.agent-studio').analyze();
  expect(accessibility.violations).toEqual([]);
});

async function selectWorkspaceSection(page, name) {
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    return;
  }

  const picker = page.getByRole('button', { name: /^Workspace section / });
  await picker.click();
  await page
    .getByRole('menu', { name: 'Workspace section' })
    .getByRole('menuitemradio', { name, exact: true })
    .click();
}

async function expectWorkspaceSectionSelected(page, name) {
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible().catch(() => false)) {
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    return;
  }

  await expect(page.getByRole('button', { name: `Workspace section ${name}` })).toBeVisible();
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

test('keeps generation, website editing, and Made Solid handoff in separate routed pages', async ({
  page,
}) => {
  const businessId = 'business-demo-local-services';
  const commit = 'd5e37351969f9503a8e0d9bde323f23f547483b6';
  const committedPreviewUrl =
    'https://preview.madesolid.com.au/__made-solid/workspace-frame/demo-local-services/payload.signature/';
  let committedPreviewRequest;
  await page.route('**/__made-solid/final-edit?*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'finalised',
        detail: 'The verified edit is committed and synced.',
        branch: 'main',
        commit,
        synced: true,
        finalCommit: true,
        changedFiles: [],
        bundleReady: true,
        refinementCount: 4,
        sourceBuild: { buildId: 'f906bbf7-a333-4bfa-bcfb-f667e7f1259b' },
        versions: [
          {
            version: 1,
            commit,
            committedAt: '2026-08-10T16:11:10Z',
            subject: 'Finalize Made Solid edit: demo-local-services',
          },
        ],
        committedVersion: {
          version: 1,
          commit,
          committedAt: '2026-08-10T16:11:10Z',
          subject: 'Finalize Made Solid edit: demo-local-services',
        },
        workingVersion: 2,
      }),
    });
  });
  await page.route('**/__made-solid/committed-preview', async (route) => {
    committedPreviewRequest = route.request().postDataJSON();
    await route.fulfill({
      contentType: 'application/x-ndjson',
      body: `${JSON.stringify({ status: 'complete', phase: 'ready', detail: 'Committed edit v1 is ready.', previewUrl: committedPreviewUrl })}\n`,
    });
  });
  await page.context().route(`${committedPreviewUrl}**`, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><body><main><h1>Committed website v1</h1></main></body></html>',
    });
  });
  await page.route('**/__made-solid/learning-bundle?*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: '4 refinement lessons ready for review.',
        generatedAt: '2026-08-10T22:50:09.320Z',
        origin: {
          studioBuildId: 'f906bbf7-a333-4bfa-bcfb-f667e7f1259b',
          buildManifestId: 'manifest-1',
          agentPackageId: 'package-1',
          agentPackageVersion: 11.2,
        },
        entries: [
          {
            id: 'route-coverage',
            recordedAt: '2026-08-10T14:28:57.522Z',
            classification: 'strict_invariant',
            title: 'Selected routes remain reachable',
            problem: 'A generated navigation group omitted approved routes.',
            rootCause: 'Navigation coverage was not checked against selected output routes.',
            fix: 'Added deterministic route coverage and keyboard interaction checks.',
            pattern: 'selected-route-navigation-coverage',
          },
          {
            id: 'progressive-footer',
            recordedAt: '2026-08-10T14:28:57.853Z',
            classification: 'flexible_principle',
            title: 'Long footer groups use progressive disclosure',
            problem: 'Long navigation lists overwhelmed compact layouts.',
            fix: 'Collapsed only secondary groups on compact screens.',
            pattern: 'mobile-progressive-disclosure',
          },
          {
            id: 'blue-logo-strip',
            recordedAt: '2026-08-10T18:18:49.484Z',
            classification: 'project_specific',
            title: 'LECE uses a dark blue logo strip',
            problem: 'The first treatment did not match this prospect preference.',
            fix: 'Used the approved LECE dark blue treatment.',
          },
          {
            id: 'unclassified-motion',
            recordedAt: '2026-08-10T19:00:00.000Z',
            classification: 'unclassified',
            title: 'Animation timing observation',
            problem: 'Evidence is not yet sufficient to generalise the timing.',
            fix: 'Retained the observation for review.',
          },
        ],
      }),
    });
  });
  await page.goto(`/#/prospects/${businessId}/redesign`);
  await expectWorkspaceSectionSelected(page, 'Build & preview');
  await expect(page.getByTestId('local-development-publication')).toHaveCount(0);

  await page.goto(`/#/prospects/${businessId}/editing`);
  await expectWorkspaceSectionSelected(page, 'Website editing');
  await expect(page.getByTestId('website-editing-page')).toBeVisible();
  await expect(page.getByText('Editing version').locator('..')).toContainText('v2');
  await expect(page.getByText('Current committed', { exact: true }).locator('..')).toContainText(
    'v1',
  );
  await expect(page.getByText('Derived from build').locator('..')).toContainText('f906bbf7');
  await expect(page.getByRole('button', { name: 'Edit v1 committed' })).toBeDisabled();
  const popupPromise = page.context().waitForEvent('page');
  await page.getByRole('button', { name: 'Open website' }).click();
  const committedPreview = await popupPromise;
  await expect
    .poll(() => committedPreviewRequest)
    .toEqual({ directory: 'demo-local-services', commit });
  await expect(
    committedPreview
      .frameLocator('iframe[title="Prospect development website preview"]')
      .getByRole('heading', { name: 'Committed website v1' }),
  ).toBeVisible();
  await committedPreview.close();
  await page.reload();
  await expectWorkspaceSectionSelected(page, 'Website editing');

  await page.goto(`/#/prospects/${businessId}/handoff`);
  await expectWorkspaceSectionSelected(page, 'Made Solid handoff');
  await expect(page.getByTestId('made-solid-handoff-page')).toBeVisible();
  await expect(page.getByText('v1 · d5e37351')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open website' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Push committed edit to Made Solid' }),
  ).toBeDisabled();
  await expect(
    page.getByText(/create and sync the private editable source repository first/i),
  ).toBeVisible();
  await expect(page.getByLabel('Client email (review before Clientspace)')).toBeVisible();
  await expect(
    page.getByText(/it does not create a client account or send an email/i),
  ).toBeVisible();
  const sourceTransfer = page.locator('.handoff-submit');
  await sourceTransfer.scrollIntoViewIfNeeded();
  await expect(sourceTransfer).toHaveScreenshot('made-solid-handoff-transfer.png');
  const learningHandoff = page.getByTestId('agent-learning-handoff');
  await expect(learningHandoff).toBeVisible();
  await expect(learningHandoff.getByText('2 selected', { exact: true })).toBeVisible();
  await expect(
    learningHandoff.getByRole('button', { name: 'Send 2 approved lessons to Agent Studio' }),
  ).toBeEnabled();
  await expect(learningHandoff.getByText('Prospect-specific decisions')).toBeVisible();
  await expect(learningHandoff.getByLabel('LECE uses a dark blue logo strip')).not.toBeChecked();
  await learningHandoff.scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('agent-learning-handoff-page.png');

  const results = await new AxeBuilder({ page })
    .include('[data-testid="made-solid-handoff-page"]')
    .analyze();
  expect(results.violations).toEqual([]);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('keeps committed learning handoffs in a dedicated Agent Studio inbox', async ({ page }) => {
  await page.goto('/#/agent-studio/learning');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Agent learning inbox' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Learning inbox' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { name: 'No learning handoffs yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Package versions' }).last()).toBeVisible();
  const results = await new AxeBuilder({ page }).include('.agent-learning-inbox').analyze();
  expect(results.violations).toEqual([]);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.locator('.agent-learning-inbox')).toHaveScreenshot('agent-learning-inbox.png');
});

test('closes the website edit dialog and reports verification failures on the page', async ({
  page,
}) => {
  const businessId = 'business-demo-local-services';

  await page.route('**/__made-solid/final-edit?*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'changes_pending',
        detail: 'There are saved website changes ready to commit.',
        branch: 'main',
        changedFiles: ['src/App.tsx'],
        bundleReady: false,
        refinementCount: 4,
        sourceBuild: { buildId: 'f906bbf7-a333-4bfa-bcfb-f667e7f1259b' },
        versions: [],
        workingVersion: 1,
      }),
    });
  });
  await page.route('**/__made-solid/final-edit', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: 'application/x-ndjson',
      body: `${JSON.stringify({
        status: 'failed',
        phase: 'failed',
        detail: 'Next.js build worker exited before verification completed.',
      })}\n`,
    });
  });

  await page.goto(`/#/prospects/${businessId}/editing`);
  await expectWorkspaceSectionSelected(page, 'Website editing');
  const commitButton = page.getByRole('button', { name: 'Commit edit v1' });
  await commitButton.click();
  const dialog = page.getByRole('dialog', { name: 'Commit website edit v1?' });
  await dialog.getByRole('button', { name: 'Verify, commit and push' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('alert')).toContainText(
    'Next.js build worker exited before verification completed.',
  );
  await expect(page.getByRole('button', { name: 'Commit edit v1' })).toBeEnabled();

  const results = await new AxeBuilder({ page })
    .include('[data-testid="final-edit-checkpoint"]')
    .analyze();
  expect(results.violations).toEqual([]);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('records, edits, and downloads a responsive tax expense ledger', async ({
  page,
}, testInfo) => {
  await page.goto('/#/tax');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Tax expenses' })).toBeVisible();

  const downloadButton = page.getByRole('button', { name: 'Download CSV' });
  await expect(downloadButton).toBeDisabled();
  const subscriptionButton = page.getByRole('button', { name: 'Record subscription' });
  await subscriptionButton.click();
  let expensePanel = page.getByRole('dialog', { name: 'Add an expense' });
  await expect(expensePanel.getByLabel('Supplier')).toHaveValue('Supabase');
  await expect(expensePanel.getByLabel('What was it for?')).toHaveValue(
    'Supabase Pro subscription',
  );
  await expect(expensePanel.getByLabel('Total amount (AUD)')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(expensePanel).toBeHidden();
  await expect(subscriptionButton).toBeFocused();

  const addExpenseButton = page.getByRole('button', { name: 'Add expense' });
  await addExpenseButton.click();
  expensePanel = page.getByRole('dialog', { name: 'Add an expense' });
  await expect(expensePanel).toBeVisible();
  await expensePanel.getByLabel('Date').fill('2026-08-04');
  await expensePanel.getByLabel('Supplier').fill('Supabase');
  await expensePanel.getByLabel('What was it for?').fill('Pro hosting plan – August');
  await expensePanel.getByLabel('Category').selectOption('hosting_domains');
  await expensePanel.getByLabel('Total amount (AUD)').fill('29.00');
  await expensePanel.getByLabel('GST included (AUD)').fill('2.64');
  await expensePanel.getByLabel('Payment method').fill('Business card');
  await expensePanel.getByLabel('Receipt or invoice reference').fill('INV-SUPA-2026-08');
  await expensePanel
    .getByLabel('Notes')
    .fill('Monthly database and authentication infrastructure.');
  await expensePanel.getByRole('button', { name: 'Add expense' }).click();
  await expect(expensePanel).toBeHidden();

  const row = page.locator('.tax-expense-row', { hasText: 'Pro hosting plan – August' });
  await expect(row).toContainText('Supabase');
  await expect(row).toContainText('$29.00');
  await expect(page.locator('.tax-summary article').first()).toContainText('$29.00');
  await expect(downloadButton).toBeEnabled();

  await row.getByRole('button', { name: /Edit Pro hosting plan/ }).click();
  expensePanel = page.getByRole('dialog', { name: 'Edit expense' });
  await expect(expensePanel).toBeVisible();
  await expensePanel.getByLabel('Total amount (AUD)').fill('30.00');
  await expensePanel.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('$30.00');

  const deleteButton = row.getByRole('button', { name: /Delete Pro hosting plan/ });
  await deleteButton.click();
  await expect(page.getByRole('dialog', { name: 'Delete this expense?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Delete this expense?' })).toBeHidden();
  await expect(deleteButton).toBeFocused();

  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('made-solid-tax-expenses-2026-2027.csv');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await addExpenseButton.click();
    await expect(page.getByRole('dialog', { name: 'Add an expense' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect
      .poll(async () => (await page.locator('.tax-expense-panel').boundingBox())?.width ?? 0)
      .toBeLessThanOrEqual(304);
    await page.keyboard.press('Escape');
    await expect(addExpenseButton).toBeFocused();
    await page.setViewportSize(expectedViewports.mobile);
  }
  const main = page.locator('main');
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
  await main.evaluate((element) => element.scrollTo({ top: 0 }));
  await expect(main).toHaveScreenshot('tax-expenses.png');
  await addExpenseButton.click();
  await expect(page).toHaveScreenshot('tax-expense-form.png');
  await page.keyboard.press('Escape');
  await page
    .locator('.tax-ledger')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await expect(main).toHaveScreenshot('tax-expense-ledger.png');
});

test('keeps dense live build and diagnostic output readable and scrollable', async ({
  page,
}, testInfo) => {
  await mountPopulatedBuilderActivity(page);

  const codexLog = page.locator('.builder-codex-stream ol');
  const diagnosticLog = page.locator('.builder-diagnostics > ol');
  const firstCodexItem = codexLog.locator('li').first();
  const firstDiagnosticItem = diagnosticLog.locator('li').first();

  await expect(page.getByText('separate from Studio chat')).toBeVisible();
  await expect(firstCodexItem).toContainText('Build a complete responsive website');
  await expect(firstDiagnosticItem).toContainText('Verified browser output');
  await expect
    .poll(async () => (await firstCodexItem.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await expect
    .poll(async () => (await firstDiagnosticItem.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await expect
    .poll(() => codexLog.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await expect
    .poll(() => diagnosticLog.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect
      .poll(async () => (await firstDiagnosticItem.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);
    await page.setViewportSize(expectedViewports.mobile);
  }
  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.locator('main')).toHaveScreenshot('builder-activity-output.png');
});

test('collapses finished build evidence while keeping every section keyboard accessible', async ({
  page,
}) => {
  await mountCompletedBuilderEvidence(page);
  const disclosures = page.locator('.builder-evidence-disclosure');
  await expect(disclosures).toHaveCount(4);
  for (const disclosure of await disclosures.all()) {
    await expect(disclosure).not.toHaveAttribute('open', '');
  }
  const savedEvidence = page.getByText('Saved finished-build evidence');
  for (const evidence of await savedEvidence.all()) {
    await expect(evidence).toBeHidden();
  }
  const diagnostics = page.locator('.builder-diagnostics');
  const diagnosticsSummary = diagnostics.locator('summary');
  await diagnosticsSummary.focus();
  await page.keyboard.press('Enter');
  await expect(diagnostics).toHaveAttribute('open', '');
  await expect(diagnostics.getByText('Saved finished-build evidence')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(diagnostics).not.toHaveAttribute('open', '');
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(page.locator('main')).toHaveScreenshot('completed-builder-evidence-collapsed.png');
});

test('shows concrete live build stages and worker freshness without invented progress', async ({
  page,
}, testInfo) => {
  await mountLiveBuilderProgress(page);

  const progress = page.locator('.builder-live-progress');
  await expect(progress).toContainText('Worker connected');
  await expect(progress).toContainText('Next: Verify website.');
  await expect(progress.getByRole('list', { name: 'Build stages' }).locator('li')).toHaveCount(6);
  await expect(progress.locator('.is-complete')).toHaveCount(2);
  await expect(progress.locator('.is-active')).toHaveCount(1);
  await expect(progress).toContainText('Took 21m 44s');
  await expect(progress).toContainText('3m 16s so far');
  await expect(progress).toContainText('Not started');
  await expect(progress).not.toContainText('%');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page }).include('.builder-live-progress').analyze();
  expect(accessibility.violations).toEqual([]);

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.setViewportSize(expectedViewports.mobile);
  }

  await expect(page).toHaveScreenshot('builder-live-progress.png');
});

test('keeps generated build directories browsable across responsive viewports', async ({
  page,
}, testInfo) => {
  await mountBuilderFileExplorer(page);

  const dialog = page.getByRole('dialog', { name: 'Generated files' });
  const sourceTab = dialog.getByRole('tab', { name: /Source/ });
  const outputTab = dialog.getByRole('tab', { name: /Compiled site/ });
  const viewWebsite = dialog.getByRole('button', { name: 'Preview website' });
  const selectedFile = dialog.getByRole('button', { name: /page.tsx/ });
  await expect(dialog).toBeVisible();
  await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
  await outputTab.click();
  await expect(outputTab).toHaveAttribute('aria-selected', 'true');
  await sourceTab.click();
  await expect(sourceTab).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(outputTab).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(sourceTab).toBeFocused();
  await expect(selectedFile).toHaveAttribute('aria-current', 'true');
  await expect(viewWebsite).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Download local workspace' })).toBeVisible();
  await expect(dialog.getByText('src/app/page.tsx')).toBeVisible();
  await expect
    .poll(async () => (await selectedFile.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await expect
    .poll(async () => (await viewWebsite.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect
      .poll(async () => (await viewWebsite.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);
    await page.setViewportSize(expectedViewports.mobile);
  }

  const workspaceColumns = await dialog
    .locator('.builder-file-explorer__workspace')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (testInfo.project.name === 'desktop' || testInfo.project.name === 'tablet') {
    expect(workspaceColumns.split(' ').length).toBe(2);
  } else {
    expect(workspaceColumns.split(' ').length).toBe(1);
  }

  const accessibility = await new AxeBuilder({ page })
    .include('.builder-file-explorer-dialog')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(dialog).toHaveScreenshot('builder-file-explorer.png');

  const preview = dialog.locator('.builder-file-explorer__preview');
  await preview.evaluate((element) => {
    element.classList.add('builder-file-explorer__preview--website');
    const header = element.querySelector('header');
    if (!header) return;
    header.innerHTML = `
      <div>
        <p class="eyebrow">Compiled site file</p>
        <h3>index.html</h3>
        <p>index.html</p>
      </div>
      `;
    const note = document.createElement('p');
    note.className = 'builder-file-explorer__website-note';
    note.textContent =
      'This pane shows the saved HTML source. Use Preview website above—or the direct Preview website action on the Test card—to run navigation, animations, styles, and compiled JavaScript together.';
    header.insertAdjacentElement('afterend', note);
  });
  await expect(preview.getByRole('button', { name: /website/i })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(preview).toHaveScreenshot('builder-file-explorer-compiled-html.png');
});

test('keeps the AI usage page responsive and reachable from navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/#/usage');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'AI usage & spend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Usage scope' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'View' })).toHaveValue('overview');
  await expect(page.getByRole('combobox', { name: 'Prospect' })).toHaveValue('all');
  await expect(page.getByRole('combobox', { name: 'Build' })).toBeDisabled();
  await expect(page.getByText('Included Codex usage', { exact: true })).toBeVisible();
  await expect(page.getByText('API cost unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('No AI usage recorded yet')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.goto('/#/usage/test-run-direct-link');
  await expect(page.getByRole('heading', { name: 'AI usage & spend' })).toBeVisible();

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

test('opens a responsive per-test usage analysis', async ({ page }, testInfo) => {
  await mountUsageTestAnalysis(page);

  const trigger = page.getByRole('button', { name: /Test 22 · Homepage test/ });
  const analysis = page.locator('#fixture-analysis-22');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(analysis).toBeHidden();

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'What the total contains' })).toBeVisible();
  await expect(page.getByText('76% of unrelated manifest context removed')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'What the agent actually received' }),
  ).toBeVisible();
  await expect(page.getByText('made-solid-studio-codex-builder-v8')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page }).include('.usage-page').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.locator('.usage-build')).toHaveScreenshot(
    `usage-test-analysis-open-${testInfo.project.name}.png`,
  );
  await expect(page.locator('.usage-context-projection')).toHaveScreenshot(
    `usage-staged-context-${testInfo.project.name}.png`,
  );

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(analysis).toBeHidden();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await trigger.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('opens the package pinned to an Agent Studio test', async ({ page }, testInfo) => {
  await mountAgentPackageDialog(page);

  const trigger = page.getByRole('button', { name: 'Package v5.0' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: /Build package v\d+/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Builder contract', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Builder foundation', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Run template', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const accessibility = await new AxeBuilder({ page }).include('#package-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(dialog).toHaveScreenshot(`agent-test-package-dialog-${testInfo.project.name}.png`);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('centres the brand intro before carrying the logo into navigation', async ({
  page,
}, testInfo) => {
  test.skip(true, 'The compiled React runtime is covered by the isolated foundation browser test.');
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
  test.skip(true, 'The compiled React runtime is covered by the isolated foundation browser test.');
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
  expect(contract).toContain('Implement this as generated React site components');
  expect(contract).toContain('Creative ownership');
  expect(contract).toContain('Own the icon geometry');
  expect(contract).toContain('data-siteforge-menu-trigger');
  expect(contract).toContain('data-siteforge-navigation-dialog');
  expect(contract).toContain('data-siteforge-navigation-close');
  expect(contract).toContain('icon-only');
  expect(contract).toContain('Open navigation');
  expect(contract).toContain('single vertical route hierarchy');
  expect(contract).toContain('all visual composition belongs to this website');
  expect(contract).toContain('focus entry and restoration');
  expect(contract).toContain('Escape');
  expect(contract).toContain('320×568');
});

test('shows the published Next.js component and runtime architecture', async ({
  page,
}, testInfo) => {
  await page.goto('/#/agent-studio/agent');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();
  await expect(page.locator('.agent-package-config')).toContainText(
    'made-solid-studio-next-builder-v2',
  );

  const implementation = page
    .locator('.feature-implementation-files')
    .filter({ hasText: 'Built-in feature implementation' });
  await expect(implementation).toContainText('Next.js generated component architecture');
  await expect(implementation).toContainText('Production runtime & capability profiles');
  await expect(implementation).toContainText('Framework, interaction & responsive quality gates');
  await expect(implementation).toContainText('Component architecture contract');
  await expect(implementation).toContainText('Runtime profiles contract');
  await expect(implementation).toContainText('Template packages');
  const architectureOverview = page.locator('.agent-architecture-overview');
  await expect(
    architectureOverview.getByRole('heading', {
      name: 'One click. A complete, controlled website build.',
    }),
  ).toBeVisible();
  await expect(
    architectureOverview.locator('.agent-architecture-pipeline__stages > li'),
  ).toHaveCount(6);
  await expect(
    architectureOverview.locator('.agent-architecture-ownership__layer-stack > li'),
  ).toHaveCount(7);
  await expect(architectureOverview).toContainText('made-solid-studio-next-builder-v2');
  await expect(architectureOverview).toContainText('320 × 568');
  await expect(architectureOverview).toContainText('1440 × 900');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    const runtimeButton = architectureOverview.getByRole('button', { name: 'Next runtime' });
    const runtimeButtonBox = await runtimeButton.boundingBox();
    expect(runtimeButtonBox?.height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width: 375, height: 812 });
  }
  await page.locator('.mobile-header').evaluate((header) => {
    header.style.display = 'none';
  });
  await page.locator('.app-shell').evaluate((shell) => {
    shell.style.height = 'auto';
    shell.style.overflow = 'visible';
  });
  await page.locator('main').evaluate((main) => {
    main.style.height = 'auto';
    main.style.overflow = 'visible';
  });
  await expect(architectureOverview.locator('.agent-architecture-overview__hero')).toHaveScreenshot(
    'agent-system-overview.png',
  );
  if (testInfo.project.name === 'mobile') {
    const stages = architectureOverview.locator('.agent-architecture-pipeline__stages > li');
    await expect(stages.first()).toHaveScreenshot('agent-build-input-stage.png');
    await expect(stages.last()).toHaveScreenshot('agent-private-preview-stage.png');
    await expect(
      architectureOverview.locator('.agent-architecture-ownership__columns > section').nth(1),
    ).toHaveScreenshot('agent-generated-component-system.png');
  } else {
    await expect(architectureOverview.locator('.agent-architecture-pipeline')).toHaveScreenshot(
      'agent-build-pipeline.png',
    );
    await expect(architectureOverview.locator('.agent-architecture-ownership')).toHaveScreenshot(
      'agent-creative-ownership.png',
    );
  }
  await architectureOverview.getByRole('button', { name: 'Next runtime' }).click();
  await expect(architectureOverview.locator('.agent-architecture-runtime__detail')).toContainText(
    'Authentication',
  );
  if (testInfo.project.name === 'mobile') {
    await expect(architectureOverview.locator('.agent-architecture-runtime')).toHaveScreenshot(
      'agent-runtime-profile.png',
    );
    await expect(architectureOverview.locator('.agent-architecture-quality')).toHaveScreenshot(
      'agent-quality-gate.png',
    );
  } else {
    await expect(
      architectureOverview.locator('.agent-architecture-runtime-quality'),
    ).toHaveScreenshot('agent-runtime-quality.png');
  }
  const sourceButton = architectureOverview.getByRole('button', {
    name: /Component architecture contract/,
  });
  await sourceButton.click();
  const sourceDialog = page.getByRole('dialog', { name: 'Component architecture contract' });
  await expect(sourceDialog).toContainText('component-architecture.md');
  await page.keyboard.press('Escape');
  await expect(sourceDialog).toBeHidden();
  await expect(sourceButton).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(
    implementation.locator('article').filter({
      hasText: 'Next.js generated component architecture',
    }),
  ).toHaveScreenshot('next-component-architecture-feature.png');
  await expect(
    implementation.locator('article').filter({
      hasText: 'Production runtime & capability profiles',
    }),
  ).toHaveScreenshot('runtime-profiles-feature.png');
  await expect(
    implementation.locator('article').filter({
      hasText: 'Framework, interaction & responsive quality gates',
    }),
  ).toHaveScreenshot('framework-quality-gates-feature.png');
});

test('contains page content horizontally across workspace sections', async ({ page }) => {
  const sections = [
    'overview',
    'email',
    'research',
    'assets',
    'audit',
    'brief',
    'redesign',
    'settings',
  ];

  for (const section of sections) {
    await page.goto(`/#/prospects/business-demo-local-services/${section}`);
    await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('uses a workspace section picker on mobile', async ({ page }, testInfo) => {
  await page.goto('/#/prospects/business-demo-local-services/overview');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const picker = page.getByRole('button', { name: 'Workspace section Overview' });
  const tabs = page.getByRole('tablist', { name: 'Prospect workspace sections' });

  if (testInfo.project.name === 'mobile') {
    await expect(picker).toBeVisible();
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await expect(tabs).toBeHidden();
    await picker.click();
    const options = page.getByRole('menu', { name: 'Workspace section' });
    await expect(options.getByRole('menuitemradio')).toHaveCount(13);
    await page.keyboard.press('Escape');
    await expect(options).toBeHidden();
    await expect(picker).toBeFocused();
    await picker.click();
    await options.getByRole('menuitemradio', { name: 'Assets' }).click();
    await expect(page).toHaveURL(/\/prospects\/business-demo-local-services\/assets$/);
    await expect(page.getByRole('button', { name: 'Workspace section Assets' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    return;
  }

  await expect(picker).toBeHidden();
  await expect(tabs).toBeVisible();
});

test('lays out asset selections as a responsive image grid', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelector('#root')?.setAttribute('hidden', '');
    document.body.insertAdjacentHTML(
      'beforeend',
      `<section class="asset-analysis-selection"><fieldset class="brief-assets">
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox" checked><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content"><strong>Project image</strong><small>Found on 3 pages</small><small class="brief-source-option__location">/</small><small class="brief-source-option__location">/commercial-electrical-installations-and-maintenance</small><small class="brief-source-option__location">/contact</small></span></label>
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox"><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content"><strong>Organisation logo</strong><small>Found on 2 pages</small><small class="brief-source-option__location">/</small><small class="brief-source-option__location">/about-us</small></span></label>
        <label class="brief-source-option brief-source-option--asset"><input type="checkbox"><span class="brief-source-option__preview">Image</span><span class="brief-source-option__content"><strong>Team image</strong><small>Found on 1 page</small><small class="brief-source-option__location">/our-team</small></span></label>
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
  await expect(page.locator('.asset-analysis-selection')).toHaveScreenshot(
    'asset-grouped-locations.png',
  );
  const accessibility = await new AxeBuilder({ page })
    .include('.asset-analysis-selection')
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('shows active asset analysis as a staged incremental handoff', async ({ page }, testInfo) => {
  const [appSource, styleSource] = await Promise.all([
    readFile(studioApp, 'utf8'),
    readFile(studioStyles, 'utf8'),
  ]);
  expect(appSource).toContain('annotation.analysisRunToken === job?.runToken');
  expect(appSource).toContain('assets.length && !workflowActive ? <VisualAssetCatalog');
  expect(appSource).toContain('Only newly saved output from this run appears below.');
  expect(styleSource).toContain('.asset-analysis-live .spin');

  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.evaluate(() => {
    document.body.innerHTML = `<main class="page-shell"><div class="workspace-content-stack">
      <section class="card workspace-panel asset-review-panel asset-review-panel--active">
        <div class="brief-panel__header"><div><p class="eyebrow">Private asset enrichment</p><h2>Asset review</h2><p class="muted-copy">The selected images are being processed as private evidence.</p></div><div class="brief-panel__actions"><span class="status-badge">Analysis running</span><button class="button button--secondary button--default" type="button">Cancel analysis</button></div></div>
        <section aria-labelledby="asset-analysis-live-title" class="asset-analysis-live" data-testid="asset-analysis-live">
          <div class="asset-analysis-live__intro"><div><p class="eyebrow">Live private run</p><h3 id="asset-analysis-live-title">Asset analysis is unfolding now</h3><p class="muted-copy">Earlier results and editing controls are hidden until this replacement run finishes. Only newly saved output from this run appears below.</p></div><span aria-label="Saved asset output count" class="asset-analysis-live__count"><strong>1</strong><span>saved for review</span></span></div>
          <div class="capture-progress capture-progress--running"><div aria-label="Visual asset analysis progress" aria-valuetext="Visual suggestion saved. Continuing with the remaining assets." class="capture-progress__track" role="progressbar"><span class="capture-progress__bar"></span></div><span role="status">Visual suggestion saved. Continuing with the remaining assets. 1 of 6 persisted items complete.</span></div>
          <div class="asset-analysis-live__layout">
            <ol aria-label="Asset analysis stages" class="asset-analysis-live__stages">
              <li data-state="complete"><span aria-hidden="true" class="asset-analysis-live__stage-icon">✓</span><span><strong>Queue private run</strong><small>Secure the selected source assets for the protected worker.</small></span></li>
              <li data-state="complete"><span aria-hidden="true" class="asset-analysis-live__stage-icon">✓</span><span><strong>Prepare source evidence</strong><small>Load the selected files and their saved page provenance.</small></span></li>
              <li aria-current="step" data-state="active"><span aria-hidden="true" class="asset-analysis-live__stage-icon">●</span><span><strong>Analyse and save each asset</strong><small>Describe observable content and save each review card as it becomes ready.</small></span></li>
              <li data-state="next"><span aria-hidden="true" class="asset-analysis-live__stage-icon">○</span><span><strong>Detect brand-colour evidence</strong><small>Inspect supported logo, stylesheet, and repeated interface colour evidence.</small></span></li>
              <li data-state="next"><span aria-hidden="true" class="asset-analysis-live__stage-icon">○</span><span><strong>Finish the review handoff</strong><small>Make the new run available for human review without reusing stale results.</small></span></li>
            </ol>
            <div aria-label="Current analysis item" class="asset-analysis-live__current"><span class="asset-analysis-live__current-label">Working on now</span><div class="asset-analysis-live__asset"><img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23edf2ed'/%3E%3Cpath d='M20 68L42 35l14 18 10-12 14 27z' fill='%23385f4b'/%3E%3C/svg%3E"><span><strong>Project photo</strong><small>/commercial-services</small></span></div></div>
          </div>
          <section aria-labelledby="asset-analysis-output-title" class="asset-analysis-live__output"><div><p class="eyebrow">Saved output from this run</p><h4 id="asset-analysis-output-title">1 asset ready to review</h4></div><div class="asset-review-queue__grid"><article class="asset-review-loader__card"><span class="asset-review-loader__image evidence-skeleton"></span><strong>New review card saved</strong><span class="muted-copy">The next persisted asset will appear below without waiting for the run to finish.</span></article></div></section>
        </section>
      </section>
      <section class="card workspace-panel" data-testid="stale-asset-panel"><h2>Earlier Brand Kit</h2></section>
    </div></main>`;
  });

  const live = page.getByTestId('asset-analysis-live');
  await expect(live).toBeVisible();
  await expect(page.getByTestId('stale-asset-panel')).toBeHidden();
  await expect(
    page.getByRole('list', { name: 'Asset analysis stages' }).getByRole('listitem'),
  ).toHaveCount(5);
  await expect(page.getByText('1 asset ready to review')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(live).toHaveScreenshot('asset-analysis-live-progress.png');

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(live).toHaveScreenshot('asset-analysis-live-progress-320.png');
    await page.getByText('Finish the review handoff').scrollIntoViewIfNeeded();
    await expect(page.getByText('Finish the review handoff')).toBeVisible();
    await page.getByText('1 asset ready to review').scrollIntoViewIfNeeded();
    await expect(page.getByText('1 asset ready to review')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('keeps asset-analysis failures beside the retry action', async ({ page }, testInfo) => {
  const appSource = await readFile(studioApp, 'utf8');
  expect(appSource).toContain('Analysis did not start');
  expect(appSource).toContain('Last run stopped');
  expect(appSource).toContain('Last run completed');

  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.evaluate(() => {
    document.body.innerHTML = `<main class="page-shell"><section class="card workspace-panel asset-review-panel" data-testid="asset-analysis-failure">
      <div class="brief-panel__header"><div><p class="eyebrow">Private asset enrichment</p><h2>Asset review</h2><p class="muted-copy">Analyse the selected private source assets.</p></div><div class="brief-panel__actions"><span class="status-badge">Analysis failed</span><button class="button button--default" type="button">Analyse assets &amp; detect colours</button></div></div>
      <div class="asset-analysis-feedback" data-tone="danger" role="alert"><span aria-hidden="true">!</span><span><strong>Last run stopped during analysing asset</strong><span>The vision provider could not analyse one selected image. Review the selected assets, then use the analysis button above to retry.</span></span></div>
    </section></main>`;
  });

  const panel = page.getByTestId('asset-analysis-failure');
  await expect(page.getByRole('alert')).toContainText('vision provider');
  const retry = page.getByRole('button', { name: 'Analyse assets & detect colours' });
  await expect(retry).toBeEnabled();
  await retry.focus();
  await expect(retry).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(panel).toHaveScreenshot('asset-analysis-failure.png');

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test('keeps asset exclusion and independent colour controls explicit and responsive', async ({
  page,
}, testInfo) => {
  const [appSource, workerSource, migrationSource] = await Promise.all([
    readFile(studioApp, 'utf8'),
    readFile(new URL('../../worker/asset-analysis-worker.mjs', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../../supabase/migrations/20260808132000_targeted_brand_colour_refresh.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  expect(appSource).toContain('Redo from original logo');
  expect(appSource).toContain('Original-logo colours are being rechecked');
  expect(appSource).toContain('Other assets, pages, and existing review cards are unchanged.');
  expect(appSource).toContain('Use a reviewed {role} colour');
  expect(appSource).toContain('Codex will choose an accessible ${role} value');
  expect(workerSource).toContain("analysisScope === 'brand_colours'");
  expect(migrationSource).toContain('request_brand_colour_refresh');
  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.evaluate(() => {
    document.querySelector('main')?.insertAdjacentHTML(
      'beforeend',
      `<section class="workspace-panel" data-testid="asset-workflow-controls">
        <article class="audit-finding asset-suggestion"><details class="asset-suggestion__evidence" open><summary>AI analysis and reuse guidance</summary><div><p>Electrical technicians working beside industrial control equipment.</p><div class="audit-finding__recommendation"><strong>Safe reuse guidance</strong><p>Confirm the business association before reuse.</p></div></div></details></article>
        <div class="asset-suggestion__quick-actions"><button class="button button--danger button--default" type="button">Exclude from agent</button><small>Excluded images stay as private evidence but are removed from agent handoff.</small></div>
        <section class="brand-kit__evidence" aria-labelledby="brand-evidence-test-title"><div><p class="eyebrow">Automatic evidence</p><h3 id="brand-evidence-test-title">Suggested brand colours</h3></div><div class="brand-kit__evidence-colours"><div><span aria-hidden="true" class="brand-kit__colour-swatch" style="background:#585759"></span><strong>Primary</strong><code>#585759</code><small>logo image</small></div><div><span aria-hidden="true" class="brand-kit__colour-swatch" style="background:#8EAC55"></span><strong>Accent</strong><code>#8EAC55</code><small>logo image</small></div></div><p>These are private suggestions from the selected original logo.</p><div class="button-row"><button class="button button--secondary button--default" type="button">Use suggested colours</button><button class="button button--secondary button--default" type="button">Redo from original logo</button></div></section>
        <div class="brand-kit__palette" aria-label="Reviewed brand colours">
          <div class="brand-kit__palette-role"><label class="brand-kit__palette-mode"><input data-colour-toggle="primary" type="checkbox" checked><span><strong>Use a reviewed primary colour</strong><small>This exact primary value is locked into the builder tokens.</small></span></label><label data-colour-value="primary">primary<span class="brand-kit__colour-input"><input aria-label="primary colour" value="#585759"><span class="brand-kit__colour-swatch" style="background:#585759"></span></span></label><p class="muted-copy" data-colour-derived="primary" hidden>No reviewed primary colour will be handed to Codex.</p></div>
          <div class="brand-kit__palette-role"><label class="brand-kit__palette-mode"><input data-colour-toggle="accent" type="checkbox" checked><span><strong>Use a reviewed accent colour</strong><small>This exact accent value is locked into the builder tokens.</small></span></label><label data-colour-value="accent">accent<span class="brand-kit__colour-input"><input aria-label="accent colour" value="#8EAC55"><span class="brand-kit__colour-swatch" style="background:#8EAC55"></span></span></label><p class="muted-copy" data-colour-derived="accent" hidden>No reviewed accent colour will be handed to Codex.</p></div>
        </div>
      </section>`,
    );
    document.querySelectorAll('[data-colour-toggle]').forEach((control) => {
      control.addEventListener('change', () => {
        const role = control.getAttribute('data-colour-toggle');
        const enabled = control.checked;
        if (!enabled) document.querySelector(`[data-colour-value="${role}"]`)?.remove();
        document.querySelector(`[data-colour-derived="${role}"]`).hidden = enabled;
        control.parentElement.querySelector('small').textContent = enabled
          ? `This exact ${role} value is locked into the builder tokens.`
          : `Codex will choose an accessible ${role} value for the new design.`;
      });
    });
  });

  const controls = page.getByTestId('asset-workflow-controls');
  await expect(page.getByRole('button', { name: 'Exclude from agent' })).toBeVisible();
  const redoColours = page.getByRole('button', { name: 'Redo from original logo' });
  await expect(redoColours).toBeVisible();
  await expect(page.getByText('Use a reviewed primary colour')).toBeVisible();
  await expect(page.getByText('Use a reviewed accent colour')).toBeVisible();
  await expect(page.getByText('Electrical technicians working beside')).toBeVisible();
  await expect(page.getByText('AI analysis and reuse guidance')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const analysisSummary = page.getByText('AI analysis and reuse guidance');
  await analysisSummary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Electrical technicians working beside')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Electrical technicians working beside')).toBeVisible();
  const primaryControl = page.getByRole('checkbox', { name: /Use a reviewed primary colour/ });
  const accentControl = page.getByRole('checkbox', { name: /Use a reviewed accent colour/ });
  await primaryControl.focus();
  await page.keyboard.press('Space');
  await expect(primaryControl).not.toBeChecked();
  await accentControl.focus();
  await page.keyboard.press('Space');
  await expect(accentControl).not.toBeChecked();
  await expect(page.getByRole('textbox', { name: 'primary colour' })).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'accent colour' })).toBeHidden();
  await expect(page.getByText('No reviewed primary colour will be handed to Codex.')).toBeVisible();
  await expect(page.getByText('No reviewed accent colour will be handed to Codex.')).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="asset-workflow-controls"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(controls).toHaveScreenshot('asset-workflow-controls.png');
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    const exclusionButton = await page
      .getByRole('button', { name: 'Exclude from agent' })
      .boundingBox();
    expect(exclusionButton?.height).toBeGreaterThanOrEqual(44);
    expect((await redoColours.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await primaryControl.locator('..').boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await accentControl.locator('..').boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test('makes approved briefs unmistakable and folds saving into manifest approval', async ({
  page,
}, testInfo) => {
  const appSource = await readFile(studioApp, 'utf8');
  expect(appSource).toContain("{isApproving ? 'Approving brief' : 'Approve brief'}");
  expect(appSource).not.toContain("{isSaving ? 'Saving brief' : 'Save brief'}");
  expect(appSource).toMatch(
    /async function approveRedesignBrief[\s\S]*approveRedesignBrief\(brief\)[\s\S]*createBuildManifest\(brief\.businessId\)/,
  );

  await page.goto('/');
  await page.evaluate(() => {
    document.body.innerHTML = `<main class="page-shell"><section class="card workspace-panel brief-panel" data-testid="approved-brief-state">
      <div class="brief-panel__header"><div><p class="eyebrow">Strategy handoff</p><h2>Redesign brief</h2><p class="muted-copy">This reviewed strategy is locked for the future builder.</p></div><div class="brief-panel__actions"><span class="status-badge status-badge--success">Brief approved</span></div></div>
      <div class="brief-panel__approval-state" role="status"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2"></path></svg><span><strong>Brief approved</strong><small>This version is locked. Its Build Manifest was prepared automatically for the builder.</small></span></div>
      <div class="brief-panel__source-summary"><span>4 page sources selected</span><span>6 visual assets selected</span><span>0 capability decisions pending</span><span>1 uncertainty flagged</span></div>
    </section></main>`;
  });

  const panel = page.getByTestId('approved-brief-state');
  await expect(page.getByRole('status')).toContainText('Build Manifest was prepared automatically');
  await expect(page.getByText('Brief approved')).toHaveCount(2);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="approved-brief-state"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(panel).toHaveScreenshot('approved-brief-state.png');

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('keeps post-capture image content recovery clear and contained', async ({ page }) => {
  await page.goto('/#/prospects/business-demo-local-services/assets');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const panel = page
    .getByRole('heading', { name: 'Recover image-based information' })
    .locator('..')
    .locator('..');
  await expect(panel).toContainText('Saved images remain available for manual review');
  await expect(panel).toContainText('are not sent to OpenAI');
  await expect(panel).toContainText('Tables and lists keep their structure');
  await expect(page.getByRole('button', { name: 'Recover structured content' })).toHaveCount(0);
  await expect(page.getByText('Image analysis is needed')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps transparent logo versions responsive while the SVG converter stays collapsed', async ({
  page,
}, testInfo) => {
  const appSource = await readFile(studioApp, 'utf8');
  expect(appSource).toContain('const [createEditableSvg, setCreateEditableSvg] = useState(false)');
  expect(appSource).toContain('<strong>Create SVG versions</strong>');
  await page.goto('/');
  await page.evaluate(() => {
    document.body.innerHTML = `<main class="page-shell"><section class="brand-kit__logo-versions" aria-labelledby="logo-versions-test-title">
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
      </section><details class="brand-kit__svg-beta"><summary>Experimental SVG converter <span class="brand-kit__beta-tag">Beta</span></summary><fieldset class="brand-kit__editable-logo"><legend>Editable SVG logo</legend><div class="brand-kit__conversion-controls"><label class="brand-kit__conversion-option"><input type="checkbox"><span><strong>Create SVG versions</strong><small>Off by default. Turn this on only when this logo run should also create a new editable SVG.</small></span></label><fieldset disabled><legend>SVG conversion engine</legend><label><input type="radio" name="svg-test">Current tracer</label></fieldset><button class="button" type="button" disabled>Convert to SVG</button></div></fieldset></details></main>`;
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
  const svgToggle = page.getByRole('checkbox', { name: /Create SVG versions/ });
  await expect(svgToggle).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Convert to SVG' })).toBeDisabled();
  const svgAccessibility = await new AxeBuilder({ page }).include('.brand-kit__svg-beta').analyze();
  expect(svgAccessibility.violations).toEqual([]);
  await expect(beta).toHaveScreenshot('svg-converter-default-off.png');
  await svgToggle.focus();
  await page.keyboard.press('Space');
  await expect(svgToggle).toBeChecked();
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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

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

test('transitions the complete workspace brand from loading into navigation', async ({ page }) => {
  await page.goto('/');

  const loader = page.getByLabel('Loading Made Solid Studio workspace');
  await expect(loader).toBeVisible();
  await expect(loader.locator('.workspace-loading__mark')).toBeVisible();
  await expect(loader.locator('.workspace-loading__letters')).toHaveCount(0);
  await expect(loader.locator('.workspace-loading__brand')).toContainText('Made Solid Studio');
  await expect(loader.locator('.workspace-loading__wordmark')).toHaveCSS(
    'font-family',
    /Space Grotesk/,
  );
  await expect(loader.locator('.workspace-loading__wordmark')).toHaveCSS('font-weight', '600');
  await expect(loader.locator('.workspace-loading__brand .brand__studio')).toHaveCSS(
    'text-transform',
    'uppercase',
  );
  const [loadingMarkBox, loadingWordmarkBox] = await Promise.all([
    loader.locator('.workspace-loading__mark').boundingBox(),
    loader.locator('.workspace-loading__wordmark').boundingBox(),
  ]);
  expect(loadingMarkBox).not.toBeNull();
  expect(loadingWordmarkBox).not.toBeNull();
  if (loadingMarkBox && loadingWordmarkBox) {
    expect(loadingMarkBox.y + loadingMarkBox.height).toBeLessThan(loadingWordmarkBox.y);
    expect(loadingWordmarkBox.width).toBeGreaterThan(120);
  }
  await expect(loader).toHaveAttribute('data-phase', /entering|departing/);
  await expect(loader).toBeHidden();
  await expect(page.locator('.brand--loading-hidden')).toHaveCount(0);
  await expect(page.locator('.brand').first()).toContainText('Made Solid Studio');
  await expect(page.locator('.brand strong').first()).toHaveCSS('font-family', /Space Grotesk/);
  await expect(page.locator('.brand strong').first()).toHaveCSS('font-weight', '600');
  await expect(page.locator('.brand__studio').first()).toHaveCSS('text-transform', 'uppercase');
  await expect(page.locator('h1').first()).toHaveCSS('font-family', /Newsreader/);
  await expect(page.locator('h1').first()).toHaveCSS('font-weight', '500');
});

test('centres the workspace loading brand for each viewport', async ({ page }, testInfo) => {
  await page.goto('/');

  const title = page.locator('.workspace-loading__brand');
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

test('refreshes workspace data without interrupting the current view or flashing sync chrome', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/prospects');
  const launchLoader = page.getByLabel('Loading Made Solid Studio workspace');
  await expect(launchLoader).toBeHidden();

  const websiteUrl = page.getByLabel('Public website URL');
  await websiteUrl.fill('a-very-long-prospect-domain.example/services-and-consultation');
  await websiteUrl.focus();
  const main = page.locator('main');
  await main.evaluate((element) => element.scrollTo({ top: 120 }));
  const scrollTop = await main.evaluate((element) => element.scrollTop);

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  const syncStatus = page.getByLabel('Updating Studio');
  await page.waitForTimeout(450);
  await expect(syncStatus).toBeHidden();
  await expect(launchLoader).toBeHidden();
  await expect(websiteUrl).toBeFocused();
  await expect(websiteUrl).toHaveValue(
    'a-very-long-prospect-domain.example/services-and-consultation',
  );
  await expect(page).toHaveURL(/#\/prospects$/);
  expect(await main.evaluate((element) => element.scrollTop)).toBe(scrollTop);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  await expect(page).toHaveScreenshot('workspace-background-hydration.png', {
    animations: 'disabled',
  });
  await expect(syncStatus).toBeHidden();

  if (viewport?.width === expectedViewports.mobile.width) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    await expect(launchLoader).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(450);
    await expect(syncStatus).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page).toHaveScreenshot('workspace-background-hydration-compact-mobile.png', {
      animations: 'disabled',
    });
  }
});

test('restores the last workspace immediately while its saved data refreshes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/prospects/business-demo-local-services/assets');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expectWorkspaceSectionSelected(page, 'Assets');

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cacheDatabase = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open('made-solid-studio-workspace-cache', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return new Promise((resolve, reject) => {
          const request = cacheDatabase
            .transaction('snapshots', 'readonly')
            .objectStore('snapshots')
            .get('local-workspace');
          request.onsuccess = () => resolve(request.result?.workspaces?.length ?? 0);
          request.onerror = () => reject(request.error);
        });
      }),
    )
    .toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden({ timeout: 750 });
  await expectWorkspaceSectionSelected(page, 'Assets');
  await expect(page).toHaveURL(/#\/prospects\/business-demo-local-services\/assets$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('keeps the current report mounted while a Studio source update is announced', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/prospects/business-demo-local-services/report-preview');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expectWorkspaceSectionSelected(page, 'Client report preview');

  const main = page.locator('main');
  await main.evaluate((element) => element.scrollTo({ top: 120 }));
  const scrollTop = await main.evaluate((element) => element.scrollTop);
  await page.evaluate(() => document.dispatchEvent(new Event('made-solid:studio-update-started')));

  const updateStatus = page.getByLabel('Updating Studio');
  await expect(updateStatus).toBeVisible();
  await expect(updateStatus).toContainText('Updating Studio');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expectWorkspaceSectionSelected(page, 'Client report preview');
  await expect(page).toHaveURL(/#\/prospects\/business-demo-local-services\/report-preview$/);
  expect(await main.evaluate((element) => element.scrollTop)).toBe(scrollTop);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const accessibility = await new AxeBuilder({ page }).include('.workspace-sync-status').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot('studio-source-update-hydration.png', {
    animations: 'disabled',
  });

  await page.evaluate(() => document.dispatchEvent(new Event('made-solid:studio-update-finished')));
  await expect(updateStatus).toBeHidden();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() =>
      document.dispatchEvent(new Event('made-solid:studio-update-started')),
    );
    await expect(updateStatus).toBeVisible();
    await expect(updateStatus).toContainText('Updating Studio');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page).toHaveScreenshot('studio-source-update-hydration-compact-mobile.png', {
      animations: 'disabled',
    });
  }
});

test('leaves scroll-boundary gestures entirely native', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const topWheelStayedNative = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return window.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: -80 }));
  });
  expect(topWheelStayedNative).toBe(true);
  await expect(page.locator('main')).not.toHaveAttribute('data-overscroll');

  const bottomWheelStayedNative = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    return window.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: 80 }));
  });
  expect(bottomWheelStayedNative).toBe(true);
  await expect(page.locator('main')).not.toHaveAttribute('data-overscroll');
});

test('keeps native trackpad scrolling available in Agent Studio', async ({ page }) => {
  await page.goto('/#/agent-studio/agent');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();

  await page.locator('main').evaluate((element) => element.scrollTo(0, 0));
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('A viewport is required for the Agent Studio scroll test.');
  await page.mouse.move(viewport.width * 0.75, viewport.height * 0.65);
  await page.mouse.wheel(0, 240);

  await expect
    .poll(() => page.locator('main').evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'auto');
  await expect(page.locator('main')).toHaveCSS('touch-action', 'pan-y');
});

test('starts routed pages and prospect sections at the top', async ({ page }, testInfo) => {
  await page.goto('/#/agent-studio/agent');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const main = page.locator('main');

  await main.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  if (testInfo.project.name === 'desktop') {
    await page.locator('.sidebar').getByRole('button', { name: 'Prospects' }).click();
  } else {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page
      .getByRole('dialog', { name: 'Navigation' })
      .getByRole('button', { name: 'Prospects' })
      .click();
  }
  await expect(page).toHaveURL(/#\/prospects$/);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);

  await page.goto('/#/prospects/business-demo-local-services/assets');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await main.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await selectWorkspaceSection(page, 'Overview');
  await expect(page).toHaveURL(/\/prospects\/business-demo-local-services\/overview$/);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);
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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

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

  await openReadyBuildManifest(page);
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const testBox = await page.locator('.agent-studio__test').boundingBox();
  expect(testBox).not.toBeNull();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps the build manifest package separate from the Agent Studio test controls', async ({
  page,
}, testInfo) => {
  const appSource = await readFile(studioApp, 'utf8');
  expect(appSource).toContain('buildInstructionWithTone(websiteTone, buildDirections)');
  expect(appSource).toContain('not a requirement for a pure white background');
  expect(appSource).toContain('not a requirement for a pure black background');
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
  const prospectBuildAction = page.getByRole('button', {
    name: 'Build complete prospect website',
  });
  await expect(prospectBuildAction).toBeVisible();
  await expect(prospectBuildAction).toBeDisabled();
  const productionVersion = page.getByText('Production version').locator('..');
  await expect(productionVersion).toContainText('v6.0');
  await expect(productionVersion.getByLabel(/new agent features awaiting/)).toHaveText('4');
  await expect(productionVersion).toContainText(
    'This exact published version will be pinned to the build.',
  );
  const toneGroup = page.getByRole('group', { name: 'Website tone' });
  const agentDecidesTone = toneGroup.getByRole('radio', { name: /Agent decides/ });
  const darkTone = toneGroup.getByRole('radio', { name: /Dark/ });
  await expect(agentDecidesTone).toBeChecked();
  await darkTone.focus();
  await page.keyboard.press('Space');
  await expect(darkTone).toBeChecked();
  await expect(toneGroup).toContainText('not necessarily black');
  await agentDecidesTone.check();
  const toneAccessibility = await new AxeBuilder({ page }).include('.builder-page-test').analyze();
  expect(toneAccessibility.violations).toEqual([]);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    for (const tone of await toneGroup.locator('label').all()) {
      expect((await tone.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize(expectedViewports.mobile);
  }
  await expect(
    page.getByText(
      'Complete and review a homepage test in Agent Studio for this Build Manifest before starting the complete prospect build.',
    ),
  ).toBeVisible();
  if (!firstItem) return;
  expect(Math.abs(secondItem.y - firstItem.y)).toBeLessThan(3);

  await manifestPackage.click();
  const dialog = page.getByRole('dialog', { name: 'Build Manifest ready' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Permitted facts remain tied');
  await expect(dialog).toContainText('Engineering architecture');
  await expect(dialog).toContainText('Next.js App Router');
  await expect(dialog).toContainText('320×568, 375×812, 768×1024, 1440×900');
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
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storedPackages = JSON.parse(packageRecord.value);
    const publishedPackage = Array.isArray(storedPackages)
      ? storedPackages.find((agentPackage) => agentPackage.status === 'published')
      : storedPackages;
    const now = new Date().toISOString();
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify([
        publishedPackage,
        {
          ...publishedPackage,
          id: 'agent-package-local-v7',
          version: 7,
          status: 'test_ready',
          basePackageId: publishedPackage.id,
          summary:
            'Derived v7 test package: verified brand-aware first-visit logo introduction with a safe header handoff.',
          capabilityAssessment: 'foundation_change_required',
          capabilityProposal:
            'The v7 package verifies the React brand-introduction runtime and automated quality check for the real header-logo target.',
          stagedBehaviourIds: [],
          updatedAt: now,
          approvedAt: now,
          publishedAt: undefined,
        },
        {
          ...publishedPackage,
          id: 'agent-package-local-v8',
          version: 8,
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

  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page).toHaveURL(/\/agent-studio\/refine\/business-demo-local-services$/);
  await expect(
    page.getByRole('heading', { name: 'Refine the builder, not a prospect' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /prepared prospect demo local services/i }),
  ).toBeVisible();
  await expect(page.locator('.builder-page-set')).toHaveScreenshot('agent-page-set-selector.png', {
    mask: [page.locator('.builder-page-set input[type="checkbox"]')],
  });
  await expect(page.locator('.builder-page-set__options input:checked')).toHaveCount(1);
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible();
  await page.getByLabel('Test agent package').selectOption('agent-package-local-v7');
  await expect(page.getByLabel('Test agent package')).toHaveValue('agent-package-local-v7');
  await expect(page.getByLabel('Test agent package')).toContainText('v7.0');
  expect(
    await page.getByLabel('Test agent package').locator('option').allTextContents(),
  ).not.toContain('v8.0 · Production draft');
  const buildTestPageButton = page.getByRole('button', { name: 'Build test page' });
  await expect(buildTestPageButton).toBeVisible();
  await expect(buildTestPageButton).toHaveClass(/button--primary/);
  await expect(buildTestPageButton).toHaveCSS('background-color', 'rgb(231, 255, 31)');
  await expect(buildTestPageButton).toHaveScreenshot('build-test-page-accent.png');
  await expect(page.locator('.builder-run__action-label')).toHaveText('Test');
  await expect(page.getByRole('radio', { name: 'Create page from scratch' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Revise a website' })).toBeVisible();
  const studioToneGroup = page.getByRole('group', { name: 'Website tone' });
  const studioAgentDecidesTone = studioToneGroup.getByRole('radio', {
    name: /Agent decides/,
  });
  const studioDarkTone = studioToneGroup.getByRole('radio', { name: /Dark/ });
  await expect(studioAgentDecidesTone).toBeChecked();
  await studioDarkTone.focus();
  await page.keyboard.press('Space');
  await expect(studioDarkTone).toBeChecked();
  await expect(studioToneGroup).toContainText('not necessarily black');
  await studioAgentDecidesTone.check();
  await expect(studioToneGroup).toHaveScreenshot('agent-studio-website-tone.png', {
    mask: [studioToneGroup.locator('input[type="radio"]')],
  });
  const studioToneAccessibility = await new AxeBuilder({ page })
    .include('.builder-page-test__tone')
    .analyze();
  expect(studioToneAccessibility.violations).toEqual([]);
  if (testInfo.project.name === 'mobile') {
    for (const tone of await studioToneGroup.locator('label').all()) {
      expect((await tone.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.getByRole('radio', { name: 'Revise previous page' }).check();
  await expect(page.getByLabel('Previous built page')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revise private page' })).toBeDisabled();
  await expect(page.getByText('There are no completed private tests to revise yet.')).toBeVisible();
  await page.getByRole('radio', { name: 'Revise a website' }).check();
  await expect(
    page.getByText('No whole-site source is available yet. Move a completed multi-page prospect'),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Create page from scratch' }).check();
  await expect(page.locator('.builder-page-set')).toBeVisible();
  const pageSetLabels = page.locator('.builder-page-set__options label');
  for (let index = 0; index < (await pageSetLabels.count()); index += 1) {
    const box = await pageSetLabels.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  const pageSetAccessibility = await new AxeBuilder({ page })
    .include('.builder-page-set')
    .analyze();
  expect(pageSetAccessibility.violations).toEqual([]);
  const pageSearch = page.getByRole('searchbox', { name: 'Search approved pages' });
  await pageSearch.fill('services');
  await expect(page.locator('.builder-page-set__group--selected')).toContainText('Home');
  await expect(page.getByText('Search results', { exact: true })).toBeVisible();
  await expect(page.locator('.builder-page-set__group').last()).toContainText('Services');
  await pageSearch.fill('nothing-matches');
  await expect(page.locator('.builder-page-set__group--selected')).toContainText('Home');
  await expect(
    page.getByText('No unselected pages match this search. Selected pages remain pinned above.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear page search' }).click();
  await expect(pageSearch).toHaveValue('');
  const [selectedGroupBox, availableGroupBox] = await Promise.all([
    page.locator('.builder-page-set__group--selected').boundingBox(),
    page.locator('.builder-page-set__group').last().boundingBox(),
  ]);
  expect(selectedGroupBox).not.toBeNull();
  expect(availableGroupBox).not.toBeNull();
  if (selectedGroupBox && availableGroupBox) {
    expect(selectedGroupBox.y).toBeLessThan(availableGroupBox.y);
  }
  await page.mouse.move(0, 0);
  await expect(page.locator('.builder-page-set')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('0 selected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeDisabled();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeEnabled();
  await page
    .locator('.builder-page-set__options label')
    .filter({ hasText: 'Services' })
    .getByRole('checkbox')
    .uncheck();
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
  await expect(testingBehaviour).toContainText('Package v7.0 testing behaviour');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.0.22');
  await expect(testingBehaviour).toContainText(
    'complete builds now offer Light, Dark, and Agent decides tonal direction',
  );
  await expect(testingBehaviour).toContainText('Website tone direction');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.2');
  await expect(testingBehaviour).toContainText(
    'Agent Studio page tests and whole-site revisions now expose the same Agent decides',
  );
  await expect(testingBehaviour).toContainText('Visible hero entrance after the logo handoff');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.41');
  await expect(testingBehaviour).toContainText('the complete heading and primary action fit');
  await expect(testingBehaviour).toContainText('Mobile & tablet sidebar navigation');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.23');
  await expect(testingBehaviour).toContainText('without nested scrollbar chrome');
  await expect(testingBehaviour).toContainText('Context-aware logo selection');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.12');
  await expect(testingBehaviour).toContainText(
    'every approved transparent version of the primary logo remains available together',
  );
  await expect(testingBehaviour).toContainText('Semantic recovery from image-based content');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.15');
  await expect(testingBehaviour).toContainText('excluded from reusable manifest assets');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.36');
  await expect(testingBehaviour).toContainText('every selected source now receives a reviewed');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.43');
  await expect(testingBehaviour).toContainText('proposition before supporting media');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.19');
  await expect(testingBehaviour).toContainText('explicit preview, production service');
  await expect(testingBehaviour).toContainText('Behaviour revision · v7.91');
  await expect(testingBehaviour).toContainText(
    'completed prospect builds now lead with their current outcome and repair action',
  );
  await expect(testingBehaviour).toContainText(
    'Select behaviours to stage for the next production draft',
  );
  await expect(
    testingBehaviour.getByRole('checkbox', { name: 'Mobile & tablet sidebar navigation' }),
  ).not.toBeChecked();
  await expect(
    testingBehaviour.getByRole('checkbox', { name: 'Context-aware logo selection' }),
  ).not.toBeChecked();
  await expect(
    testingBehaviour.getByRole('button', { name: 'Stage selected for production draft' }),
  ).toBeVisible();
  const workshopBehaviourButton = testingBehaviour
    .locator('article', { hasText: 'Visible hero entrance after the logo handoff' })
    .getByRole('button', { name: 'Workshop behaviour' });
  await expect(workshopBehaviourButton).toHaveCount(0);
  await expect(
    testingBehaviour
      .locator('article', { hasText: 'Mobile & tablet sidebar navigation' })
      .getByRole('button', { name: 'Workshop behaviour' }),
  ).toHaveCount(0);
  await expect(
    testingBehaviour
      .locator('article', { hasText: 'Semantic recovery from image-based content' })
      .getByRole('button', { name: 'Workshop behaviour' }),
  ).toBeVisible();
  const testFeatureFiles = page.locator('.feature-implementation-files--compact');
  await expect(testFeatureFiles).not.toHaveAttribute('open', '');
  await testFeatureFiles.locator('summary').click();
  await expect(testFeatureFiles).toHaveAttribute('open', '');
  await expect(
    testFeatureFiles.getByRole('heading', { name: 'Files behind this test' }),
  ).toBeVisible();
  await expect(testFeatureFiles).toContainText('Brand introduction');
  await expect(testFeatureFiles).toContainText('Semantic recovery from image-based content');
  await expect(testFeatureFiles).toContainText('Semantic recovery contract');
  await expect(testFeatureFiles).toContainText('Semantic content grouping');
  await expect(
    testFeatureFiles.getByRole('button', { name: 'Workshop JavaScript: Motion runtime' }),
  ).toHaveCount(0);
  await testFeatureFiles
    .getByRole('button', {
      name: /worker\/builder-template\/src\/components\/foundation\/site-runtime\.tsx/i,
    })
    .first()
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
  await expect(page.getByText('Build conversation')).toHaveCount(0);
  await expect(page.locator('.builder-diagnostics')).toHaveCount(0);
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
  const [refineBox, architectureBox, settingsBox] = await Promise.all([
    studioActions.getByRole('button', { name: 'Refine', exact: true }).boundingBox(),
    studioActions.getByRole('button', { name: 'Agent architecture' }).boundingBox(),
    studioActions.getByRole('button', { name: 'Builder settings' }).boundingBox(),
  ]);
  expect(refineBox).not.toBeNull();
  expect(architectureBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  await expect(studioActions.locator('.status-badge')).toHaveCount(0);
  if (!refineBox || !architectureBox || !settingsBox) return;
  expect(architectureBox.y > refineBox.y || architectureBox.x > refineBox.x).toBeTruthy();
  expect(settingsBox.y > architectureBox.y || settingsBox.x > architectureBox.x).toBeTruthy();
  if (testInfo.project.name === 'desktop') {
    expect(
      Math.abs(
        settingsBox.y + settingsBox.height / 2 - (architectureBox.y + architectureBox.height / 2),
      ),
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
  const servicesPageCheckbox = page
    .locator('.builder-page-set__options label')
    .filter({ hasText: 'Services' })
    .getByRole('checkbox');
  await servicesPageCheckbox.focus();
  await expect(servicesPageCheckbox).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build test page' })).toBeEnabled();
  await expect(
    page.getByText('Creates 2 selected pages together from the clean locked foundation.'),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('shows a truthful responsive local-development and private GitHub handoff', async ({
  page,
}) => {
  await mountLocalDevelopmentPublication(page);
  const panel = page.getByTestId('local-development-publication');
  await expect(
    panel.getByRole('heading', { name: 'Work in a local prospect workspace' }),
  ).toBeVisible();
  await expect(panel.getByText('Editable source is ready')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Create editable workspace' })).toBeVisible();
  await expect(panel).toContainText('Private destination: zacdagostino/lecegroup');
  await expect(panel.getByLabel('GitHub account or organization')).toBeHidden();
  await panel.getByText('Change GitHub destination', { exact: true }).click();
  await expect(panel.getByLabel('GitHub account or organization')).toHaveValue('zacdagostino');
  await panel.getByText('Change GitHub destination', { exact: true }).click();
  await expect(panel.getByLabel('GitHub account or organization')).toBeHidden();
  await expect(panel).toContainText('Private only.');
  await expect(panel).toContainText('never changes the Made Solid Studio repository');
  await expect(panel.getByRole('button', { name: 'Open local prospect workspace' })).toBeVisible();
  const localFallback = panel.getByText('Manual command fallback', { exact: true });
  await localFallback.click();
  await expect(panel.getByRole('button', { name: 'Copy local workspace command' })).toBeVisible();
  await expect(panel).toContainText('prospect-workspaces/lecegroup');
  await localFallback.click();
  await expect(panel.getByRole('button', { name: 'Copy local workspace command' })).toBeHidden();
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="local-development-publication"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(panel).toHaveScreenshot('local-development-publication.png');
});

test('opens a finished editable workspace inside the ignored Studio workspace directory', async ({
  page,
}, testInfo) => {
  await page.route('**/__made-solid/local-workspace', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      body: [
        JSON.stringify({
          status: 'running',
          phase: 'accessing',
          detail: 'Checking private GitHub access.',
        }),
        JSON.stringify({
          status: 'running',
          phase: 'updating',
          detail:
            'Fast-forwarding the existing prospect workspace without overwriting local changes.',
        }),
        JSON.stringify({
          status: 'running',
          phase: 'verifying',
          detail: 'Made Solid refinement logging is ready.',
        }),
        JSON.stringify({
          status: 'running',
          phase: 'installing',
          detail: 'Website dependencies are already installed.',
        }),
        JSON.stringify({
          status: 'running',
          phase: 'launching',
          detail: 'Starting the website in a persistent terminal session.',
        }),
        JSON.stringify({
          status: 'complete',
          phase: 'ready',
          detail: 'The website is running from prospect-workspaces/lece-electrical-website.',
          previewUrl: 'https://example.test/lece-electrical-website',
        }),
        '',
      ].join('\n'),
      contentType: 'application/x-ndjson',
      status: 200,
    });
  });
  await mountReadyEditableWorkspace(page);
  const panel = page.getByTestId('editable-workspace-ready');
  const openWorkspace = panel.getByRole('button', { name: 'Open local prospect workspace' });
  await expect(openWorkspace).toBeVisible();
  await expect(panel).toContainText('prospect-workspaces/lece-electrical-website');
  await expect(panel.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
    'href',
    'https://github.com/made-solid-studio/lece-electrical-website',
  );
  await openWorkspace.click();
  await expect(panel.getByRole('button', { name: 'Open local prospect workspace' })).toContainText(
    'Preparing local workspace',
  );
  await expect(panel.getByRole('list', { name: 'Local workspace setup stages' })).toBeVisible();
  await expect(panel.locator('.local-workspace-setup .is-current')).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Open local prospect workspace' })).toContainText(
    'Website launched',
  );
  const stages = panel.getByRole('list', { name: 'Local workspace setup stages' });
  await expect(stages.getByRole('listitem')).toHaveCount(6);
  await expect(stages.locator('.is-complete')).toHaveCount(6);
  await expect(panel).toContainText('The website is running from prospect-workspaces');
  await expect(panel.getByRole('link', { name: 'Open website preview' })).toHaveAttribute(
    'href',
    'https://example.test/lece-electrical-website',
  );
  await expect(panel.getByRole('heading', { name: 'Refinement ledger' })).toBeVisible();
  await expect(panel).toContainText('Resources appear immediately');
  await expect(panel).toContainText('1 verified refinement recorded.');
  await panel.getByText('Manual command fallback', { exact: true }).click();
  await expect(panel).toContainText(
    'npm run workspace:open -- --repository made-solid-studio/lece-electrical-website',
  );
  await panel.getByText('Manual command fallback', { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="editable-workspace-ready"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(panel).toHaveScreenshot('editable-workspace-ready.png');
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(panel.getByRole('heading', { name: 'Refinement ledger' })).toBeVisible();
    await expect(panel).toContainText('375x812 · 768x1024 · 1440x900');
  }
});

test('shows comprehensive persisted progress while creating an editable workspace', async ({
  page,
}, testInfo) => {
  await mountEditableWorkspaceCreation(page);
  const panel = page.getByTestId('editable-workspace-creation');
  await expect(
    panel.getByRole('heading', { name: 'Preparing zacdagostino/lecegroup' }),
  ).toBeVisible();
  await expect(panel.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    'Creating the private GitHub repository zacdagostino/lecegroup.',
  );
  const stages = panel
    .getByRole('list', { name: 'Workspace creation stages' })
    .getByRole('listitem');
  await expect(stages).toHaveCount(5);
  await expect(panel.locator('.local-development__progress-stages .is-complete')).toHaveCount(3);
  await expect(panel.locator('.local-development__progress-stages .is-current')).toHaveCount(1);
  await expect(panel.locator('.local-development__progress-stages .is-upcoming')).toHaveCount(1);
  await expect(panel).toContainText('124 of 126 prepared');
  await expect(panel).toContainText('Private only');
  await expect(panel).toContainText('will not alter the Made Solid Studio repository');
  const cancel = panel.getByRole('button', { name: 'Cancel workspace creation' });
  await expect(cancel).toBeVisible();
  const cancelBox = await cancel.boundingBox();
  expect(cancelBox?.height).toBeGreaterThanOrEqual(44);
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="editable-workspace-creation"]')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(panel).toHaveScreenshot('editable-workspace-creation.png');
  await cancel.focus();
  await expect(cancel).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(cancel).toBeVisible();
  }
});

test('keeps long editable-workspace values contained at 320px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  await mountLocalDevelopmentPublication(page);
  await page.getByText('Change GitHub destination', { exact: true }).click();
  await page
    .getByLabel('Repository name')
    .fill('lece-electrical-services-and-commercial-project-delivery-website');
  await page.getByText('Manual command fallback', { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Create editable workspace' })).toBeVisible();
});

test('shows one pending-feature count beside the current production agent version', async ({
  page,
}) => {
  await openReadyBuildManifest(page);
  await seedPublishedProductionFeatures(page, [
    'hero-handoff',
    'brand-introduction',
    'responsive-sidebar',
    'contextual-logo-selection',
    'visual-content-recovery',
    'next-component-architecture',
    'runtime-profiles',
    'framework-quality-gates',
  ]);
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const notificationName = '1 new agent feature awaiting production approval';
  const prospectVersion = page.locator('.builder-page-test__production-version');
  await expect(prospectVersion).toContainText('v7');
  await expect(prospectVersion.getByLabel(notificationName)).toHaveText('1');
  await expect(prospectVersion).toHaveScreenshot('prospect-production-version-notification.png');

  await page.goto('/#/agent-studio/versions/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const packageConfiguration = page.locator('.agent-package-config');
  await expect(packageConfiguration.getByLabel(notificationName).first()).toBeVisible();
  await expect(
    page.locator('.agent-package-config__header').getByLabel(notificationName),
  ).toHaveText('1');
  await expect(
    page.locator('.agent-package-config__identity').getByLabel(notificationName),
  ).toHaveText('1');
  await expect(
    page.locator('.production-feature-versions__header').getByLabel(notificationName),
  ).toHaveText('1');
  await expect(
    page.locator('.agent-package-config__version-row').getByLabel(notificationName),
  ).toHaveText('1');
  await expect(page.getByRole('combobox', { name: /Production version/i })).toContainText(
    '1 awaiting approval',
  );
  await expect(page.locator('.agent-package-config__header')).toHaveScreenshot(
    'agent-production-version-notification.png',
  );
  const accessibilityScan = await new AxeBuilder({ page })
    .include('.agent-package-config')
    .analyze();
  expect(accessibilityScan.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('keeps the active semantic recovery safeguard with its package version', async ({ page }) => {
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await waitForStudioObjectStores(page, ['meta']);

  const update = page.getByRole('region', {
    name: 'Semantic recovery safeguard · v6.16',
  });
  await expect(update).toHaveCount(0);

  await page.getByRole('button', { name: 'Package versions' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/versions\/business-demo-local-services$/);
  await expect(update).toContainText('Active in source');
  await expect(update).toContainText(
    'semantic-recovery safeguard and its production-release status',
  );
  await expect(update).toContainText('Production feature status:');
  await expect(update).toHaveScreenshot('semantic-recovery-source-update.png');

  const accessibility = await new AxeBuilder({ page })
    .include('.agent-studio__source-update')
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole('button', { name: 'Agent architecture' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/agent\/business-demo-local-services$/);
  await expect(update).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('displays the newest test package above retained package versions', async ({ page }) => {
  test.setTimeout(60_000);
  await openReadyBuildManifest(page);
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const packagePicker = page.getByLabel('Test agent package');
  await expect(packagePicker).toHaveValue('agent-package-local-v21-3-development-release-urls');
  await expect(packagePicker).toContainText('v21.3 · Approved test');
  await expect(packagePicker).toContainText('v21.2 · Approved test');
  await expect(packagePicker).toContainText('v21.1 · Approved test');
  await expect(packagePicker).toContainText('v21.0 · Approved test');
  await expect(packagePicker).toContainText('v20.9 · Approved test');
  await expect(packagePicker).toContainText('v20.8 · Approved test');
  await expect(packagePicker).toContainText('v20.7 · Approved test');
  await expect(packagePicker).toContainText('v20.6 · Approved test');
  await expect(packagePicker).toContainText('v20.5 · Approved test');
  await expect(packagePicker).toContainText('v20.4 · Approved test');
  await expect(packagePicker).toContainText('v20.3 · Approved test');
  await expect(packagePicker).toContainText('v20.2 · Approved test');
  await expect(packagePicker).toContainText('v20.1 · Approved test');
  await expect(packagePicker).toContainText('v20.0 · Approved test');
  await expect(packagePicker).toContainText('v19.9 · Approved test');
  await expect(packagePicker).toContainText('v19.8 · Approved test');
  await expect(packagePicker).toContainText('v19.7 · Approved test');
  await expect(packagePicker).toContainText('v19.6 · Approved test');
  await expect(packagePicker).toContainText('v19.5 · Approved test');
  await expect(packagePicker).toContainText('v19.4 · Approved test');
  await expect(packagePicker).toContainText('v19.3 · Approved test');
  await expect(packagePicker).toContainText('v19.2 · Approved test');
  await expect(packagePicker).toContainText('v19.1 · Approved test');
  await expect(packagePicker).toContainText('v19.0 · Approved test');
  await expect(packagePicker).toContainText('v18.9 · Approved test');
  await expect(packagePicker).toContainText('v18.8 · Approved test');
  await expect(packagePicker).toContainText('v18.7 · Approved test');
  await expect(packagePicker).toContainText('v18.6 · Approved test');
  await expect(packagePicker).toContainText('v18.5 · Approved test');
  await expect(packagePicker).toContainText('v18.4 · Approved test');
  await expect(packagePicker).toContainText('v18.3 · Approved test');
  await expect(packagePicker).toContainText('v18.2 · Approved test');
  await expect(packagePicker).toContainText('v18.1 · Approved test');
  await expect(packagePicker).toContainText('v18.0 · Approved test');
  await expect(packagePicker).toContainText('v17.9 · Approved test');
  await expect(packagePicker).toContainText('v17.8 · Approved test');
  await expect(packagePicker).toContainText('v17.7 · Approved test');
  await expect(packagePicker).toContainText('v17.6 · Approved test');
  await expect(packagePicker).toContainText('v17.5 · Approved test');
  await expect(packagePicker).toContainText('v17.4 · Approved test');
  await expect(packagePicker).toContainText('v17.3 · Approved test');
  await expect(packagePicker).toContainText('v17.2 · Approved test');
  await expect(packagePicker).toContainText('v17.1 · Approved test');
  await expect(packagePicker).toContainText('v17.0 · Approved test');
  await expect(packagePicker).toContainText('v16.9 · Approved test');
  await expect(packagePicker).toContainText('v16.8 · Approved test');
  await expect(packagePicker).toContainText('v16.7 · Approved test');
  await expect(packagePicker).toContainText('v16.6 · Approved test');
  await expect(packagePicker).toContainText('v16.5 · Approved test');
  await expect(packagePicker).toContainText('v16.4 · Approved test');
  await expect(packagePicker).toContainText('v16.3 · Approved test');
  await expect(packagePicker).toContainText('v16.2 · Approved test');
  await expect(packagePicker).toContainText('v16.1 · Approved test');
  await expect(packagePicker).toContainText('v16.0 · Approved test');
  await expect(packagePicker).toContainText('v15.9 · Approved test');
  await expect(packagePicker).toContainText('v15.8 · Approved test');
  await expect(packagePicker).toContainText('v15.7 · Approved test');
  await expect(packagePicker).toContainText('v15.6 · Approved test');
  await expect(packagePicker).toContainText('v15.5 · Approved test');
  await expect(packagePicker).toContainText('v15.4 · Approved test');
  await expect(packagePicker).toContainText('v15.3 · Approved test');
  await expect(packagePicker).toContainText('v15.2 · Approved test');
  await expect(packagePicker).toContainText('v15.1 · Approved test');
  await expect(packagePicker).toContainText('v15.0 · Approved test');
  await expect(packagePicker).toContainText('v14.9 · Approved test');
  await expect(packagePicker).toContainText('v14.8 · Approved test');
  await expect(packagePicker).toContainText('v14.7 · Approved test');
  await expect(packagePicker).toContainText('v14.6 · Approved test');
  await expect(packagePicker).toContainText('v14.5 · Approved test');
  await expect(packagePicker).toContainText('v14.4 · Approved test');
  await expect(packagePicker).toContainText('v14.3 · Approved test');
  await expect(packagePicker).toContainText('v14.2 · Approved test');
  await expect(packagePicker).toContainText('v14.1 · Approved test');
  await expect(packagePicker).toContainText('v14.0 · Approved test');
  await expect(packagePicker).toContainText('v13.9 · Approved test');
  await expect(packagePicker).toContainText('v13.8 · Approved test');
  await expect(packagePicker).toContainText('v13.7 · Approved test');
  await expect(packagePicker).toContainText('v13.6 · Approved test');
  await expect(packagePicker).toContainText('v13.5 · Approved test');
  await expect(packagePicker).toContainText('v13.4 · Approved test');
  await expect(packagePicker).toContainText('v13.3 · Approved test');
  await expect(packagePicker).toContainText('v13.2 · Approved test');
  await expect(packagePicker).toContainText('v13.1 · Approved test');
  await expect(packagePicker).toContainText('v13.0 · Approved test');
  await expect(packagePicker).toContainText('v12.9 · Approved test');
  await expect(packagePicker).toContainText('v12.8 · Approved test');
  await expect(packagePicker).toContainText('v12.7 · Approved test');
  await expect(packagePicker).toContainText('v12.6 · Approved test');
  await expect(packagePicker).toContainText('v12.5 · Approved test');
  await expect(packagePicker).toContainText('v12.4 · Approved test');
  await expect(packagePicker).toContainText('v12.3 · Approved test');
  await expect(packagePicker).toContainText('v12.2 · Approved test');
  await expect(packagePicker).toContainText('v12.1 · Approved test');
  await expect(packagePicker).toContainText('v12.0 · Approved test');
  await expect(packagePicker).toContainText('v11.9 · Approved test');
  await expect(packagePicker).toContainText('v11.8 · Approved test');
  await expect(packagePicker).toContainText('v11.7 · Approved test');
  await expect(packagePicker).toContainText('v11.6 · Approved test');
  await expect(packagePicker).toContainText('v11.5 · Approved test');
  await expect(packagePicker).toContainText('v11.4 · Approved test');
  await expect(packagePicker).toContainText('v11.3 · Approved test');
  await expect(packagePicker).toContainText('v11.2 · Approved test');
  await expect(packagePicker).toContainText('v11.1 · Approved test');
  await expect(packagePicker).toContainText('v11.0 · Approved test');
  await expect(packagePicker).toContainText('v10.9 · Approved test');
  await expect(packagePicker).toContainText('v10.8 · Approved test');
  await expect(packagePicker).toContainText('v10.7 · Approved test');
  await expect(packagePicker).toContainText('v10.6 · Approved test');
  await expect(packagePicker).toContainText('v10.5 · Approved test');
  await expect(packagePicker).toContainText('v10.4 · Approved test');
  await expect(packagePicker).toContainText('v10.3 · Approved test');
  await expect(packagePicker).toContainText('v10.2 · Approved test');
  await expect(packagePicker).toContainText('v10.1 · Approved test');
  await expect(packagePicker).toContainText('v10.0 · Approved test');
  await expect(packagePicker).toContainText('v9.9 · Approved test');
  await expect(packagePicker).toContainText('v9.8 · Approved test');
  await expect(packagePicker).toContainText('v9.7 · Approved test');
  await expect(packagePicker).toContainText('v9.6 · Approved test');
  await expect(packagePicker).toContainText('v9.5 · Approved test');
  await expect(packagePicker).toContainText('v9.4 · Approved test');
  await expect(packagePicker).toContainText('v9.3 · Approved test');
  await expect(packagePicker).toContainText('v9.2 · Approved test');
  await expect(packagePicker).toContainText('v9.1 · Approved test');
  await expect(packagePicker).toContainText('v9.0 · Approved test');
  await expect(packagePicker).toContainText('v8.9 · Approved test');
  await expect(packagePicker).toContainText('v8.8 · Approved test');
  await expect(packagePicker).toContainText('v8.7 · Approved test');
  await expect(packagePicker).toContainText('v8.6 · Approved test');
  await expect(packagePicker).toContainText('v8.5 · Approved test');
  await expect(packagePicker).toContainText('v8.4 · Approved test');
  await expect(packagePicker).toContainText('v8.3 · Approved test');
  await expect(packagePicker).toContainText('v8.2 · Approved test');
  await expect(packagePicker).toContainText('v8.1 · Approved test');
  await expect(packagePicker).toContainText('v8.0 · Approved test');
  await expect(packagePicker).toContainText('v7.9 · Approved test');
  await expect(packagePicker).toContainText('v7.8 · Approved test');
  await expect(packagePicker).toContainText('v7.7 · Approved test');
  await expect(packagePicker).toContainText('v7.6 · Approved test');
  await expect(packagePicker).toContainText('v7.5 · Approved test');
  await expect(packagePicker).toContainText('v7.4 · Approved test');
  await expect(packagePicker).toContainText('v7.3 · Approved test');
  await expect(packagePicker).toContainText('v7.2 · Approved test');
  await expect(packagePicker).toContainText('v7.1 · Approved test');
  await expect(packagePicker).toContainText('v7.0 · Approved test');
  await expect(packagePicker).toContainText('v6.9 · Approved test');
  await expect(packagePicker).toContainText('v6.8 · Approved test');
  await expect(packagePicker).toContainText('v6.7 · Approved test');
  await expect(packagePicker).toContainText('v6.6 · Approved test');
  await expect(packagePicker).toContainText('v6.5 · Approved test');
  await expect(packagePicker).toContainText('v6.4 · Approved test');
  await expect(packagePicker).toContainText('v6.3 · Approved test');
  await expect(packagePicker).toContainText('v6.2 · Approved test');
  await expect(packagePicker).toContainText('v6.1 · Approved test');
  await expect(packagePicker).toContainText('v6.0 · Current production');

  await page.getByRole('button', { name: 'Package versions' }).click();
  const register = page.getByRole('region', { name: 'Every saved build package' });
  const versions = register.locator('.agent-package-version-ledger__list > article');
  const expectedVersions = [
    ['v21.3', 'Development release URLs'],
    ['v21.2', 'Concise Codex reading'],
    ['v21.1', 'Focused Codex settings'],
    ['v21.0', 'Natural Codex reading'],
    ['v20.9', 'Live Workspace phone notifications'],
    ['v20.8', 'Live Workspace Codex branching'],
    ['v20.7', 'Branchable Codex conversations'],
    ['v20.6', 'Codex phone notifications'],
    ['v20.5', 'Selected Codex excerpt actions'],
    ['v20.4', 'Persistent Codex chat surfaces'],
    ['v20.3', 'Restored Codex voice experience'],
    ['v20.2', 'Workspace development Studio'],
    ['v20.1', 'Canonical Workspace entry'],
    ['v20.0', 'Deployed Studio shell'],
    ['v19.9', 'Owner API credits switch'],
    ['v19.8', 'Executable Next Workspace runtime'],
    ['v19.7', 'Next-compatible Workspace runtime'],
    ['v19.6', 'Opaque Workspace frame capability'],
    ['v19.5', 'Reliable Workspace development surfaces'],
    ['v19.4', 'Locked workspace development dependencies'],
    ['v19.3', 'Live Codex launcher recovery'],
    ['v19.2', 'Workspace-hosted editor shell'],
    ['v19.1', 'Client-scoped Codex chats'],
    ['v19.0', 'Studio-owned workspace shell'],
    ['v18.9', 'Renderable Railway Studio'],
    ['v18.8', 'Resilient Studio session recovery'],
    ['v18.7', 'Authenticated Google voice catalogue'],
    ['v18.6', 'Global Google voice catalogue'],
    ['v18.5', 'Live editable Studio runtime'],
    ['v18.4', 'Image-only Codex message'],
    ['v18.3', 'Durable Codex chat session'],
    ['v18.2', 'Selectable Google Codex voices'],
    ['v18.1', 'Deletable queued Codex messages'],
    ['v18.0', 'Seamless Studio hydration'],
    ['v17.9', 'Reliable full-reply reading'],
    ['v17.8', 'Evidence-linked Codex activity'],
    ['v17.7', 'Codex subscription usage'],
    ['v17.6', 'Codex conversation loading'],
    ['v17.5', 'Device voice read aloud'],
    ['v17.4', 'Observable Codex activity'],
    ['v17.3', 'Authenticated Studio controls'],
    ['v17.2', 'Renderable workspace preview'],
    ['v17.1', 'Restartable workspace preview'],
    ['v17.0', 'Stable workspace preview'],
    ['v16.9', 'Agent-team clarity'],
    ['v16.8', 'Message-motion Codex chat'],
    ['v16.7', 'Private workspace preview access'],
    ['v16.6', 'Contextual Codex chat'],
    ['v16.5', 'Inline multi-image Codex chat'],
    ['v16.4', 'Animated Codex chat'],
    ['v16.3', 'Fast Codex chat'],
    ['v16.2', 'Railway container-access'],
    ['v16.1', 'Railway persistent-checkout'],
    ['v16.0', 'Railway workspace-write'],
    ['v15.9', 'Permanent Railway Studio runtime'],
    ['v15.8', 'Subscription-safe Codex runtime'],
    ['v15.7', 'Uninterrupted Codex recovery'],
    ['v15.6', 'Turn-scoped Agent teams'],
    ['v15.5', 'Spacious Codex chat'],
    ['v15.4', 'Resumable Agent team'],
    ['v15.3', 'Clientspace Admin email review'],
    ['v15.2', 'Inbound client email review'],
    ['v15.1', 'Cold prospect offer'],
    ['v15.0', 'Agent team chat'],
    ['v14.9', 'Durable Codex turn recovery'],
    ['v14.8', 'Reliable unmaterialized-chat cleanup'],
    ['v14.7', 'Codex experimental workspace capability'],
    ['v14.6', 'Dual-repository Codex workspace'],
    ['v14.5', 'Codespace interrupted-chat recovery'],
    ['v14.4', 'Recent-prompt chat titles'],
    ['v14.3', 'Camera-roll photo upload'],
    ['v14.2', 'Subscription builder runtime'],
    ['v14.1', 'Compact Codex composer'],
    ['v14.0', 'Markdown Codex chat'],
    ['v13.9', 'Concurrent Codex activity'],
    ['v13.8', 'Codex transcript position'],
    ['v13.7', 'Public Codespace ports'],
    ['v13.6', 'Concurrent Codex chats'],
    ['v13.5', 'Reliable long-page capture'],
    ['v13.4', 'Exact visual chat'],
    ['v13.3', 'Mobile Studio capture'],
    ['v13.2', 'Exact Studio capture'],
    ['v13.1', 'Reliable Codex new-chat'],
    ['v13.0', 'Codespace workspace suite'],
    ['v12.9', 'Codex capture preferences'],
    ['v12.8', 'Codex IDE chat-surface'],
    ['v12.7', 'Codex conversation capture'],
    ['v12.6', 'Codex chat'],
    ['v12.5', 'Visual Codex feedback'],
    ['v12.4', 'Reviewed page-disposition'],
    ['v12.3', 'Editable handoff recovery'],
    ['v12.2', 'Automatic prospect-domain'],
    ['v12.1', 'Automatic Clientspace preview'],
    ['v12.0', 'Captured handoff email'],
    ['v11.9', 'Canonical asset handoff'],
    ['v11.8', 'Clean alternate-test'],
    ['v11.7', 'Made Solid handoff worker liveness'],
    ['v11.6', 'Optional handoff schema'],
    ['v11.5', 'Made Solid source handoff'],
    ['v11.4', 'Agent Studio website tone'],
    ['v11.3', 'Agent learning inbox'],
    ['v11.2', 'Edit version history'],
    ['v11.1', 'Resilient final edit'],
    ['v11.0', 'Editing and handoff pages'],
    ['v10.9', 'Resilient refinement ledger'],
    ['v10.8', 'Live refinement ledger'],
    ['v10.7', 'Codespaces preview URL'],
    ['v10.6', 'Automatic website launch'],
    ['v10.5', 'Immediate source workspace'],
    ['v10.4', 'One-click prospect workspace'],
    ['v10.3', 'Embedded prospect workspace'],
    ['v10.2', 'Non-interactive Codex install'],
    ['v10.1', 'Website tone direction'],
    ['v10.0', 'Visible Codespace setup'],
    ['v9.9', 'Codespace resume startup'],
    ['v9.8', 'Optional SVG generation'],
    ['v9.7', 'Persistent Codespace tmux'],
    ['v9.6', 'Builder-derived colour roles'],
    ['v9.5', 'Codespace setup-ordering'],
    ['v9.4', 'Codespace startup reliability'],
    ['v9.3', 'Logo accent-region'],
    ['v9.2', 'Codespace editing workspace'],
    ['v9.1', 'Accent-only brand'],
    ['v9.0', 'Local refinement handoff'],
    ['v8.9', 'Viewport checks only'],
    ['v8.8', 'Bounded builder request'],
    ['v8.7', 'Actionable builder failure'],
    ['v8.6', 'Mobile viewport integrity'],
    ['v8.5', 'Immediate compact navigation'],
    ['v8.4', 'Settled factual evidence'],
    ['v8.3', 'Forced final-state evidence'],
    ['v8.2', 'Reusable section rhythm'],
    ['v8.1', 'Deterministic final evidence'],
    ['v8.0', 'Settled accessibility'],
    ['v7.9', 'Stable navigation visibility'],
    ['v7.8', 'Checkpoint repair and brand enforcement'],
    ['v7.7', 'Reliable compact navigation test package'],
    ['v7.6', 'Complete checkpoint restore test package'],
    ['v7.5', 'Selected-route compile test package'],
    ['v7.4', 'Creative autonomy test package'],
    ['v7.3', 'Decoded navigation logo test package'],
    ['v7.2', 'Efficient builder execution test package'],
    ['v7.1', 'Immediate brand introduction test package'],
    ['v7.0', 'Responsive intro craft test package'],
    ['v6.9', 'Valid preview entry test package'],
    ['v6.8', 'Precise logo handoff test package'],
    ['v6.7', 'Clean test start package'],
    ['v6.6', 'Meaningful page names test package'],
    ['v6.5', 'Resilient resume test package'],
    ['v6.4', 'Immersive motion test package'],
    ['v6.3', 'Resilient quality test package'],
    ['v6.2', 'Expressive craft test package'],
    ['v6.1', 'Creative composition test package'],
    ['v6.0', 'Current production'],
  ];
  await expect(versions).toHaveCount(expectedVersions.length);
  await expect(versions.nth(0)).toContainText('Approved test');
  for (const [version, summary] of expectedVersions) {
    const versionCard = versions.filter({
      has: page.getByRole('heading', { exact: true, name: version }),
    });
    await expect(versionCard).toHaveCount(1);
    await expect(versionCard).toContainText(summary);
  }
  await expect(versions.nth(0)).toHaveScreenshot('local-refinement-handoff-package-register.png');

  const accessibility = await new AxeBuilder({ page })
    .include('.agent-package-version-ledger')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('offers a responsive saved-source recheck on completed test evidence', async ({
  page,
}, testInfo) => {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-08-06T10:30:00.000Z';
    const transaction = database.transaction('builderRuns', 'readwrite');
    transaction.objectStore('builderRuns').put({
      id: 'builder-saved-source-recheck',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'homepage_test',
      agentPackageId: 'agent-package-local-v7-7-reliable-compact-navigation',
      agentPackageVersion: 7.7,
      sourceCheckpointAvailable: true,
      status: 'review_required',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'complete',
      progressDetail: 'Private homepage review complete.',
      totalItems: 7,
      completedItems: 7,
      failureContext: {},
      qualitySummary: {
        status: 'failed',
        checks: [
          {
            id: 'responsive-interactions',
            label: 'Responsive interaction contract',
            status: 'failed',
            detail: 'Compact navigation focus requires protected runtime repair.',
          },
        ],
        generatedAt: now,
      },
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const quality = page.locator('.builder-quality');
  await expect(quality).toHaveAttribute('open', '');
  await expect(quality.getByRole('button', { name: 'Recheck saved source' })).toBeVisible();
  await expect(quality).toContainText('without a Codex page generation pass');
  await expect(quality).toHaveScreenshot('saved-source-quality-recheck.png');
  const accessibility = await new AxeBuilder({ page }).include('.builder-quality').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  expect(testInfo.project.name).toMatch(/mobile|tablet|desktop/);
});

test('makes prospect build failures and identity obvious while keeping replacement controls advanced', async ({
  page,
}, testInfo) => {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-08-24T12:00:00.000Z';
    const longNavigationDetail = `The compact navigation failed after Escape. ${'Affected responsive route at 375px. '.repeat(30)}`;
    const transaction = database.transaction('builderRuns', 'readwrite');
    transaction.objectStore('builderRuns').put({
      id: 'f906bbf7-a333-4bfa-bcfb-f667e7f1259b',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'full_site',
      agentPackageId: 'agent-package-local-v6',
      agentPackageVersion: 6,
      sourceCheckpointAvailable: true,
      status: 'review_required',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'complete',
      progressDetail: 'Private preview generated with quality review required before sharing.',
      totalItems: 8,
      completedItems: 8,
      failureContext: {},
      qualitySummary: {
        status: 'failed',
        checks: [
          {
            id: 'responsive-interactions',
            label: 'Responsive interaction contract',
            status: 'failed',
            detail: longNavigationDetail,
          },
          {
            id: 'nested-page-reachability',
            label: 'Nested page reachability',
            status: 'failed',
            detail: 'Seven selected nested routes cannot be reached from the homepage.',
          },
          {
            id: 'semantic-content-coverage',
            label: 'Approved recovered-content coverage',
            status: 'failed',
            detail: 'The approved test-and-tag table does not preserve every reviewed value.',
          },
          {
            id: 'accessibility',
            label: 'Accessibility analysis',
            status: 'passed',
            detail: 'No automated accessibility violations were detected.',
          },
        ],
        generatedAt: now,
      },
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.goto('/#/prospects/business-demo-local-services/redesign');
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const prospectBuilder = page.locator('.builder-run').filter({
    has: page.getByRole('heading', { name: 'Latest full-site build' }),
  });
  const identity = prospectBuilder.getByRole('region', { name: 'Current build identity' });
  await expect(identity).toContainText('Build f906bbf7');
  await expect(identity).toContainText('f906bbf7-a333-4bfa-bcfb-f667e7f1259b');

  const attention = prospectBuilder.getByRole('alert');
  await expect(attention.getByRole('heading', { name: '3 quality checks failed' })).toBeVisible();
  await expect(attention).toContainText('Not client-ready');
  await expect(attention).toContainText('Responsive interaction contract');
  await expect(attention).toContainText('Nested page reachability');
  await expect(attention).toContainText('Approved recovered-content coverage');
  await expect(attention.getByRole('button', { name: 'Repair 3 failed checks' })).toBeVisible();
  await expect(
    attention.getByRole('button', { name: 'Inspect failed private preview' }),
  ).toBeVisible();
  await expect(attention.getByRole('button', { name: 'View quality evidence' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review build inputs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build Manifest ready' })).toHaveCount(0);

  const quality = prospectBuilder.locator('.builder-quality');
  await expect(quality).toHaveAttribute('open', '');
  await expect(quality.locator('li').first()).toContainText('Responsive interaction contract');
  await expect(quality).toContainText('3 failed · 1 passed');
  await expect(quality.getByText('Technical details', { exact: true })).toHaveCount(1);
  const passedChecks = quality.locator('.builder-quality__passed');
  await expect(passedChecks).not.toHaveAttribute('open', '');
  await expect(passedChecks.getByText('Accessibility analysis')).toBeHidden();

  const advanced = prospectBuilder.locator('.builder-new-build-options');
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(advanced.locator('summary')).toContainText('Other recovery options');
  expect(
    await prospectBuilder.evaluate((builder) => {
      const qualityEvidence = builder.querySelector('.builder-quality');
      const recoveryOptions = builder.querySelector('.builder-new-build-options');
      return Boolean(
        qualityEvidence &&
        recoveryOptions &&
        (qualityEvidence.compareDocumentPosition(recoveryOptions) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
      );
    }),
  ).toBe(true);
  expect(
    await page.locator('.brief-panel').evaluate((panel) => {
      const currentBuild = panel.querySelector('.builder-run');
      const buildInputs = panel.querySelector('.builder-inputs');
      return Boolean(
        currentBuild &&
        buildInputs &&
        (currentBuild.compareDocumentPosition(buildInputs) & Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
      );
    }),
  ).toBe(true);
  await expect(
    advanced.getByRole('button', { name: 'Start clean replacement build' }),
  ).toBeHidden();
  await expect(attention).toHaveScreenshot('prospect-build-quality-attention.png');
  const advancedSummary = advanced.locator('summary');
  await advancedSummary.focus();
  await advancedSummary.press('Enter');
  await expect(advanced).toHaveAttribute('open', '');
  await expect(
    advanced.getByRole('button', { name: 'Start clean replacement build' }),
  ).toBeVisible();
  expect((await advancedSummary.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const accessibility = await new AxeBuilder({ page }).include('.builder-run').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  expect(testInfo.project.name).toMatch(/mobile|tablet|desktop/);
});

test('keeps a failed test available without blocking another test', async ({ page }, testInfo) => {
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-08-02T15:10:00.000Z';
    const transaction = database.transaction('builderRuns', 'readwrite');
    transaction.objectStore('builderRuns').put({
      id: 'builder-failed-non-blocking-test',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'page_test',
      targetSourceUrls: ['https://example.com/services'],
      agentPackageId: 'agent-package-local-v6-9-valid-preview-entry',
      agentPackageVersion: 6.9,
      sourceCheckpointAvailable: true,
      status: 'failed',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'failed',
      progressDetail: 'Verification stopped on an older saved runtime.',
      totalItems: 7,
      completedItems: 3,
      failureCode: 'builder_unexpected_failure',
      failureStage: 'worker_runtime',
      failureAction: 'Review the frozen draft or start another test.',
      failureContext: { detail: 'Protected runtime verification failed.' },
      qualitySummary: { status: 'failed', checks: [], generatedAt: now },
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const stoppedTest = page.locator('.builder-active-test');
  await expect(stoppedTest).toContainText('needs attention');
  await expect(stoppedTest.getByRole('button', { name: 'Test something else' })).toBeVisible();
  await expect(stoppedTest).toHaveScreenshot('failed-test-recovery-actions.png');

  const alternativeTestButton = stoppedTest.getByRole('button', { name: 'Test something else' });
  await alternativeTestButton.focus();
  await alternativeTestButton.press('Enter');
  const chooser = page.locator('.builder-run__tests');
  await expect(chooser).toBeVisible();
  await expect(page.getByLabel('Test agent package')).toHaveValue(
    'agent-package-local-v19-4-locked-workspace-dev-dependencies',
  );
  await expect(chooser.getByLabel('Create page from scratch')).toBeChecked();
  await expect(chooser.getByLabel('Previous built page')).toHaveCount(0);
  await expect(chooser.locator('.builder-page-set__options input:checked')).toHaveCount(1);
  await expect(chooser.locator('.builder-page-set__group--selected')).toContainText('Home');
  await expect(chooser.locator('.builder-page-set__group--selected')).not.toContainText('Services');
  await expect(chooser).toHaveScreenshot('failed-test-alternate-test-chooser.png');

  const accessibility = await new AxeBuilder({ page }).include('.builder-run').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  if (testInfo.project.name === 'mobile') {
    const button = await page.getByRole('button', { name: 'Build test page' }).boundingBox();
    expect(button?.height).toBeGreaterThanOrEqual(44);
  }
});

test('offers a saved full-site resume after a provider account failure', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openReadyBuildManifest(page);
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = '2026-08-06T15:10:00.000Z';
    const transaction = database.transaction('builderRuns', 'readwrite');
    transaction.objectStore('builderRuns').put({
      id: 'builder-failed-provider-credits',
      businessId: 'business-demo-local-services',
      buildManifestId: 'manifest-layout-check',
      buildMode: 'full_site',
      agentPackageId: 'agent-package-local-v6',
      agentPackageVersion: 6,
      sourceCheckpointAvailable: true,
      status: 'failed',
      templateVersion: 'made-solid-studio-next-builder-v2',
      progressPhase: 'failed',
      progressDetail: 'The protected Codex API account has no credits remaining.',
      totalItems: 7,
      completedItems: 2,
      errorSummary: 'The protected Codex API account has no credits remaining.',
      failureCode: 'codex_api_credits_exhausted',
      failureStage: 'worker_configuration',
      failureAction:
        'Add credits to the worker API account, then resume this build from its saved private source checkpoint.',
      failureContext: { provider: 'openai', reason: 'credits_exhausted', attempt: 1 },
      qualitySummary: { status: 'not_run', checks: [], generatedAt: now },
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const prospectBuilder = page.locator('.builder-run').filter({
    has: page.getByRole('heading', { name: 'Latest full-site build' }),
  });
  await expect(prospectBuilder).toContainText('no credits remaining');
  await expect(
    prospectBuilder.getByRole('button', { name: 'Resume saved website build' }),
  ).toBeVisible();
  const advanced = prospectBuilder.locator('.builder-new-build-options');
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(
    prospectBuilder.getByRole('button', { name: 'Start clean website build' }),
  ).toBeHidden();
  await expect(prospectBuilder).toHaveScreenshot('failed-full-site-provider-recovery.png');
  await advanced.locator('summary').click();
  await expect(
    prospectBuilder.getByRole('button', { name: 'Start clean website build' }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('.builder-run').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  expect(testInfo.project.name).toMatch(/mobile|tablet|desktop/);
});

test('shows a responsive whole-site source and linked Agent Studio version UI', async ({
  page,
}, testInfo) => {
  await seedAgentStudioWholeSiteSource(page);

  await expect(page.locator('.builder-run__action-label')).toHaveText('Test');
  await page.getByRole('radio', { name: 'Revise a website' }).check();
  await expect(page.getByRole('heading', { name: 'Revise a website' })).toBeVisible();
  await expect(page.getByLabel('Website version to revise')).toContainText('2 pages');
  await expect(
    page
      .locator('.builder-page-test__website')
      .getByText('Multi-page navigation architecture', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Feature direction')).toHaveValue(
    /Repair the multi-page navigation architecture/,
  );
  await expect(page.getByRole('button', { name: 'Revise website' })).toBeEnabled();
  const lineage = page.getByRole('region', { name: 'Feature test versions' });
  const versions = lineage.locator('li');
  await expect(versions).toHaveCount(2);
  await expect(versions.nth(0)).toContainText('Version 2');
  await expect(versions.nth(0)).toContainText('Feature tested: Multi-page navigation architecture');
  await expect(versions.nth(1)).toContainText('Original build');
  await expect(lineage).toContainText('Original build');
  await expect(lineage).toContainText('2 pages');
  const pageDisclosure = lineage.getByRole('button', { name: '2 pages built' }).first();
  await pageDisclosure.click();
  await expect(pageDisclosure).toHaveAttribute('aria-expanded', 'true');
  const builtPages = lineage.getByRole('list', { name: 'Built pages' }).first();
  await expect(builtPages).toContainText('Home');
  await expect(builtPages).toContainText('/');
  await expect(builtPages).toContainText('Services');
  await expect(builtPages).toContainText('/services/');
  const testVersions = page.getByRole('region', { name: 'Test versions', exact: true });
  const homepagePages = testVersions.getByRole('button', { name: '1 page built' });
  await homepagePages.focus();
  await expect(homepagePages).toBeFocused();
  await homepagePages.press('Enter');
  await expect(testVersions.getByRole('list', { name: 'Built pages' })).toContainText('Home');
  await expect(lineage.getByRole('button', { name: 'Use as source' }).first()).toBeVisible();
  const openApprovedWebsite = lineage.getByRole('button', { name: 'Preview website' }).first();
  await expect(openApprovedWebsite).toHaveCSS('color', 'rgb(13, 13, 13)');
  await openApprovedWebsite.hover();
  await expect(openApprovedWebsite).toHaveCSS('color', 'rgb(13, 13, 13)');
  await openApprovedWebsite.focus();
  await expect(openApprovedWebsite).toBeFocused();
  const browseFiles = lineage.getByRole('button', { name: 'Browse files' });
  await expect(browseFiles).toHaveCount(2);
  await browseFiles.first().click();
  const generatedFiles = page.getByRole('dialog', { name: 'Generated files' });
  await expect(generatedFiles).toBeVisible();
  await expect(generatedFiles).toContainText(
    'Compiled site contains the browser-ready files produced from that source.',
  );
  const previewWebsite = generatedFiles.getByRole('button', { name: 'Preview website' });
  if (await previewWebsite.isVisible().catch(() => false)) {
    await generatedFiles.getByRole('tab', { name: /Compiled site/ }).click();
    await generatedFiles.getByRole('button', { name: /index\.html/ }).click();
    await expect(previewWebsite).toHaveCount(1);
    await expect(generatedFiles).toContainText('This pane shows the saved HTML source.');
    await expect(generatedFiles.getByRole('link', { name: /Open index\.html/ })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Close generated files' }).click();
  await expect(generatedFiles).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include('.builder-page-test__website')
    .include('.test-build-versions--lineage')
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByLabel('Website version to revise').focus();
  await expect(page.getByLabel('Website version to revise')).toBeFocused();
  await page.getByLabel('Website version to revise').evaluate((element) => element.blur());
  await expect(page.locator('.builder-page-test__website')).toHaveScreenshot(
    'agent-studio-website-revision.png',
  );
  await expect(page.locator('.builder-run__tests')).toHaveScreenshot(
    'agent-studio-test-chooser.png',
  );
  await expect(lineage).toHaveScreenshot('agent-studio-version-lineage.png');

  if (testInfo.project.name === 'mobile') {
    const actionBox = await page.getByRole('button', { name: 'Revise website' }).boundingBox();
    expect(actionBox?.height).toBeGreaterThanOrEqual(44);
  }
});

test('separates test refinement from the published builder agent package', async ({
  page,
}, testInfo) => {
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storedPackages = JSON.parse(packageRecord.value);
    const publishedPackage = Array.isArray(storedPackages)
      ? storedPackages.find((agentPackage) => agentPackage.status === 'published')
      : storedPackages;
    const now = new Date().toISOString();
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify([
        {
          ...publishedPackage,
          stagedBehaviourIds: [],
        },
        {
          ...publishedPackage,
          id: 'agent-package-release-v7',
          version: 7,
          status: 'test_ready',
          basePackageId: publishedPackage.id,
          builderContractVersion: 'made-solid-studio-builder-agent-v7.0',
          summary: 'Five tested behaviours staged for the next production package.',
          stagedBehaviourIds: [
            'hero-handoff',
            'brand-introduction',
            'responsive-sidebar',
            'contextual-logo-selection',
            'visual-content-recovery',
          ],
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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.getByRole('button', { name: 'Package versions' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/versions\/business-demo-local-services$/);
  await expect(page.getByRole('heading', { name: 'Build package versions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Package versions' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const versionsHeaderActions = page.locator('.agent-studio__header-actions');
  await expect(versionsHeaderActions.locator('.status-badge')).toHaveCount(0);
  const [refineBox, architectureBox, versionsBox, settingsBox] = await Promise.all([
    versionsHeaderActions.getByRole('button', { name: 'Refine', exact: true }).boundingBox(),
    versionsHeaderActions.getByRole('button', { name: 'Agent architecture' }).boundingBox(),
    versionsHeaderActions.getByRole('button', { name: 'Package versions' }).boundingBox(),
    versionsHeaderActions.getByRole('button', { name: 'Builder settings' }).boundingBox(),
  ]);
  expect(refineBox).not.toBeNull();
  expect(architectureBox).not.toBeNull();
  expect(versionsBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  if (refineBox && architectureBox && versionsBox && settingsBox) {
    expect(architectureBox.y > refineBox.y || architectureBox.x > refineBox.x).toBeTruthy();
    expect(versionsBox.y > architectureBox.y || versionsBox.x > architectureBox.x).toBeTruthy();
    expect(settingsBox.y > versionsBox.y || settingsBox.x > versionsBox.x).toBeTruthy();
    if (testInfo.project.name === 'desktop') {
      const controlCenters = [refineBox, architectureBox, versionsBox, settingsBox].map(
        (box) => box.y + box.height / 2,
      );
      expect(Math.max(...controlCenters) - Math.min(...controlCenters)).toBeLessThanOrEqual(1);
    }
  }
  await expect(page.locator('.agent-studio__header')).toHaveScreenshot(
    'agent-package-versions-header.png',
  );
  await expect(page.getByRole('heading', { name: 'Every saved build package' })).toBeVisible();
  const versionCards = page.locator('.agent-package-version-ledger__list article');
  await expect(versionCards).toHaveCount(142);
  await expect(versionCards.first().getByRole('heading')).toHaveText('v20.0');
  const stagedV7Card = versionCards.filter({
    hasText: 'Five tested behaviours staged for the next production package.',
  });
  await expect(stagedV7Card).toHaveCount(1);
  await expect(stagedV7Card.getByRole('heading')).toHaveText('v7.0');
  await expect(versionCards.last().getByRole('heading')).toHaveText('v6.0');
  await expect(page.locator('.agent-package-version-ledger')).toContainText(
    'Newest exact release first',
  );
  await expect(page.locator('.agent-package-version-ledger')).toContainText(
    'Available only to private package tests',
  );
  await expect(page.locator('.agent-package-version-ledger > header')).toHaveScreenshot(
    'agent-package-version-register-header.png',
  );
  await expect(
    page.locator('.agent-package-version-ledger__list article').first(),
  ).toHaveScreenshot('agent-package-version-test-card.png');
  await expect(page.locator('.agent-package-version-ledger__list article').last()).toHaveScreenshot(
    'agent-package-version-production-card.png',
  );
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.setViewportSize({ width: 375, height: 812 });
  }
  await expect(page.getByRole('heading', { name: /Builder agent package/i })).toBeVisible();
  const publishedAgentRow = page.locator('.agent-package-config__published-row');
  await expect(
    publishedAgentRow.getByText('Published builder agent', { exact: true }),
  ).toBeVisible();
  await expect(publishedAgentRow.getByText('Published', { exact: true })).toBeVisible();
  const [publishedSubtitleBox, publishedBadgeBox] = await Promise.all([
    publishedAgentRow.getByText('Published builder agent', { exact: true }).boundingBox(),
    publishedAgentRow.getByText('Published', { exact: true }).boundingBox(),
  ]);
  expect(publishedSubtitleBox).not.toBeNull();
  expect(publishedBadgeBox).not.toBeNull();
  if (publishedSubtitleBox && publishedBadgeBox) {
    expect(
      Math.abs(
        publishedSubtitleBox.y +
          publishedSubtitleBox.height / 2 -
          (publishedBadgeBox.y + publishedBadgeBox.height / 2),
      ),
    ).toBeLessThanOrEqual(1);
    expect(publishedBadgeBox.x).toBeGreaterThan(publishedSubtitleBox.x);
  }
  await expect(page.locator('.agent-package-config')).toContainText(
    'made-solid-studio-builder-agent-v6.0',
  );
  await expect(page.locator('.agent-package-config')).not.toContainText('siteforge-codex-builder');
  await expect(page.locator('.agent-package-config__header')).toHaveScreenshot(
    'agent-published-header.png',
  );
  await expect(page.getByRole('heading', { name: 'Create production v7.0' })).toBeVisible();
  await expect(page.getByText('5 tested features are staged')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete homepage test first' })).toBeDisabled();
  const releaseFeatures = page.getByRole('list', {
    name: 'Features included in agent package v7.0',
  });
  await expect(releaseFeatures.getByRole('listitem')).toHaveCount(5);
  await expect(releaseFeatures).toContainText('Brand introduction');
  await expect(releaseFeatures).toContainText('Visible hero entrance after the logo handoff');
  await expect(releaseFeatures).toContainText('Mobile & tablet sidebar navigation');
  await expect(releaseFeatures).toContainText('Context-aware logo selection');
  await expect(releaseFeatures).toContainText('Semantic recovery from image-based content');
  await expect(page.locator('.agent-package-config__release-callout')).toHaveScreenshot(
    'agent-production-release-callout.png',
  );
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const packages = JSON.parse(packageRecord.value);
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify(
        packages.map((agentPackage) =>
          agentPackage.id === 'agent-package-release-v7'
            ? { ...agentPackage, status: 'production_ready', updatedAt: new Date().toISOString() }
            : agentPackage,
        ),
      ),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Production draft v7.0' })).toBeVisible();
  await expect(
    page.locator('.agent-package-config__release-callout').getByText('Unpublished draft'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish v7.0 to production' })).toBeEnabled();
  await expect(page.locator('.agent-package-config__release-callout')).toHaveScreenshot(
    'agent-production-draft-callout.png',
  );
  await expect(page.getByRole('heading', { name: 'Built-in features by version' })).toBeVisible();
  const productionVersionSelect = page.getByRole('combobox', { name: 'Production version' });
  await expect(productionVersionSelect).toHaveValue('agent-package-release-v7');
  await expect(
    page
      .getByRole('list', { name: 'Changes introduced in agent package v7.0' })
      .getByRole('listitem'),
  ).toHaveCount(5);
  await expect(
    page
      .getByRole('list', { name: 'Complete feature inventory for agent package v7.0' })
      .getByRole('listitem'),
  ).toHaveCount(7);
  await productionVersionSelect.selectOption('agent-package-local-v6');
  await expect(page.getByRole('heading', { name: 'Published v6.0 baseline' })).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Complete feature inventory for agent package v6.0' })
      .getByRole('listitem'),
  ).toHaveCount(2);
  await expect(
    page.getByText('This published lineage root has no version-level feature additions recorded.'),
  ).toBeVisible();
  await productionVersionSelect.selectOption({
    label: 'v7.0 · Unpublished production draft',
  });
  await expect(page.getByRole('heading', { name: 'Changes from v6.0' })).toBeVisible();
  await expect(page.locator('.production-feature-versions__header')).toHaveScreenshot(
    'production-feature-version-controls.png',
  );
  await expect(page.locator('.production-feature-versions__overview')).toHaveScreenshot(
    'production-feature-version-inspector.png',
  );
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

  const brandFeature = featureImplementation.locator('article').filter({
    hasText: 'Brand introduction',
  });
  await brandFeature
    .getByRole('button', {
      name: /worker\/builder-template\/src\/components\/foundation\/site-runtime\.tsx/i,
    })
    .click();
  const featureDialog = page.getByRole('dialog', { name: 'Motion runtime' });
  await expect(featureDialog.locator('.is-changed')).not.toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    page.getByText(/\d+ unpublished packages derived from this production package\./),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Agent architecture' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/agent\/business-demo-local-services$/);
  await expect(page.getByRole('heading', { name: 'Builder agent architecture' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Every saved build package' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Built-in features by version' })).toHaveCount(0);
  await expect(page.locator('.agent-studio__header')).toHaveScreenshot(
    'agent-architecture-header.png',
  );
  const architectureMapTrigger = page.getByRole('button', { name: 'Open architecture map' });
  await expect(architectureMapTrigger).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How a website build is assembled' })).toHaveCount(
    0,
  );
  await architectureMapTrigger.click();
  const architectureMapDialog = page.getByRole('dialog', {
    name: 'How a website build is assembled',
  });
  await expect(architectureMapDialog).toBeVisible();
  await expect(architectureMapDialog.locator('ol > li')).toHaveCount(5);
  await expect(
    architectureMapDialog.getByText('Built-in capabilities', { exact: true }),
  ).toBeVisible();
  await expect(architectureMapDialog.getByText('Build direction', { exact: true })).toBeVisible();
  await expect(architectureMapDialog).toHaveScreenshot('agent-architecture-map.png');
  await page.keyboard.press('Escape');
  await expect(architectureMapDialog).toBeHidden();
  await expect(architectureMapTrigger).toBeFocused();
  await expect(page.getByText('Built-in capabilities', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Build direction', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Directions can propose a capability, not create one' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create a derived test package' })).toHaveCount(0);
  await expect(page.getByText('Refine the package', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(/Direction for a v7 test package/i)).toHaveCount(0);
  await expect(page.locator('.agent-package-config')).toContainText(
    'made-solid-studio-next-builder-v2',
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await page.getByRole('button', { name: 'Agent policy Builder contract' }).click();
  const fileDialog = page.getByRole('dialog', { name: 'Builder contract' });
  await expect(fileDialog).toBeVisible();
  await expect(fileDialog.locator('pre')).toContainText('Made Solid Studio Codex Builder Contract');
  await page.keyboard.press('Escape');
  await expect(fileDialog).toBeHidden();

  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('siteforge-os');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('meta', 'readwrite');
    const store = transaction.objectStore('meta');
    const packageRecord = await new Promise((resolve, reject) => {
      const request = store.get('agent-package-v6');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const packages = JSON.parse(packageRecord.value);
    store.put({
      id: 'agent-package-v6',
      value: JSON.stringify(
        packages.map((agentPackage) => {
          if (agentPackage.id === 'agent-package-release-v7') {
            return {
              ...agentPackage,
              status: 'published',
              updatedAt: new Date().toISOString(),
              publishedAt: new Date().toISOString(),
            };
          }
          return agentPackage.status === 'published'
            ? { ...agentPackage, status: 'superseded' }
            : agentPackage;
        }),
      ),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.getByRole('button', { name: 'Package versions' }).click();
  await expect(page).toHaveURL(/\/agent-studio\/versions\/business-demo-local-services$/);
  await expect(page.locator('.agent-studio__header').getByText('Published v7')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Builder agent package · v7' })).toBeVisible();
  await expect(page.locator('.agent-package-config')).toContainText(
    'made-solid-studio-builder-agent-v7',
  );
  await expect(
    page
      .getByRole('list', { name: 'Features included in agent package v7.0' })
      .getByRole('listitem'),
  ).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Publish v7 to production' })).toHaveCount(0);
  await expect(
    page.getByLabel('4 new agent features awaiting production approval').first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Refine', exact: true }).click();
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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
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
  await mockStudioPushNotifications(page);
  await page.goto('/#/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Codex Cloud' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Codex completion notifications' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn on phone notifications' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Codex Cloud' })).toHaveAttribute(
    'href',
    'https://chatgpt.com/codex',
  );
  await expect(page.getByText('API calls blocked')).toBeVisible();
  await page.getByRole('button', { name: 'Builder settings' }).click();
  const panel = page.getByRole('dialog', { name: 'Builder settings' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('gpt-5.6');
  await expect(panel).toContainText('ChatGPT subscription only');
  await expect(panel).toContainText('API-key fallback');
  await expect(panel).toContainText('Blocked');
  await expect(panel).toContainText('Workspace write only');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Builder settings' })).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const notificationAccessibility = await new AxeBuilder({ page })
    .include('.settings-notifications')
    .analyze();
  expect(notificationAccessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot('settings-codex-phone-notifications.png', {
    fullPage: true,
  });
});

test('turns real device push notifications on and off from Settings', async ({ page }) => {
  await mockStudioPushNotifications(page);
  const requests = [];
  await page.route('**/__made-solid/codex-notifications', async (route) => {
    requests.push(route.request().postDataJSON?.() ?? null);
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body:
        route.request().method() === 'GET'
          ? JSON.stringify({
              status: 'ready',
              publicKey:
                'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            })
          : JSON.stringify({ status: 'ready' }),
    });
  });

  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Turn on phone notifications' }).click();
  await expect(page.getByText('On for this phone')).toBeVisible();
  expect(requests.some((request) => request?.action === 'subscribe')).toBe(true);
  await page.getByRole('button', { name: 'Turn off phone notifications' }).click();
  await expect(page.getByText('Off', { exact: true })).toBeVisible();
  expect(requests.some((request) => request?.action === 'unsubscribe')).toBe(true);
});

test('shows a useful retry message when the notification runtime returns an empty response', async ({
  page,
}) => {
  await mockStudioPushNotifications(page);
  await page.route('**/__made-solid/codex-notifications', async (route) => {
    await route.fulfill({ body: '', status: 404 });
  });

  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Turn on phone notifications' }).click();

  await expect(page.getByText('Needs attention')).toBeVisible();
  await expect(
    page.getByText(
      'Phone notifications are not ready on this Studio server yet. Refresh and try again.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText(/Unexpected end of JSON input/)).toHaveCount(0);
});

test('opens builder settings from the Agent Studio header', async ({ page }) => {
  await openReadyBuildManifest(page);
  await page.goto('/#/agent-studio/refine/business-demo-local-services');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();

  const studio = page.locator('.agent-studio');
  const settingsButton = studio.getByRole('button', { name: 'Builder settings' });
  await expect(settingsButton).toBeVisible();
  await expect(settingsButton).toHaveClass(/button--icon/);
  const [actionsBox, settingsBox] = await Promise.all([
    studio.locator('.agent-studio__header-actions').boundingBox(),
    settingsButton.boundingBox(),
  ]);
  expect(actionsBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(settingsBox.x).toBeGreaterThanOrEqual(actionsBox.x - 1);
  expect(settingsBox.x + settingsBox.width).toBeLessThanOrEqual(
    actionsBox.x + actionsBox.width + 1,
  );
  expect(settingsBox.y).toBeGreaterThanOrEqual(actionsBox.y - 1);
  expect(settingsBox.height).toBeGreaterThanOrEqual(43.9);
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
  await expect
    .poll(() =>
      navigation.locator('.brand__mark').evaluate((mark) => {
        const accentSwatch = document.createElement('span');
        accentSwatch.style.backgroundColor = 'var(--color-accent)';
        document.body.append(accentSwatch);
        const accentColor = getComputedStyle(accentSwatch).backgroundColor;
        accentSwatch.remove();
        return getComputedStyle(mark).backgroundColor === accentColor;
      }),
    )
    .toBe(true);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('renders workspace content with dark-mode surfaces', async ({ page }, testInfo) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('dark-palette-check.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await selectWorkspaceSection(page, 'Packet');

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

  await waitForWorkspaceSync(page);
  await expect(page).toHaveScreenshot('dark-workspace.png', { fullPage: true });
});

test('creates a persistent prospect workspace from a public URL', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('acme-plumbing.example');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.locator('.toast')).toContainText('Prospect created');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCSS('animation-name', /(?:^|,\s*)toast-in(?:,|$)/);
  const toastBox = await page.locator('.toast-region').boundingBox();
  expect(toastBox).not.toBeNull();
  expect(toastBox.x).toBeGreaterThanOrEqual(12);
  await page.getByRole('button', { name: 'View prospect' }).click();
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await selectWorkspaceSection(page, 'Research');
  await expect(
    page.getByText('The website capture is queued for the protected worker'),
  ).toBeVisible();
  await selectWorkspaceSection(page, 'Assets');
  await expect(page.getByRole('heading', { name: 'Asset review' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No captured assets' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await selectWorkspaceSection(page, 'Research');
  await expect(page).toHaveURL(/\/research$/);
  await page.reload();
  await expectWorkspaceSectionSelected(page, 'Research');
  await expect(
    page.getByText('The website capture is queued for the protected worker'),
  ).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await expectWorkspaceSectionSelected(page, 'Research');
  await selectWorkspaceSection(page, 'Overview');
  const task = page.getByLabel('Verify business identity, services, and contact details.');
  await task.check({ force: true });
  await expect(task).toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open('siteforge-os');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const transaction = database.transaction('tasks', 'readonly');
        const tasks = await new Promise((resolve, reject) => {
          const request = transaction.objectStore('tasks').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        database.close();
        const businessId = window.location.hash.split('/')[2];
        return tasks.find(
          (candidate) =>
            candidate.businessId === businessId &&
            candidate.body === 'Verify business identity, services, and contact details.',
        )?.state;
      }),
    )
    .toBe('done');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Acme Plumbing' })).toBeVisible();
  await expectWorkspaceSectionSelected(page, 'Overview');
  await expect(task).toBeChecked();
});

test('queues one private website capture and keeps its state after reload', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByLabel('Public website URL').fill('capture-foundation.example');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'View prospect' }).click();
  await selectWorkspaceSection(page, 'Research');

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
  await selectWorkspaceSection(page, 'Activity');
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
  await selectWorkspaceSection(page, 'Research');
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
  await selectWorkspaceSection(page, 'Research');

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
  await selectWorkspaceSection(page, 'Activity');

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
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await expect(page).toHaveScreenshot('made-solid-studio.png', { fullPage: true });
});
