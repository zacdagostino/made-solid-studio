// This runs in the captured page. Do not change the site's appearance to make
// it look ready: wait for its real intro, media and finite reveal animations.
// Browser globals below execute only inside page.evaluate.
/* global document, innerHeight, innerWidth, getComputedStyle, Image, Element, HTMLImageElement, HTMLVideoElement */
export async function waitForHomepageCapture(page, { timeoutMs = 25_000 } = {}) {
  await page.evaluate(
    async ({ timeoutMs }) => {
      const deadline = Date.now() + timeoutMs;
      const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
      const inViewport = (node) => {
        const b = node.getBoundingClientRect();
        return (
          b.width > 0 &&
          b.height > 0 &&
          b.bottom > 0 &&
          b.top < innerHeight &&
          b.right > 0 &&
          b.left < innerWidth
        );
      };
      const resources = new Map();
      const backgroundReady = (url) => {
        if (!resources.has(url)) {
          const image = new Image();
          image.src = url;
          resources.set(url, image);
        }
        const image = resources.get(url);
        if (image.complete && !image.naturalWidth)
          throw new Error('Visible homepage media failed to load. No screenshot was saved.');
        return image.complete && image.naturalWidth > 0;
      };
      let previous = '';
      let stableSince = 0;
      while (Date.now() < deadline) {
        const main = document.querySelector('main, [role="main"]') || document.body;
        const visible = Array.from(main.querySelectorAll('*')).filter(inViewport);
        const loaders = Array.from(
          document.querySelectorAll(
            '[data-siteforge-brand-intro], [aria-busy="true"], [role="progressbar"], [aria-label="Made Solid is loading"]',
          ),
        );
        const visibleStyle = (node) => {
          const s = getComputedStyle(node);
          return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.01;
        };
        let ready =
          document.readyState === 'complete' &&
          document.fonts.status === 'loaded' &&
          (main.textContent || '').trim().length > 40 &&
          visibleStyle(main) &&
          !document.documentElement.classList.contains('sf-route-transitioning') &&
          !loaders.some((node) => inViewport(node) && visibleStyle(node));
        for (const node of visible) {
          if (node instanceof HTMLImageElement) {
            node.loading = 'eager';
            if (node.complete && !node.naturalWidth)
              throw new Error('Visible homepage media failed to load. No screenshot was saved.');
            if (!node.complete) ready = false;
          }
          if (node instanceof HTMLVideoElement && node.readyState < 2) {
            if (!node.poster || !backgroundReady(node.poster)) ready = false;
          }
          for (const match of getComputedStyle(node).backgroundImage.matchAll(
            /url\(["']?(.*?)["']?\)/g,
          )) {
            if (!backgroundReady(match[1])) ready = false;
          }
        }
        // Infinite decorative motion must not block capture, but entrance/reveal
        // animations must finish, including opacity-only fades with stable boxes.
        if (
          document.getAnimations().some((animation) => {
            const target = animation.effect?.target;
            return (
              target instanceof Element &&
              inViewport(target) &&
              ['running', 'pending'].includes(animation.playState) &&
              animation.effect.getComputedTiming().iterations !== Infinity
            );
          })
        )
          ready = false;
        const signature = JSON.stringify(
          [main, ...visible].map((node) => {
            const b = node.getBoundingClientRect();
            const s = getComputedStyle(node);
            return [
              Math.round(b.x),
              Math.round(b.y),
              Math.round(b.width),
              Math.round(b.height),
              s.opacity,
              s.visibility,
              s.transform,
              node instanceof HTMLImageElement ? node.currentSrc : '',
            ];
          }),
        );
        if (!ready || signature !== previous) {
          stableSince = ready ? Date.now() : 0;
          previous = signature;
        } else if (stableSince && Date.now() - stableSince >= 1400) {
          await Promise.all(
            visible
              .filter((node) => node instanceof HTMLImageElement)
              .map((image) => image.decode()),
          );
          return;
        }
        await pause();
      }
      throw new Error(
        'The homepage did not finish loading and revealing its content. No screenshot was saved; retry after the preview is ready.',
      );
    },
    { timeoutMs },
  );
}
