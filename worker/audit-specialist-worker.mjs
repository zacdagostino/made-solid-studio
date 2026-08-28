/* global CSS, Element, document, window */

import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { generateSpecialistAuditFindings } from './audit-rules.mjs';
import {
  orderedResponsiveProfiles,
  responsiveBrowserContextOptions,
} from './responsive-browser-profiles.mjs';
import { assertPublicUrl, isRobotsAllowed } from './security.mjs';
import { analysePageUxWithVision, uxVisionConfigured } from './ux-vision.mjs';
import { normaliseVisionObservations, rankVisionCandidates } from './ux-vision-contract.mjs';

const artifactBucket = 'siteforge-artifacts';
const auditRobotsUserAgent = 'SiteForgeResearchBot/0.1 (+https://siteforge.local/research)';
const requestTimeoutMs = 45_000;
const maxVisualPages = 4;
const visualViewports = orderedResponsiveProfiles(['mobile', 'tablet', 'desktop']);

class SpecialistCancelledError extends Error {
  constructor() {
    super('Specialist audit cancelled by a workspace user.');
    this.name = 'SpecialistCancelledError';
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the specialist audit worker.`);
  return value;
}

function safeErrorSummary(error) {
  const message = error instanceof Error ? error.message : '';
  if (/robots|blocked network|public HTTP|public HTTPS/i.test(message)) return message;
  if (/UX vision is not configured/i.test(message)) {
    return 'Visual UX analysis is not configured on the protected worker. Add the server-only vision API key and retry the audit.';
  }
  if (/UX vision request failed|UX vision returned/i.test(message)) {
    return 'Visual UX analysis could not complete. The saved screenshots remain private; retry the audit after checking the model connection.';
  }
  if (/timeout|timed out/i.test(message))
    return 'A selected public page did not become ready in time.';
  return 'The protected specialist worker could not complete this audit section.';
}

function sourceUrl(artifact) {
  return typeof artifact.metadata?.sourceUrl === 'string' ? artifact.metadata.sourceUrl : undefined;
}

async function downloadJson(client, artifact) {
  const { data, error } = await client.storage
    .from(artifact.storage_bucket)
    .download(artifact.storage_path);
  if (error || !data) return undefined;
  try {
    return JSON.parse(await data.text());
  } catch {
    return undefined;
  }
}

async function taskState(client, task) {
  const [taskResult, auditResult] = await Promise.all([
    client
      .from('audit_specialist_tasks')
      .select('status, worker_id, cancel_requested_at')
      .eq('id', task.id)
      .maybeSingle(),
    client.from('audits').select('cancel_requested_at').eq('id', task.audit_id).maybeSingle(),
  ]);
  if (taskResult.error || auditResult.error) {
    throw new Error('The specialist worker could not confirm the task state.');
  }
  if (taskResult.data?.cancel_requested_at || auditResult.data?.cancel_requested_at) {
    throw new SpecialistCancelledError();
  }
  return taskResult.data;
}

async function assertTaskActive(client, task, workerId) {
  const state = await taskState(client, task);
  if (!state || state.status !== 'running' || state.worker_id !== workerId) {
    throw new Error('The specialist worker lease was lost.');
  }
}

async function updateTask(client, task, workerId, patch) {
  const { data, error } = await client
    .from('audit_specialist_tasks')
    .update({
      ...patch,
      lease_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    })
    .eq('id', task.id)
    .eq('worker_id', workerId)
    .eq('status', 'running')
    .is('cancel_requested_at', null)
    .select('id');
  if (error) throw new Error('The specialist worker could not save progress.');
  if (!data?.length) await assertTaskActive(client, task, workerId);
}

async function robotsAllows(url, dnsCache) {
  const parsed = await assertPublicUrl(url, dnsCache);
  const robotsUrl = new URL('/robots.txt', parsed).toString();
  try {
    let currentUrl = robotsUrl;
    let response;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      await assertPublicUrl(currentUrl, dnsCache);
      response = await fetch(currentUrl, {
        headers: { 'User-Agent': auditRobotsUserAgent },
        redirect: 'manual',
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('The robots endpoint returned an invalid redirect.');
      currentUrl = new URL(location, currentUrl).toString();
      response = undefined;
    }
    if (!response) throw new Error('The robots endpoint exceeded the redirect limit.');
    if (!response.ok) return true;
    return isRobotsAllowed(await response.text(), parsed.pathname);
  } catch {
    // An unavailable robots endpoint is not a prohibition. Each page and redirect is still
    // independently restricted to public network targets by the browser route below.
    return true;
  }
}

async function createSafeContext(browser, viewport, dnsCache) {
  const context = await browser.newContext({
    ...responsiveBrowserContextOptions(viewport),
    serviceWorkers: 'block',
  });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      await route.continue();
      return;
    }
    try {
      await assertPublicUrl(url, dnsCache);
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  });
  return context;
}

export async function inspectPersistentInterfaceState(page) {
  return page.evaluate(() => {
    function stableSelector(element) {
      if (!(element instanceof Element)) return '';
      if (element.id) return `#${CSS.escape(element.id)}`;
      const parts = [];
      let current = element;
      while (current && current !== document.body && parts.length < 5) {
        const parent = current.parentElement;
        if (!parent) break;
        const tag = current.tagName.toLowerCase();
        const siblings = [...parent.children].filter((child) => child.tagName === current.tagName);
        parts.unshift(
          siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})` : tag,
        );
        current = parent;
      }
      return `body > ${parts.join(' > ')}`;
    }

    function visibleRectangle(element) {
      const rectangle = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (
        rectangle.width <= 0 ||
        rectangle.height <= 0 ||
        rectangle.bottom <= 0 ||
        rectangle.right <= 0 ||
        rectangle.top >= window.innerHeight ||
        rectangle.left >= document.documentElement.clientWidth ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0
      ) {
        return undefined;
      }
      return rectangle;
    }

    function bounds(rectangle) {
      return {
        x: Math.max(0, Math.round(rectangle.x)),
        y: Math.max(0, Math.round(rectangle.y)),
        width: Math.round(
          Math.min(document.documentElement.clientWidth, rectangle.right) -
            Math.max(0, rectangle.left),
        ),
        height: Math.round(
          Math.min(window.innerHeight, rectangle.bottom) - Math.max(0, rectangle.top),
        ),
      };
    }

    function intersectionArea(left, right) {
      const width = Math.max(
        0,
        Math.min(left.right, right.right) - Math.max(left.left, right.left),
      );
      const height = Math.max(
        0,
        Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
      );
      return width * height;
    }

    function label(element) {
      return (meaningfulLabel(element) || element.tagName)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
    }

    function meaningfulLabel(element) {
      return (
        element.getAttribute('aria-label') ||
        element.getAttribute('alt') ||
        element.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
    }

    function hasVisiblePaint(element) {
      const style = window.getComputedStyle(element);
      const backgroundChannels = style.backgroundColor
        .match(/rgba?\(([^)]+)\)/)?.[1]
        ?.split(',')
        .map((channel) => channel.trim());
      const backgroundAlpha =
        backgroundChannels && backgroundChannels.length >= 4
          ? Number.parseFloat(backgroundChannels[3])
          : style.backgroundColor === 'transparent'
            ? 0
            : 1;
      const backgroundIsVisible =
        style.backgroundImage !== 'none' ||
        (Number.isFinite(backgroundAlpha) && backgroundAlpha > 0);
      const borderIsVisible = ['Top', 'Right', 'Bottom', 'Left'].some(
        (side) =>
          Number.parseFloat(style[`border${side}Width`]) > 0 &&
          style[`border${side}Style`] !== 'none',
      );
      return (
        backgroundIsVisible ||
        borderIsVisible ||
        style.boxShadow !== 'none' ||
        style.filter !== 'none' ||
        style.backdropFilter !== 'none' ||
        Boolean(element.querySelector('img, svg, video, canvas, input, button, a[href]'))
      );
    }

    const persistentElements = [...document.querySelectorAll('body *')]
      .map((element) => ({
        element,
        position: window.getComputedStyle(element).position,
        rectangle: visibleRectangle(element),
      }))
      .filter(
        (entry) =>
          entry.rectangle &&
          (entry.position === 'fixed' || entry.position === 'sticky') &&
          entry.rectangle.width >= 32 &&
          entry.rectangle.height >= 16 &&
          (Boolean(meaningfulLabel(entry.element)) || hasVisiblePaint(entry.element)),
      );
    const contentElements = [
      ...document.querySelectorAll(
        'main h1, main h2, main h3, main h4, main p, main li, main a, main button, main img, main input, main select, main textarea, footer h1, footer h2, footer h3, footer h4, footer p, footer li, footer a, footer button, footer img, [role="main"] h1, [role="main"] h2, [role="main"] h3, [role="main"] p, [role="main"] li, [role="main"] a, [role="main"] button, [role="contentinfo"] h1, [role="contentinfo"] h2, [role="contentinfo"] h3, [role="contentinfo"] p, [role="contentinfo"] li, [role="contentinfo"] a, [role="contentinfo"] button, [role="contentinfo"] img',
      ),
    ]
      .map((element) => ({ element, rectangle: visibleRectangle(element) }))
      .filter((entry) => entry.rectangle);
    const persistentOverlayOcclusions = persistentElements
      .map((overlay) => {
        const occludedContent = contentElements
          .filter(
            (content) =>
              !overlay.element.contains(content.element) &&
              !content.element.contains(overlay.element),
          )
          .map((content) => {
            const area = intersectionArea(overlay.rectangle, content.rectangle);
            const contentArea = content.rectangle.width * content.rectangle.height;
            return {
              element: content.element,
              rectangle: content.rectangle,
              area,
              ratio: contentArea > 0 ? area / contentArea : 0,
            };
          })
          .filter((content) => content.area >= 64 && content.ratio >= 0.08)
          .sort((left, right) => right.area - left.area)
          .slice(0, 8)
          .map((content) => ({
            selector: stableSelector(content.element),
            label: label(content.element),
            element: content.element.tagName.toLowerCase(),
            bounds: bounds(content.rectangle),
            overlapAreaPx: Math.round(content.area),
            overlapRatio: Number(content.ratio.toFixed(3)),
          }));
        if (!occludedContent.length) return undefined;
        return {
          selector: stableSelector(overlay.element),
          label: label(overlay.element),
          position: overlay.position,
          bounds: bounds(overlay.rectangle),
          viewportAreaRatio: Number(
            (
              (overlay.rectangle.width * overlay.rectangle.height) /
              (document.documentElement.clientWidth * window.innerHeight)
            ).toFixed(3),
          ),
          occludedContent,
        };
      })
      .filter(Boolean)
      .slice(0, 6);
    const maximumScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return {
      scrollY: Math.round(window.scrollY),
      maximumScrollY: Math.round(maximumScrollY),
      scrollProgress: maximumScrollY > 0 ? Number((window.scrollY / maximumScrollY).toFixed(3)) : 0,
      persistentOverlayOcclusions,
    };
  });
}

export async function moveToScrollProgress(page, progress) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.evaluate((targetProgress) => {
      const maximumScrollY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      window.scrollTo(0, Math.round(maximumScrollY * targetProgress));
    }, progress);
    await page.waitForTimeout(350);
  }
  return inspectPersistentInterfaceState(page);
}

function pagePriority(page) {
  const priorities = {
    homepage: 100,
    contact: 90,
    service: 80,
    quote: 75,
    booking: 75,
    about: 60,
  };
  return priorities[page.page_type] ?? 20;
}

async function saveScreenshot(
  client,
  task,
  pageRecord,
  viewport,
  image,
  metrics,
  evidenceKind = 'page-overview',
) {
  const digest = createHash('sha256')
    .update(`${task.id}:${pageRecord.url}:${viewport.label}:${evidenceKind}`)
    .digest('hex')
    .slice(0, 20);
  const storagePath = `${task.business_id}/audits/${task.audit_id}/${task.id}/${digest}-${viewport.label}.png`;
  const { error: uploadError } = await client.storage
    .from(artifactBucket)
    .upload(storagePath, image, {
      contentType: 'image/png',
      upsert: true,
    });
  if (uploadError) throw new Error('The specialist worker could not save responsive evidence.');
  const metadata = {
    sourceUrl: pageRecord.url,
    pageType: pageRecord.page_type,
    auditId: task.audit_id,
    specialistTaskId: task.id,
    testedState: 'settled page',
    evidenceKind,
    viewport: { width: viewport.width, height: viewport.height, label: viewport.label },
    ...metrics,
  };
  const { error: artifactError } = await client.from('artifacts').upsert(
    {
      organization_id: task.organization_id,
      business_id: task.business_id,
      crawl_run_id: task.crawl_run_id,
      kind: 'screenshot',
      label: `${pageRecord.title || pageRecord.page_type || 'Page'} ${viewport.label} ${evidenceKind.replaceAll('-', ' ')} evidence`,
      storage_bucket: artifactBucket,
      storage_path: storagePath,
      content_type: 'image/png',
      byte_size: image.byteLength,
      sha256: createHash('sha256').update(image).digest('hex'),
      metadata,
    },
    { onConflict: 'storage_path' },
  );
  if (artifactError) throw new Error('The specialist worker could not index responsive evidence.');
}

async function captureResponsiveEvidence(client, task, workerId, pages) {
  const selectedPages = [...pages]
    .filter((page) => typeof page.url === 'string' && page.url)
    .sort((left, right) => pagePriority(right) - pagePriority(left))
    .slice(0, maxVisualPages);
  if (!selectedPages.length)
    throw new Error('No captured public pages are available for visual review.');
  const totalItems = selectedPages.length * visualViewports.length;
  await updateTask(client, task, workerId, {
    progress_phase: 'capturing_responsive_evidence',
    progress_detail: 'Opening selected pages in independent mobile, tablet, and desktop contexts.',
    total_items: totalItems,
    completed_items: 0,
  });
  const browser = await chromium.launch({ headless: true });
  const dnsCache = new Map();
  let completedItems = 0;
  try {
    for (const pageRecord of selectedPages) {
      await assertTaskActive(client, task, workerId);
      if (!(await robotsAllows(pageRecord.url, dnsCache))) {
        throw new Error(`Robots rules do not allow visual review of ${pageRecord.url}.`);
      }
      for (const viewport of visualViewports) {
        await assertTaskActive(client, task, workerId);
        const context = await createSafeContext(browser, viewport, dnsCache);
        try {
          const page = await context.newPage();
          const runtimeErrors = [];
          page.on('pageerror', (error) => {
            if (runtimeErrors.length < 8) runtimeErrors.push(error.message.slice(0, 180));
          });
          page.on('console', (message) => {
            if (message.type() === 'error' && runtimeErrors.length < 8) {
              runtimeErrors.push(message.text().slice(0, 180));
            }
          });
          await page.goto(pageRecord.url, {
            waitUntil: 'domcontentloaded',
            timeout: requestTimeoutMs,
          });
          await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
          const metrics = await page.evaluate(() => {
            function stableSelector(element) {
              if (!(element instanceof Element)) return '';
              if (element.id) return `#${CSS.escape(element.id)}`;
              const parts = [];
              let current = element;
              while (current && current !== document.body && parts.length < 5) {
                const parent = current.parentElement;
                if (!parent) break;
                const tag = current.tagName.toLowerCase();
                const siblings = [...parent.children].filter(
                  (child) => child.tagName === current.tagName,
                );
                parts.unshift(
                  siblings.length > 1
                    ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})`
                    : tag,
                );
                current = parent;
              }
              return `body > ${parts.join(' > ')}`;
            }

            function visibleRectangle(element) {
              const rectangle = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              if (
                rectangle.width <= 0 ||
                rectangle.height <= 0 ||
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                Number(style.opacity) === 0
              ) {
                return undefined;
              }
              return rectangle;
            }

            const root = document.documentElement;
            const pageWidth = Math.ceil(root.scrollWidth);
            const pageHeight = Math.ceil(root.scrollHeight);
            const layoutViewportWidth = window.innerWidth;
            const visualViewportWidth = window.visualViewport?.width ?? layoutViewportWidth;
            const contentViewportWidth = Math.min(root.clientWidth, visualViewportWidth);
            const undersizedTargets = [
              ...document.querySelectorAll('a[href], button, input, select, textarea'),
            ]
              .filter((element) => {
                const rectangle = element.getBoundingClientRect();
                return (
                  rectangle.width > 0 &&
                  rectangle.height > 0 &&
                  (rectangle.width < 44 || rectangle.height < 44)
                );
              })
              .map((element) => {
                const rectangle = element.getBoundingClientRect();
                const label =
                  element.getAttribute('aria-label') ||
                  element.textContent?.replace(/\s+/g, ' ').trim() ||
                  element.getAttribute('placeholder') ||
                  '';
                return {
                  element: element.tagName.toLowerCase(),
                  label: label.slice(0, 80),
                  width: Math.round(rectangle.width),
                  height: Math.round(rectangle.height),
                };
              });
            const navigation = window.performance.getEntriesByType('navigation')[0];
            const chromeElements = [
              ...document.querySelectorAll('header, nav, [role="navigation"]'),
            ]
              .map((element) => ({ element, rectangle: visibleRectangle(element) }))
              .filter((entry) => entry.rectangle && entry.rectangle.top < 48);
            const chromeBottom = chromeElements.reduce(
              (bottom, entry) =>
                Math.max(bottom, Math.min(window.innerHeight, entry.rectangle.bottom)),
              0,
            );
            const dominantChrome = [...chromeElements].sort(
              (left, right) => right.rectangle.height - left.rectangle.height,
            )[0];

            const visibleMedia = [...document.querySelectorAll('img, svg, video, picture')]
              .map((element) => ({ element, rectangle: visibleRectangle(element) }))
              .filter(
                (entry) =>
                  entry.rectangle &&
                  entry.rectangle.top < window.innerHeight * 1.5 &&
                  entry.rectangle.bottom > 0,
              )
              .map((entry) => {
                const element = entry.element;
                const identifyingText = [
                  element.getAttribute('alt'),
                  element.getAttribute('aria-label'),
                  element.getAttribute('src'),
                  element.getAttribute('class'),
                  element.id,
                ]
                  .filter(Boolean)
                  .join(' ');
                return {
                  element,
                  rectangle: entry.rectangle,
                  identifyingText,
                  viewportAreaRatio:
                    (entry.rectangle.width * entry.rectangle.height) /
                    (window.innerWidth * window.innerHeight),
                };
              })
              .sort((left, right) => right.viewportAreaRatio - left.viewportAreaRatio);
            const largestMedia = visibleMedia[0];
            const oversizedLogo = visibleMedia.find(
              (entry) =>
                /logo|brand|wordmark/i.test(entry.identifyingText) &&
                entry.viewportAreaRatio >= 0.35,
            );

            const feedbackRegions = [...document.querySelectorAll('h1, h2, h3, h4')]
              .filter((heading) =>
                /feedback|testimonial|reviews?|what .{0,20} say/i.test(heading.textContent || ''),
              )
              .map((heading) => {
                const region = heading.closest('section, article') || heading.parentElement;
                if (!region) return undefined;
                const rectangle = visibleRectangle(region);
                const images = [...region.querySelectorAll('img, picture')].filter(
                  visibleRectangle,
                );
                const readableText = (region.textContent || '').replace(/\s+/g, ' ').trim();
                if (!rectangle || images.length === 0 || readableText.length > 220)
                  return undefined;
                return {
                  kind: 'image-based-feedback',
                  selector: stableSelector(region),
                  label: (heading.textContent || 'Feedback')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 100),
                  imageCount: images.length,
                  readableTextLength: readableText.length,
                };
              })
              .filter(Boolean);

            const logoElements = [...document.querySelectorAll('img, svg')].filter((element) => {
              if (!visibleRectangle(element)) return false;
              return /logo|brand|wordmark/i.test(
                [
                  element.getAttribute('alt'),
                  element.getAttribute('aria-label'),
                  element.getAttribute('src'),
                  element.getAttribute('class'),
                  element.id,
                ]
                  .filter(Boolean)
                  .join(' '),
              );
            });

            const uxRegions = [
              ...(chromeBottom / window.innerHeight >= 0.28 && dominantChrome
                ? [
                    {
                      kind: 'dominant-navigation',
                      selector: stableSelector(dominantChrome.element),
                      label: 'Header and navigation',
                      viewportHeightRatio: chromeBottom / window.innerHeight,
                    },
                  ]
                : []),
              ...(oversizedLogo
                ? [
                    {
                      kind: 'oversized-logo',
                      selector: stableSelector(oversizedLogo.element),
                      label: oversizedLogo.identifyingText.slice(0, 100) || 'Large logo',
                      viewportAreaRatio: oversizedLogo.viewportAreaRatio,
                    },
                  ]
                : []),
              ...feedbackRegions,
            ];
            const headingOutline = [...document.querySelectorAll('h1, h2, h3')]
              .filter(visibleRectangle)
              .slice(0, 24)
              .map((heading) => ({
                level: heading.tagName.toLowerCase(),
                text: (heading.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
              }))
              .filter((heading) => heading.text);
            const sectionOutline = [
              ...document.querySelectorAll('main section, main article, body > section'),
            ]
              .filter(visibleRectangle)
              .slice(0, 16)
              .map((section) => {
                const heading = section.querySelector('h1, h2, h3, h4');
                return {
                  selector: stableSelector(section),
                  heading: (heading?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                  textLength: (section.textContent || '').replace(/\s+/g, ' ').trim().length,
                  imageCount: section.querySelectorAll('img, picture, video, svg').length,
                  actionCount: section.querySelectorAll('a[href], button').length,
                };
              });
            const actionLabels = [...document.querySelectorAll('a[href], button')]
              .filter(visibleRectangle)
              .map((element) =>
                (
                  element.getAttribute('aria-label') ||
                  element.textContent ||
                  element.getAttribute('title') ||
                  ''
                )
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 100),
              )
              .filter(Boolean);
            const repeatedActionLabels = Object.entries(
              actionLabels.reduce((counts, label) => {
                const key = label.toLowerCase();
                counts[key] = (counts[key] || 0) + 1;
                return counts;
              }, {}),
            )
              .filter(([, count]) => count > 1)
              .slice(0, 10)
              .map(([label, count]) => ({ label, count }));
            const fixedOrStickyElements = [...document.querySelectorAll('body *')]
              .filter((element) => {
                const position = window.getComputedStyle(element).position;
                return (position === 'fixed' || position === 'sticky') && visibleRectangle(element);
              })
              .slice(0, 12)
              .map((element) => ({
                selector: stableSelector(element),
                label: (
                  element.getAttribute('aria-label') ||
                  element.textContent ||
                  element.tagName
                )
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 100),
                position: window.getComputedStyle(element).position,
              }));
            const resourceEntries = window.performance.getEntriesByType('resource');
            const resourcesByType = resourceEntries.reduce((counts, entry) => {
              const kind = entry.initiatorType || 'other';
              counts[kind] = (counts[kind] || 0) + 1;
              return counts;
            }, {});
            return {
              pageWidth,
              pageHeight,
              layoutViewportWidth,
              visualViewportWidth,
              contentViewportWidth,
              clientViewportWidth: root.clientWidth,
              screenWidth: window.screen.width,
              userAgent: window.navigator.userAgent,
              horizontalOverflowPx: Math.max(0, pageWidth - contentViewportWidth),
              undersizedTargetCount: undersizedTargets.length,
              undersizedTargets: undersizedTargets.slice(0, 8),
              loadMs:
                navigation && 'loadEventEnd' in navigation
                  ? Math.round(navigation.loadEventEnd)
                  : undefined,
              chromeHeightPx: Math.round(chromeBottom),
              chromeViewportRatio: chromeBottom / window.innerHeight,
              largestMedia: largestMedia
                ? {
                    selector: stableSelector(largestMedia.element),
                    label: largestMedia.identifyingText.slice(0, 100),
                    width: Math.round(largestMedia.rectangle.width),
                    height: Math.round(largestMedia.rectangle.height),
                    viewportAreaRatio: largestMedia.viewportAreaRatio,
                  }
                : undefined,
              oversizedLogo: oversizedLogo
                ? {
                    selector: stableSelector(oversizedLogo.element),
                    label: oversizedLogo.identifyingText.slice(0, 100),
                    viewportAreaRatio: oversizedLogo.viewportAreaRatio,
                  }
                : undefined,
              visibleLogoCount: logoElements.length,
              feedbackRegions,
              uxRegions,
              headingOutline,
              sectionOutline,
              mainPresent: Boolean(document.querySelector('main, [role="main"]')),
              landmarkCount: document.querySelectorAll(
                'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]',
              ).length,
              visibleTextLength: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
              repeatedActionLabels,
              fixedOrStickyElements,
              resourceSummary: {
                total: resourceEntries.length,
                byType: resourcesByType,
              },
            };
          });
          metrics.runtimeErrors = runtimeErrors;
          if (metrics.userAgent !== viewport.userAgent || metrics.screenWidth !== viewport.width) {
            throw new Error(
              `The ${viewport.label} browser profile did not match the requested responsive capture.`,
            );
          }
          const captureContract = 'real-device-responsive-audit-v1';
          const viewportIntegrity = {
            status: 'passed',
            profileId: viewport.id,
            requestedWidth: viewport.width,
            screenWidth: metrics.screenWidth,
            layoutViewportWidth: metrics.layoutViewportWidth,
            visualViewportWidth: metrics.visualViewportWidth,
            contentViewportWidth: metrics.contentViewportWidth,
          };
          const topState = await moveToScrollProgress(page, 0);
          const topImage = await page.screenshot({ type: 'png' });
          await saveScreenshot(client, task, pageRecord, viewport, topImage, {
            ...metrics,
            captureContract,
            viewportIntegrity,
            scrollState: topState,
            persistentOverlayOcclusions: topState.persistentOverlayOcclusions,
          });
          if (topState.maximumScrollY > Math.max(80, viewport.height * 0.2)) {
            for (const scrollCapture of [
              { progress: 0.5, evidenceKind: 'scroll-middle' },
              { progress: 1, evidenceKind: 'scroll-bottom' },
            ]) {
              const scrollState = await moveToScrollProgress(page, scrollCapture.progress);
              const scrollImage = await page.screenshot({ type: 'png' });
              await saveScreenshot(
                client,
                task,
                pageRecord,
                viewport,
                scrollImage,
                {
                  ...metrics,
                  captureContract,
                  viewportIntegrity,
                  scrollState,
                  persistentOverlayOcclusions: scrollState.persistentOverlayOcclusions,
                },
                scrollCapture.evidenceKind,
              );
            }
          }
          await moveToScrollProgress(page, 0);
          for (const region of (metrics.uxRegions ?? []).slice(0, 3)) {
            if (!region.selector) continue;
            const locator = page.locator(region.selector).first();
            if (!(await locator.isVisible().catch(() => false))) continue;
            await locator.scrollIntoViewIfNeeded().catch(() => undefined);
            const focusedImage = await page.screenshot({ type: 'png' });
            await saveScreenshot(
              client,
              task,
              pageRecord,
              viewport,
              focusedImage,
              {
                ...metrics,
                captureContract,
                viewportIntegrity,
                focusedRegion: region,
              },
              region.kind,
            );
          }
          const safeInteractions = await page.evaluate(() => {
            function stableSelector(element) {
              if (!(element instanceof Element)) return '';
              if (element.id) return `#${CSS.escape(element.id)}`;
              const parts = [];
              let current = element;
              while (current && current !== document.body && parts.length < 5) {
                const parent = current.parentElement;
                if (!parent) break;
                const siblings = [...parent.children].filter(
                  (child) => child.tagName === current.tagName,
                );
                const tag = current.tagName.toLowerCase();
                parts.unshift(
                  siblings.length > 1
                    ? `${tag}:nth-of-type(${siblings.indexOf(current) + 1})`
                    : tag,
                );
                current = parent;
              }
              return `body > ${parts.join(' > ')}`;
            }
            const buttons = [...document.querySelectorAll('button')].filter(
              (button) => !button.closest('form') && button.getBoundingClientRect().width > 0,
            );
            const menu = buttons.find((button) => {
              const label = [
                button.getAttribute('aria-label'),
                button.getAttribute('title'),
                button.textContent,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                /menu|navigation|nav/i.test(label) &&
                button.getAttribute('aria-expanded') !== 'true'
              );
            });
            const disclosure = buttons.find((button) => {
              if (button === menu || button.getAttribute('aria-expanded') !== 'false') return false;
              const region = button.closest('section, article');
              const context = [button.textContent, region?.querySelector('h1, h2, h3')?.textContent]
                .filter(Boolean)
                .join(' ');
              return /faq|question|what|how|why|when|where|who/i.test(context);
            });
            return [
              ...(menu
                ? [
                    {
                      selector: stableSelector(menu),
                      kind: 'menu-open',
                      label: 'Opened navigation',
                    },
                  ]
                : []),
              ...(disclosure
                ? [
                    {
                      selector: stableSelector(disclosure),
                      kind: 'disclosure-open',
                      label: (disclosure.textContent || 'Opened disclosure')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 100),
                    },
                  ]
                : []),
            ];
          });
          for (const [interactionIndex, interaction] of safeInteractions.entries()) {
            const control = page.locator(interaction.selector).first();
            if (!(await control.isVisible().catch(() => false))) continue;
            await control.click({ timeout: 3_000 }).catch(() => undefined);
            await page.waitForTimeout(200);
            if ((await control.getAttribute('aria-expanded').catch(() => null)) !== 'true')
              continue;
            const interactionImage = await page.screenshot({ type: 'png' });
            await saveScreenshot(
              client,
              task,
              pageRecord,
              viewport,
              interactionImage,
              {
                ...metrics,
                captureContract,
                viewportIntegrity,
                interactionState: interaction.kind,
                focusedRegion: interaction,
              },
              `interaction-${interaction.kind}-${interactionIndex + 1}`,
            );
            await page.keyboard.press('Escape').catch(() => undefined);
            if ((await control.getAttribute('aria-expanded').catch(() => null)) === 'true') {
              await control.click({ timeout: 2_000 }).catch(() => undefined);
            }
          }
        } finally {
          await context.close();
        }
        completedItems += 1;
        await updateTask(client, task, workerId, {
          progress_phase: 'capturing_responsive_evidence',
          progress_detail: `Saved ${completedItems} of ${totalItems} responsive checks.`,
          total_items: totalItems,
          completed_items: completedItems,
        });
      }
    }
  } finally {
    await browser.close();
  }
}

