'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const runtimeStyles = `
  html.sf-route-transitioning main {
    opacity: 0;
  }
  html.sf-route-transitioning {
    scroll-behavior: auto !important;
  }
  html.sf-route-transitioning header:has([data-siteforge-brand-logo]) {
    top: 0 !important;
    opacity: 1 !important;
    visibility: visible !important;
    translate: none !important;
    transform: none !important;
    transition: none !important;
  }
  .sf-runtime [data-sf-reveal]:not([data-sf-reveal-variant="words"]):not([data-sf-reveal-variant="stagger"]):not([data-sf-reveal-variant="sequence"]) {
    opacity: 0;
    transform: translateY(2.25rem);
    transition:
      opacity 900ms cubic-bezier(.16,1,.3,1),
      transform 1100ms cubic-bezier(.16,1,.3,1);
    transition-delay: var(--sf-motion-delay, 0ms);
  }
  .sf-runtime [data-sf-reveal-variant="fade-left"] {
    transform: translateX(-2.25rem);
  }
  .sf-runtime [data-sf-reveal-variant="fade-right"] {
    transform: translateX(2.25rem);
  }
  .sf-runtime [data-sf-reveal-variant="scale"] {
    transform: translateY(1rem) scale(.92);
  }
  .sf-runtime [data-sf-reveal]:not([data-sf-reveal-variant="words"]):not([data-sf-reveal-variant="stagger"]):not([data-sf-reveal-variant="sequence"]).is-visible {
    opacity: 1;
    transform: none;
  }
  .sf-runtime .sf-reveal-word,
  .sf-runtime [data-sf-reveal-item] {
    opacity: 0;
    transform: translateY(1.15em);
    transition:
      opacity 800ms cubic-bezier(.16,1,.3,1),
      transform 1000ms cubic-bezier(.16,1,.3,1);
    transition-delay: calc(
      var(--sf-motion-delay, 0ms) + var(--sf-item-delay, 0ms)
    );
  }
  .sf-runtime [data-sf-reveal-variant="words"].is-visible .sf-reveal-word,
  .sf-runtime [data-sf-reveal-variant="stagger"].is-visible > [data-sf-reveal-item],
  .sf-runtime [data-sf-reveal-variant="sequence"].is-visible > [data-sf-reveal-item] {
    opacity: 1;
    transform: none;
  }
  .sf-runtime [data-sf-scroll-zoom] {
    transform: scale(.94);
    transform-origin: center;
    transition: transform 1200ms cubic-bezier(.16,1,.3,1);
    will-change: transform;
  }
  .sf-runtime [data-sf-scroll-zoom].is-sf-scroll-zoom-visible {
    transform: scale(1);
  }
  .sf-runtime [data-sf-scroll-zoom] > [data-sf-scroll-zoom-item] {
    transform: scale(1.055);
    transform-origin: center;
    transition: transform 1200ms cubic-bezier(.16,1,.3,1);
  }
  .sf-runtime [data-sf-scroll-zoom].is-sf-scroll-zoom-visible > [data-sf-scroll-zoom-item] {
    transform: scale(1);
  }
  .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion] {
    opacity: 0;
    transform: translateX(calc(var(--sf-navigation-direction, -1) * 100%));
    transition:
      opacity 680ms cubic-bezier(.16,1,.3,1),
      transform 920ms cubic-bezier(.16,1,.3,1);
  }
  .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion].is-sf-navigation-open {
    opacity: 1;
    transform: none;
  }
  .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion] [data-sf-navigation-item] {
    opacity: 0;
    transform: translateX(calc(var(--sf-navigation-direction, -1) * 1.5rem));
    transition:
      opacity 650ms cubic-bezier(.16,1,.3,1),
      transform 820ms cubic-bezier(.16,1,.3,1);
    transition-delay: var(--sf-navigation-item-delay, 0ms);
  }
  .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion].is-sf-navigation-open [data-sf-navigation-item] {
    opacity: 1;
    transform: none;
  }
  .sf-brand-intro {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: grid;
    place-items: center;
    pointer-events: none;
    color: CanvasText;
    background: Canvas;
    opacity: 1;
    transition: background-color 850ms cubic-bezier(.16,1,.3,1);
  }
  .sf-brand-intro__content {
    display: grid;
    justify-items: center;
    gap: .75rem;
    padding: 1.25rem;
  }
  .sf-brand-intro__mark {
    display: block;
    width: min(12rem, 44vw);
    max-height: 7rem;
    object-fit: contain;
    opacity: 0;
    transform: translateY(.65rem) scale(.84);
    transition:
      opacity 520ms cubic-bezier(.16,1,.3,1),
      transform 760ms cubic-bezier(.16,1,.3,1);
  }
  .sf-brand-intro__status {
    margin: 0;
    font: 600 .875rem/1.3 system-ui, sans-serif;
    opacity: 0;
    transform: translateY(.4rem);
    transition:
      opacity 460ms cubic-bezier(.16,1,.3,1) 180ms,
      transform 620ms cubic-bezier(.16,1,.3,1) 180ms;
  }
  .sf-brand-intro.is-entered .sf-brand-intro__mark,
  .sf-brand-intro.is-entered .sf-brand-intro__status {
    opacity: 1;
    transform: none;
  }
  .sf-brand-intro.is-handing-off {
    background-color: transparent;
  }
  .sf-brand-intro.is-handing-off .sf-brand-intro__status {
    opacity: 0;
    transform: translateY(-.5rem);
  }
  @media (prefers-reduced-motion: reduce) {
    .sf-runtime [data-sf-reveal],
    .sf-runtime .sf-reveal-word,
    .sf-runtime [data-sf-reveal-item],
    .sf-runtime [data-sf-scroll-zoom],
    .sf-runtime [data-sf-scroll-zoom] > [data-sf-scroll-zoom-item] {
      opacity: 1;
      transform: none;
      transition: none;
    }
    .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion],
    .sf-runtime [data-siteforge-navigation-dialog][data-sf-navigation-motion] [data-sf-navigation-item] {
      transition: none;
    }
  }
