'use client';

import { useEffect } from 'react';

const runtimeStyles = `
  .sf-runtime [data-sf-reveal] {
    opacity: 0;
    transform: translateY(1rem);
    transition:
      opacity 480ms ease,
      transform 560ms cubic-bezier(.2,.8,.2,1);
    transition-delay: var(--sf-motion-delay, 0ms);
  }
  .sf-runtime [data-sf-reveal].is-visible {
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
    transition: opacity 220ms ease-out;
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
      opacity 300ms ease,
      transform 520ms cubic-bezier(.2,.8,.2,1);
  }
  .sf-brand-intro__status {
    margin: 0;
    font: 600 .875rem/1.3 system-ui, sans-serif;
    opacity: 0;
    transform: translateY(.4rem);
    transition: opacity 240ms ease 120ms, transform 280ms ease 120ms;
  }
  .sf-brand-intro.is-entered .sf-brand-intro__mark,
  .sf-brand-intro.is-entered .sf-brand-intro__status {
    opacity: 1;
    transform: none;
  }
  .sf-brand-intro.is-leaving {
    opacity: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .sf-runtime [data-sf-reveal] {
      opacity: 1;
      transform: none;
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
    const progress = Math.min((now - start) / 700, 1);
    const formatted = (parts.value * progress).toLocaleString(undefined, {
      minimumFractionDigits: parts.fractionDigits,
      maximumFractionDigits: parts.fractionDigits,
    });
    element.textContent = `${parts.prefix}${formatted}${parts.suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function startReveals(reducedMotion: boolean) {
  const candidates = revealCandidates();
  candidates.forEach((candidate, index) => {
    candidate.dataset.sfReveal = 'true';
    candidate.style.setProperty('--sf-motion-delay', `${Math.min((index % 4) * 55, 165)}ms`);
  });
  const reveal = (element: HTMLElement) => {
    element.classList.add('is-visible');
    if (!reducedMotion) {
      element.querySelectorAll<HTMLElement>('[data-counter]').forEach(animateCounter);
    }
  };
  if (reducedMotion || !('IntersectionObserver' in window)) {
    candidates.forEach(reveal);
    return;
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
}

function runBrandIntroduction(reducedMotion: boolean) {
  const marked = document.querySelector<HTMLElement>('[data-siteforge-brand-logo]');
  const logo = marked?.matches('img') ? marked : marked?.querySelector<HTMLImageElement>('img');
  let seen = false;
  try {
    seen = sessionStorage.getItem('made-solid-brand-intro') === 'seen';
  } catch {
    seen = false;
  }
  if (
    reducedMotion ||
    !logo ||
    seen ||
    document.visibilityState === 'hidden' ||
    logo.getBoundingClientRect().width < 1
  ) {
    return false;
  }
  try {
    sessionStorage.setItem('made-solid-brand-intro', 'seen');
  } catch {
    // Sandboxed previews can deny storage; the short transition remains safe.
  }
  const overlay = document.createElement('div');
  const content = document.createElement('div');
  const mark = logo.cloneNode(true) as HTMLImageElement;
  const status = document.createElement('p');
  overlay.className = 'sf-brand-intro';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  content.className = 'sf-brand-intro__content';
  mark.className = 'sf-brand-intro__mark';
  mark.alt = '';
  mark.setAttribute('aria-hidden', 'true');
  status.className = 'sf-brand-intro__status';
  status.textContent = 'Preparing your site';
  content.append(mark, status);
  overlay.append(content);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-entered'));
  window.setTimeout(() => {
    overlay.classList.add('is-leaving');
    window.setTimeout(() => {
      overlay.remove();
      document.dispatchEvent(new Event('siteforge:brand-intro-complete'));
    }, 240);
  }, 900);
  return true;
}

export function SiteRuntime() {
  useEffect(() => {
    const reducedMotion = prefersReducedMotion();
    document.documentElement.classList.add('sf-runtime');
    const introRunning = runBrandIntroduction(reducedMotion);
    if (introRunning) {
      document.addEventListener(
        'siteforge:brand-intro-complete',
        () => startReveals(reducedMotion),
        { once: true },
      );
    } else {
      startReveals(reducedMotion);
    }
  }, []);

  return (
    <>
      <style data-siteforge-runtime-styles>{runtimeStyles}</style>
      <span data-siteforge-runtime="next-component-v2" hidden />
    </>
  );
}