async function loadAuditInput(client, task, workerId) {
  await updateTask(client, task, workerId, {
    progress_phase: 'reading_evidence',
    progress_detail: 'Loading pages, facts, and immutable evidence for this specialist.',
  });
  const [pagesResult, factsResult, artifactsResult] = await Promise.all([
    client.from('crawl_pages').select('*').eq('crawl_run_id', task.crawl_run_id),
    client.from('evidence_facts').select('id, source_url').eq('crawl_run_id', task.crawl_run_id),
    client.from('artifacts').select('*').eq('crawl_run_id', task.crawl_run_id),
  ]);
  if (pagesResult.error || factsResult.error || artifactsResult.error) {
    throw new Error('The specialist worker could not load the saved capture evidence.');
  }
  const pages = pagesResult.data ?? [];
  if (task.specialist_kind === 'responsive_ui') {
    await captureResponsiveEvidence(client, task, workerId, pages);
    const refreshed = await client
      .from('artifacts')
      .select('*')
      .eq('crawl_run_id', task.crawl_run_id);
    if (refreshed.error) throw new Error('The specialist worker could not reload visual evidence.');
    artifactsResult.data = refreshed.data;
  }
  const artifacts = artifactsResult.data ?? [];
  const currentScreenshots = artifacts.filter(
    (artifact) => artifact.kind === 'screenshot' && artifact.metadata?.specialistTaskId === task.id,
  );
  const relevantArtifacts = artifacts.filter(
    (artifact) =>
      artifact.kind !== 'screenshot' ||
      !artifact.metadata?.auditId ||
      artifact.metadata.auditId === task.audit_id,
  );
  const [accessibilityReports, performanceReports] = await Promise.all([
    Promise.all(
      artifacts
        .filter((artifact) => artifact.kind === 'accessibility')
        .map(async (artifact) => ({
          sourceUrl: sourceUrl(artifact),
          ...(await downloadJson(client, artifact)),
        })),
    ),
    Promise.all(
      artifacts
        .filter((artifact) => artifact.kind === 'performance')
        .map(async (artifact) => ({
          sourceUrl: sourceUrl(artifact),
          ...(await downloadJson(client, artifact)),
        })),
    ),
  ]);
  return {
    pages,
    facts: factsResult.data ?? [],
    accessibilityReports: accessibilityReports.filter((report) => report.violations),
    performanceReports: performanceReports.filter(
      (report) => report.navigation || report.structure,
    ),
    screenshots: currentScreenshots.map((artifact) => ({
      id: artifact.id,
      sourceUrl: sourceUrl(artifact),
      metadata: artifact.metadata ?? {},
    })),
    evidenceArtifacts: relevantArtifacts.map((artifact) => ({
      id: artifact.id,
      sourceUrl: sourceUrl(artifact),
      kind: artifact.kind,
    })),
    rawArtifacts: artifacts,
  };
}