`;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealCandidates() {
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(
      'main > *, main section, main article, main [data-reveal]',
    ),
  ];
  return candidates.filter(
    (candidate, index) =>
      candidates.indexOf(candidate) === index && !candidate.closest('[role="dialog"]'),
  );
}

const revealVariants = new Set([
  'fade-up',
  'fade-left',
  'fade-right',
  'scale',
  'words',
  'stagger',
  'sequence',
]);

function prepareWordReveal(element: HTMLElement) {
  if (element.dataset.sfWordsPrepared) return;
  const accessibleText = element.textContent?.replace(/\s+/g, ' ').trim();
  if (!accessibleText) return;
  if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', accessibleText);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  let wordIndex = 0;
  textNodes.forEach((textNode) => {
    if (!textNode.textContent?.trim()) return;
    const fragment = document.createDocumentFragment();
    textNode.textContent.split(/(\s+)/).forEach((part) => {
      if (!part || /^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
        return;
      }
      const word = document.createElement('span');
      word.className = 'sf-reveal-word';
      word.setAttribute('aria-hidden', 'true');
      word.style.setProperty('--sf-item-delay', `${Math.min(wordIndex * 95, 950)}ms`);
      word.textContent = part;
      fragment.append(word);
      wordIndex += 1;
    });
    textNode.replaceWith(fragment);
  });
  element.dataset.sfWordsPrepared = 'true';
}

function prepareStaggerReveal(element: HTMLElement) {
  [...element.children].forEach((child, index) => {
    if (!(child instanceof HTMLElement) || child.matches('script, style')) return;
    child.dataset.sfRevealItem = 'true';
    child.style.setProperty('--sf-item-delay', `${Math.min(index * 150, 1_050)}ms`);
  });
}

function prepareSequenceReveal(element: HTMLElement) {
  [...element.children].forEach((child, index) => {
    if (!(child instanceof HTMLElement) || child.matches('script, style')) return;
    child.dataset.sfRevealItem = 'true';
    child.style.setProperty('--sf-item-delay', `${Math.min(index * 190, 1_140)}ms`);
  });
}

function counterParts(element: HTMLElement) {
  const display = element.textContent?.trim() ?? '';
  const match = /^([^\d-]*)(-?(?:\d[\d,]*)(?:\.\d+)?)(.*)$/.exec(display);
  const source = element.dataset.counter?.trim() || match?.[2];
  const value = Number(source?.replaceAll(',', ''));
  if (!Number.isFinite(value)) return undefined;
  return {
    value,
    fractionDigits: (source?.split('.')[1] ?? '').length,
    prefix: element.dataset.counterPrefix ?? match?.[1] ?? '',
    suffix: element.dataset.counterSuffix ?? match?.[3] ?? '',
  };
}

function animateCounter(element: HTMLElement) {
  if (element.dataset.sfCounterAnimated) return;
  const parts = counterParts(element);
  if (!parts) return;
  element.dataset.sfCounterAnimated = 'true';
  const start = performance.now();
  const update = (now: number) => {
    const progress = Math.min((now - start) / 1_500, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const formatted = (parts.value * easedProgress).toLocaleString(undefined, {
      minimumFractionDigits: parts.fractionDigits,
      maximumFractionDigits: parts.fractionDigits,
    });
    element.textContent = `${parts.prefix}${formatted}${parts.suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function startScrollZoom(reducedMotion: boolean) {
  const containers = [...document.querySelectorAll<HTMLElement>('[data-scroll-zoom]')];
  containers.forEach((container) => {
    container.dataset.sfScrollZoom = 'true';
    [...container.children].forEach((child) => {
      if (child instanceof HTMLElement && !child.matches('script, style')) {
        child.dataset.sfScrollZoomItem = 'true';
      }
    });
  });
  if (reducedMotion || !('IntersectionObserver' in window)) {
    containers.forEach((container) => container.classList.add('is-sf-scroll-zoom-visible'));
    return () => undefined;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-sf-scroll-zoom-visible', entry.isIntersecting);
      }),
    { threshold: 0.28, rootMargin: '-8% 0px -8% 0px' },
  );
  containers.forEach((container) => observer.observe(container));
  return () => observer.disconnect();
}

