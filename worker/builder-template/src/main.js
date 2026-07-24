/* global IntersectionObserver, document, requestAnimationFrame, window */
'use strict';

(() => {
  const runtimeClass = 'sf-motion-runtime';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;
  const style = document.createElement('style');

  style.textContent = `
    .${runtimeClass} [data-sf-reveal] { opacity: 0; transform: translateY(18px); transition: opacity 480ms ease, transform 480ms ease; transition-delay: var(--sf-motion-delay, 0ms); }
    .${runtimeClass} [data-sf-reveal].is-visible { opacity: 1; transform: translateY(0); }
    .${runtimeClass} [data-sf-title-word] { display: inline-block; opacity: 0; transform: translateY(0.5em); transition: opacity 420ms ease, transform 420ms ease; transition-delay: var(--sf-motion-delay, 0ms); }
    .${runtimeClass} [data-sf-reveal].is-visible [data-sf-title-word] { opacity: 1; transform: translateY(0); }
    .sf-brand-intro { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; pointer-events: none; background: var(--sf-intro-surface, Canvas); opacity: 1; transition: opacity 180ms ease-out; }
    .sf-brand-intro__mark { display: block; width: min(13rem, 48vw); max-height: 7rem; object-fit: contain; transform-origin: center; filter: drop-shadow(0 12px 30px rgb(0 0 0 / 0.12)); }
    .sf-brand-intro[data-sf-intro-treatment="quiet"] .sf-brand-intro__mark { width: min(10rem, 38vw); filter: none; }
    .sf-brand-intro.is-leaving { opacity: 0; }
    @media (prefers-reduced-motion: reduce) { .${runtimeClass} [data-sf-reveal], .${runtimeClass} [data-sf-title-word] { opacity: 1; transform: none; transition: none; } }
  `;
  document.head.append(style);
  document.documentElement.classList.add(runtimeClass);

  function brandLogoTarget() {
    const marked = document.querySelector('[data-siteforge-brand-logo]');
    if (!marked) return undefined;
    return marked.matches('img') ? marked : marked.querySelector('img');
  }

  function hasSeenBrandIntro() {
    try {
      return window.sessionStorage.getItem('siteforge-brand-intro') === 'seen';
    } catch {
      return false;
    }
  }

  function markBrandIntroSeen() {
    try {
      window.sessionStorage.setItem('siteforge-brand-intro', 'seen');
    } catch {
      // Sandboxed private previews can deny storage. The short intro remains safe.
    }
  }

  function runBrandIntro() {
    const logo = brandLogoTarget();
    if (
      reducedMotion ||
      !logo ||
      hasSeenBrandIntro() ||
      document.visibilityState === 'hidden' ||
      logo.getBoundingClientRect().width < 1
    )
      return;

    markBrandIntroSeen();
    const target = logo.getBoundingClientRect();
    const overlay = document.createElement('div');
    const mark = logo.cloneNode(true);
    const treatment = document.documentElement.dataset.siteforgeIntro || 'mark';
    overlay.className = 'sf-brand-intro';
    overlay.dataset.sfIntroTreatment = treatment;
    overlay.setAttribute('aria-hidden', 'true');
    mark.className = 'sf-brand-intro__mark';
    mark.removeAttribute('id');
    logo.style.opacity = '0';
    overlay.append(mark);
    document.body.append(overlay);

    requestAnimationFrame(() => {
      const markRect = mark.getBoundingClientRect();
      const scale = Math.min(target.width / markRect.width, target.height / markRect.height);
      const translateX = target.left + target.width / 2 - (markRect.left + markRect.width / 2);
      const translateY = target.top + target.height / 2 - (markRect.top + markRect.height / 2);
      mark.style.transition = 'transform 520ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease-out';
      mark.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      window.setTimeout(() => {
        logo.style.opacity = '';
        overlay.classList.add('is-leaving');
        window.setTimeout(() => overlay.remove(), 220);
      }, 560);
    });
  }

  runBrandIntro();

  const revealCandidates = [
    ...document.querySelectorAll(
      'main > *, main section, main article, main .card, main [data-reveal]',
    ),
  ].filter((element, index, all) => all.indexOf(element) === index && !element.closest('dialog'));

  function wordifyTitle(title) {
    if (title.dataset.sfTitleReady || title.children.length || !title.textContent?.trim()) return;
    const words = title.textContent.trim().split(/\s+/);
    if (words.length > 12) return;
    title.dataset.sfTitleReady = 'true';
    title.replaceChildren(
      ...words.flatMap((word, index) => {
        const span = document.createElement('span');
        span.dataset.sfTitleWord = 'true';
        span.style.setProperty('--sf-motion-delay', `${Math.min(index * 42, 320)}ms`);
        span.textContent = word;
        return index === words.length - 1 ? [span] : [span, document.createTextNode(' ')];
      }),
    );
  }

  function counterDetails(element) {
    const displayed = element.textContent?.trim() ?? '';
    const match = /^\s*([^\d-]*)(-?(?:\d[\d,]*)(?:\.\d+)?)(.*)\s*$/.exec(displayed);
    const sourceValue = element.dataset.counter?.trim() || match?.[2];
    const value = Number(sourceValue?.replaceAll(',', ''));
    if (!Number.isFinite(value)) return undefined;
    const fractionDigits = (sourceValue?.split('.')[1] ?? '').length;
    return {
      value,
      fractionDigits,
      prefix: element.dataset.counterPrefix ?? match?.[1] ?? '',
      suffix: element.dataset.counterSuffix ?? match?.[3] ?? '',
    };
  }

  function animateCounter(element) {
    if (element.dataset.sfCounterAnimated) return;
    const details = counterDetails(element);
    if (!details) return;
    element.dataset.sfCounterAnimated = 'true';
    const duration = 700;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = details.value * progress;
      const formatted = current.toLocaleString(undefined, {
        minimumFractionDigits: details.fractionDigits,
        maximumFractionDigits: details.fractionDigits,
      });
      element.textContent = `${details.prefix}${formatted}${details.suffix}`;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  revealCandidates.forEach((element, index) => {
    element.dataset.sfReveal = 'true';
    element.style.setProperty('--sf-motion-delay', `${Math.min((index % 5) * 55, 220)}ms`);
    element.querySelectorAll('h1, h2').forEach(wordifyTitle);
  });

  const reveal = (element) => {
    element.classList.add('is-visible');
    if (!reducedMotion) element.querySelectorAll('[data-counter]').forEach(animateCounter);
  };

  if (reducedMotion || !supportsObserver) {
    revealCandidates.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }),
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  );
  revealCandidates.forEach((element) => observer.observe(element));
})();