function factIdsForUrl(facts, sourceUrl) {
  return (facts ?? [])
    .filter((fact) => fact.source_url === sourceUrl && fact.id)
    .map((fact) => fact.id);
}

function visionCandidateFinding(candidate, facts, screenshotArtifacts, modelDetails = {}) {
  const representativeArtifact = screenshotArtifacts.find(
    (artifact) => artifact.id === candidate.screenshotArtifactId,
  );
  return {
    area: candidate.area,
    severity: candidate.severity,
    title: candidate.title,
    finding: candidate.observation,
    customerImpact: candidate.customerImpact,
    recommendation: candidate.recommendation,
    sourceUrls: candidate.affectedPages ?? [candidate.sourceUrl],
    evidenceFactIds: factIdsForUrl(facts, candidate.sourceUrl),
    evidenceArtifactIds: candidate.evidenceArtifactIds,
    findingClass: candidate.findingClass,
    confidence: candidate.confidence,
    viewport: candidate.viewport,
    interactionState: representativeArtifact?.metadata?.interactionState ?? 'rendered',
    selector: candidate.region?.selector || undefined,
    measurement: {
      source: candidate.source,
      issueType: candidate.issueType,
      visibleRegion: candidate.region,
      modelConfidence: candidate.modelConfidence,
      computedConfidence: candidate.confidence,
      candidateState: candidate.candidateState,
      priorityScore: candidate.priorityScore,
      occurrenceCount: candidate.occurrenceCount ?? 1,
      affectedViewports: candidate.affectedViewports ?? [candidate.viewport?.label].filter(Boolean),
      corroboration: candidate.corroboration,
      model: modelDetails.model,
      modelResponseId: modelDetails.responseId,
      publicationEligible: false,
    },
  };
}