function startReveals(reducedMotion: boolean) {
  const candidates = revealCandidates();
  candidates.forEach((candidate, index) => {
    candidate.dataset.sfReveal = 'true';
    const requestedVariant = candidate.dataset.reveal?.trim().toLowerCase();
    const variant =
      requestedVariant && revealVariants.has(requestedVariant) ? requestedVariant : 'fade-up';
    candidate.dataset.sfRevealVariant = variant;
    candidate.style.setProperty('--sf-motion-delay', `${Math.min((index % 4) * 130, 390)}ms`);
    if (variant === 'words') prepareWordReveal(candidate);
    if (variant === 'stagger') prepareStaggerReveal(candidate);
    if (variant === 'sequence') prepareSequenceReveal(candidate);
  });
  const reveal = (element: HTMLElement) => {
    element.classList.add('is-visible');
    if (!reducedMotion) {
      if (element.matches('[data-counter]')) animateCounter(element);
      element.querySelectorAll<HTMLElement>('[data-counter]').forEach(animateCounter);
    }
  };
  if (reducedMotion || !('IntersectionObserver' in window)) {
    candidates.forEach(reveal);
    return startScrollZoom(reducedMotion);
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }),
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
  );
  candidates.forEach((candidate) => observer.observe(candidate));
  const stopScrollZoom = startScrollZoom(reducedMotion);
  return () => {
    observer.disconnect();
    stopScrollZoom();
  };
}

function startNavigationMotion() {
  let frame = 0;
  const prepare = (dialog: HTMLElement) => {
    if (dialog.dataset.sfNavigationPrepared) return;
    dialog.dataset.sfNavigationPrepared = 'true';
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    const trigger = document.querySelector<HTMLElement>('[data-siteforge-menu-trigger]');
    const open = trigger?.getAttribute('aria-expanded') === 'true';
    const dialogs = document.querySelectorAll<HTMLElement>(
      '[data-siteforge-navigation-dialog][data-sf-navigation-motion]',
    );
    dialogs.forEach(prepare);
    frame = requestAnimationFrame(() => {
      dialogs.forEach((dialog) => {
        const items = [...dialog.querySelectorAll<HTMLElement>('[data-sf-navigation-item]')];
        items.forEach((item, index) => {
          const delay = open
            ? 140 + Math.min(index * 85, 595)
            : Math.min((items.length - index - 1) * 45, 270);
          item.style.setProperty('--sf-navigation-item-delay', `${delay}ms`);
        });
        dialog.classList.toggle('is-sf-navigation-open', open);
      });
    });
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-expanded', 'data-state', 'open'],
    childList: true,
    subtree: true,
  });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