async function generateVisionFindings(client, task, workerId, input, ruleFindings, artifacts) {
  const screenshotArtifacts = artifacts.filter(
    (artifact) => artifact.kind === 'screenshot' && artifact.metadata?.specialistTaskId === task.id,
  );
  const pageByUrl = new Map(input.pages.map((page) => [page.url, page]));
  const screenshotsByUrl = new Map();
  for (const artifact of screenshotArtifacts) {
    const url = sourceUrl(artifact);
    if (!url || !pageByUrl.has(url)) continue;
    screenshotsByUrl.set(url, [...(screenshotsByUrl.get(url) ?? []), artifact]);
  }
  const accepted = [];
  const modelDetails = new Map();
  let analysedPages = 0;
  await updateTask(client, task, workerId, {
    progress_phase: 'analysing_visual_evidence',
    progress_detail: 'Reviewing responsive screenshots and interface structure with UX vision.',
    total_items: screenshotsByUrl.size,
    completed_items: 0,
  });
  for (const [url, pageScreenshots] of screenshotsByUrl) {
    await assertTaskActive(client, task, workerId);
    const page = pageByUrl.get(url);
    const analysis = await analysePageUxWithVision(client, task, page, pageScreenshots);
    const normalised = normaliseVisionObservations(analysis.observations, {
      screenshotArtifacts,
      auditId: task.audit_id,
      crawlRunId: task.crawl_run_id,
      ruleFindings,
    });
    for (const observation of normalised.accepted) {
      accepted.push(observation);
      modelDetails.set(observation.screenshotArtifactId, {
        model: analysis.model,
        responseId: analysis.responseId,
      });
    }
    analysedPages += 1;
    await updateTask(client, task, workerId, {
      progress_phase: 'analysing_visual_evidence',
      progress_detail: `Reviewed ${analysedPages} of ${screenshotsByUrl.size} selected pages with UX vision.`,
      total_items: screenshotsByUrl.size,
      completed_items: analysedPages,
    });
  }
  const { rankedCandidates, reviewOnly } = rankVisionCandidates(accepted, {
    maximumCandidates: 15,
  });
  const rankedEvidence = new Set(
    rankedCandidates.flatMap((candidate) => candidate.evidenceArtifactIds ?? []),
  );
  const uniqueReviewOnly = reviewOnly.filter(
    (candidate) => !candidate.evidenceArtifactIds?.some((id) => rankedEvidence.has(id)),
  );
  return [...rankedCandidates, ...uniqueReviewOnly.slice(0, 10)].map((candidate) =>
    visionCandidateFinding(
      candidate,
      input.facts,
      screenshotArtifacts,
      modelDetails.get(candidate.screenshotArtifactId),
    ),
  );
}

async function replaceObservations(client, task, workerId, findings) {
  await assertTaskActive(client, task, workerId);
  const { error: deleteError } = await client
    .from('audit_observations')
    .delete()
    .eq('specialist_task_id', task.id);
  if (deleteError) throw new Error('The specialist worker could not replace prior observations.');
  await updateTask(client, task, workerId, {
    progress_phase: 'saving_observations',
    progress_detail: 'Saving evidence-linked observations for human review.',
    total_items: findings.length,
    completed_items: 0,
  });
  let completedItems = 0;
  for (const entry of findings) {
    await assertTaskActive(client, task, workerId);
    const { error } = await client.from('audit_observations').insert({
      organization_id: task.organization_id,
      business_id: task.business_id,
      audit_id: task.audit_id,
      specialist_task_id: task.id,
      crawl_run_id: task.crawl_run_id,
      specialist_kind: task.specialist_kind,
      area: entry.area,
      finding_class: entry.findingClass,
      severity: entry.severity,
      title: entry.title,
      observation: entry.finding,
      customer_impact: entry.customerImpact,
      recommendation: entry.recommendation,
      source_urls: entry.sourceUrls,
      evidence_fact_ids: entry.evidenceFactIds,
      evidence_artifact_ids: entry.evidenceArtifactIds,
      viewport: entry.viewport,
      interaction_state: entry.interactionState,
      selector: entry.selector,
      measurement: entry.measurement,
      confidence: entry.confidence,
      review_state: 'needs_review',
    });
    if (error) throw new Error('The specialist worker could not save an observation.');
    completedItems += 1;
    await updateTask(client, task, workerId, {
      progress_phase: 'saving_observations',
      progress_detail: `Saved ${completedItems} of ${findings.length} observations.`,
      total_items: findings.length,
      completed_items: completedItems,
    });
  }
}