function runRouteBrandTransition(reducedMotion: boolean, onComplete: () => void) {
  const marked = document.querySelector<HTMLElement>('[data-siteforge-brand-logo]');
  const logo = marked?.matches('img') ? marked : marked?.querySelector<HTMLImageElement>('img');
  if (
    reducedMotion ||
    !logo ||
    document.visibilityState === 'hidden' ||
    logo.getBoundingClientRect().width < 1
  ) {
    onComplete();
    return () => undefined;
  }
  const overlay = document.createElement('div');
  const content = document.createElement('div');
  const mark = logo.cloneNode(true) as HTMLImageElement;
  const status = document.createElement('p');
  const previousLogoOpacity = logo.style.opacity;
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  let entryFrame = 0;
  let handoffTimer = 0;
  let handoffAnimation: Animation | undefined;
  let complete = false;
  overlay.className = 'sf-brand-intro';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.dataset.siteforgeRouteTransition = 'true';
  content.className = 'sf-brand-intro__content';
  mark.className = 'sf-brand-intro__mark';
  mark.alt = '';
  mark.setAttribute('aria-hidden', 'true');
  status.className = 'sf-brand-intro__status';
  status.textContent = 'Preparing your site';
  content.append(mark, status);
  overlay.append(content);
  logo.style.opacity = '0';
  document.documentElement.classList.add('sf-route-transitioning');
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  window.dispatchEvent(new Event('scroll'));
  document.body.append(overlay);
  const restoreRouteState = () => {
    if (previousScrollBehavior) {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    } else {
      document.documentElement.style.removeProperty('scroll-behavior');
    }
  };
  const finish = () => {
    if (complete) return;
    complete = true;
    overlay.remove();
    if (previousLogoOpacity) logo.style.opacity = previousLogoOpacity;
    else logo.style.removeProperty('opacity');
    document.dispatchEvent(new Event('siteforge:route-transition-complete'));
    onComplete();
    document.documentElement.classList.remove('sf-route-transitioning');
    restoreRouteState();
  };
  entryFrame = requestAnimationFrame(() => overlay.classList.add('is-entered'));
  handoffTimer = window.setTimeout(async () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.dispatchEvent(new Event('scroll'));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const from = mark.getBoundingClientRect();
    const to = logo.getBoundingClientRect();
    if (from.width < 1 || from.height < 1 || to.width < 1 || to.height < 1) {
      finish();
      return;
    }
    mark.style.position = 'fixed';
    mark.style.inset = 'auto';
    mark.style.left = `${from.left}px`;
    mark.style.top = `${from.top}px`;
    mark.style.width = `${from.width}px`;
    mark.style.height = `${from.height}px`;
    mark.style.maxHeight = 'none';
    mark.style.transformOrigin = 'top left';
    overlay.classList.add('is-handing-off');
    handoffAnimation = mark.animate(
      [
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        {
          opacity: 1,
          transform: `translate3d(${to.left - from.left}px, ${to.top - from.top}px, 0) scale(${to.width / from.width}, ${to.height / from.height})`,
        },
      ],
      {
        duration: 950,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'forwards',
      },
    );
    await handoffAnimation.finished.catch(() => undefined);
    finish();
  }, 1_150);
  return () => {
    cancelAnimationFrame(entryFrame);
    window.clearTimeout(handoffTimer);
    handoffAnimation?.cancel();
    if (complete) return;
    complete = true;
    overlay.remove();
    if (previousLogoOpacity) logo.style.opacity = previousLogoOpacity;
    else logo.style.removeProperty('opacity');
    document.documentElement.classList.remove('sf-route-transitioning');
    restoreRouteState();
  };
}

export function SiteRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add('sf-runtime');
    const stopNavigationMotion = startNavigationMotion();
    return stopNavigationMotion;
  }, []);

  useLayoutEffect(() => {
    const reducedMotion = prefersReducedMotion();
    let stopReveals: () => void = () => undefined;
    const stopTransition = runRouteBrandTransition(reducedMotion, () => {
      stopReveals = startReveals(reducedMotion);
    });
    return () => {
      stopTransition();
      stopReveals();
    };
  }, [pathname]);

  return (
    <>
      <style data-siteforge-runtime-styles>{runtimeStyles}</style>
      <span data-siteforge-runtime="next-component-v2" hidden />
    </>
  );
}