async function completeTask(client, task, workerId, findingCount) {
  const { data, error } = await client
    .from('audit_specialist_tasks')
    .update({
      status: 'ready',
      worker_id: null,
      lease_expires_at: null,
      progress_phase: 'complete',
      progress_detail: findingCount
        ? `${findingCount} evidence-linked ${findingCount === 1 ? 'observation is' : 'observations are'} ready for review.`
        : 'The specialist completed its checks and found no evidence-backed issue.',
      total_items: findingCount,
      completed_items: findingCount,
      error_summary: null,
    })
    .eq('id', task.id)
    .eq('worker_id', workerId)
    .eq('status', 'running')
    .select('id');
  if (error || !data?.length) throw new Error('The specialist worker lease was lost.');
}

async function failTask(client, task, workerId, error) {
  await client
    .from('audit_specialist_tasks')
    .update({
      status: 'failed',
      worker_id: null,
      lease_expires_at: null,
      progress_phase: 'failed',
      progress_detail: safeErrorSummary(error),
      error_summary: safeErrorSummary(error),
    })
    .eq('id', task.id)
    .eq('worker_id', workerId);
}

async function cancelTask(client, task, workerId) {
  await client
    .from('audit_specialist_tasks')
    .update({
      status: 'failed',
      worker_id: null,
      lease_expires_at: null,
      progress_phase: 'cancelled',
      progress_detail: 'Specialist audit cancelled. Saved observations remain private.',
      error_summary: 'Specialist audit cancelled by a workspace user.',
    })
    .eq('id', task.id)
    .eq('worker_id', workerId);
}

export async function processNextAuditSpecialist(client, workerId) {
  const { data, error } = await client.rpc('claim_next_audit_specialist_task', {
    worker_identity: workerId,
  });
  if (error) throw new Error('The specialist worker could not claim the next queued task.');
  const task = Array.isArray(data) ? data[0] : undefined;
  if (!task) return false;
  try {
    const input = await loadAuditInput(client, task, workerId);
    const ruleFindings = generateSpecialistAuditFindings(task.specialist_kind, input);
    const visionFindings =
      task.specialist_kind === 'responsive_ui' && uxVisionConfigured()
        ? await generateVisionFindings(
            client,
            task,
            workerId,
            input,
            ruleFindings,
            input.rawArtifacts ?? [],
          )
        : [];
    const findingsByTitle = new Map();
    for (const finding of [...ruleFindings, ...visionFindings]) {
      const signature = `${finding.area}:${finding.title.trim().toLowerCase()}`;
      const existing = findingsByTitle.get(signature);
      if (!existing) {
        findingsByTitle.set(signature, finding);
        continue;
      }
      findingsByTitle.set(signature, {
        ...existing,
        sourceUrls: [...new Set([...existing.sourceUrls, ...finding.sourceUrls])],
        evidenceFactIds: [...new Set([...existing.evidenceFactIds, ...finding.evidenceFactIds])],
        evidenceArtifactIds: [
          ...new Set([...existing.evidenceArtifactIds, ...finding.evidenceArtifactIds]),
        ],
        measurement: {
          ...existing.measurement,
          corroboratingVisualAnalysis: finding.measurement,
        },
      });
    }
    const findings = [...findingsByTitle.values()];
    await replaceObservations(client, task, workerId, findings);
    await completeTask(client, task, workerId, findings.length);
    console.log(
      `[audit-specialist-worker] completed ${task.specialist_kind} ${task.id}: ${findings.length} observations`,
    );
  } catch (error) {
    if (error instanceof SpecialistCancelledError) {
      await cancelTask(client, task, workerId);
      console.log(`[audit-specialist-worker] cancelled ${task.specialist_kind} ${task.id}`);
      return true;
    }
    await failTask(client, task, workerId, error);
    console.error(`[audit-specialist-worker] failed ${task.specialist_kind} ${task.id}`);
  }
  return true;
}

async function main() {
  const supabaseUrl = requiredEnvironment('SITEFORGE_SUPABASE_URL');
  const serviceRoleKey = requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY');
  const workerId =
    process.env.SITEFORGE_AUDIT_SPECIALIST_WORKER_ID?.trim() || `${hostname()}-${process.pid}`;
  const pollIntervalMs = Number.parseInt(
    process.env.SITEFORGE_AUDIT_SPECIALIST_POLL_MS ?? '5000',
    10,
  );
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const runOnce = process.argv.includes('--once');
  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
  });
  process.on('SIGTERM', () => {
    stopping = true;
  });
  do {
    const claimed = await processNextAuditSpecialist(client, workerId);
    if (runOnce || stopping) break;
    if (!claimed) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (!stopping);
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch((error) => {
    console.error(
      '[audit-specialist-worker] stopped unexpectedly',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
