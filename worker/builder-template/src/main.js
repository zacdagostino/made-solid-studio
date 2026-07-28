/* global IntersectionObserver, document, requestAnimationFrame, window */
'use strict';

(() => {
  const runtimeClass = 'sf-motion-runtime';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;
  const style = document.createElement('style');

  style.textContent = `
    .${runtimeClass} [data-sf-reveal] { opacity: 0; transform: translateY(18px); transition: opacity 480ms ease, transform 480ms ease; transition-delay: var(--sf-motion-delay, 0ms); }
    .${runtimeClass} [data-sf-reveal][data-sf-hero-media] { transform: translateY(18px) scale(0.96); transform-origin: center; transition: opacity 560ms ease, transform 700ms cubic-bezier(.2,.8,.2,1); }
    .${runtimeClass} [data-sf-reveal].is-visible { opacity: 1; transform: translateY(0); }
    .${runtimeClass} [data-sf-reveal][data-sf-hero-media].is-visible { transform: translateY(0) scale(1); }
    .${runtimeClass} [data-sf-title-word] { display: inline-block; opacity: 0; transform: translateY(0.5em); transition: opacity 420ms ease, transform 420ms ease; transition-delay: var(--sf-motion-delay, 0ms); }
    .${runtimeClass} [data-sf-reveal].is-visible [data-sf-title-word] { opacity: 1; transform: translateY(0); }
    .sf-brand-intro { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; pointer-events: none; color: CanvasText; background: Canvas; opacity: 1; transition: opacity 220ms ease-out; }
    .sf-brand-intro__content { display: grid; justify-items: center; gap: 0.8rem; padding: 1.25rem; text-align: center; }
    .sf-brand-intro__mark { display: block; width: min(13rem, 48vw); max-height: 7rem; object-fit: contain; opacity: 0; transform: translateY(0.7rem) scale(0.78); transform-origin: center; filter: drop-shadow(0 16px 34px rgb(0 0 0 / 0.2)); transition: transform 460ms cubic-bezier(.2,.85,.25,1), opacity 320ms ease-out; will-change: transform, opacity; }
    .sf-brand-intro__status { margin: 0; padding: 0.42rem 0.72rem; border: 1px solid rgb(127 127 127 / 0.3); border-radius: 999px; background: rgb(127 127 127 / 0.08); box-shadow: 0 10px 28px rgb(0 0 0 / 0.08); color: inherit; font: 600 clamp(0.78rem, 2.5vw, 0.92rem) / 1.25 system-ui, sans-serif; letter-spacing: 0.01em; opacity: 0; transform: translateY(0.45rem); transition: opacity 240ms ease-out 160ms, transform 280ms ease-out 160ms; }
    .sf-brand-intro.is-entered .sf-brand-intro__mark { opacity: 1; transform: translateY(-0.45rem) scale(0.92); }
    .sf-brand-intro.is-showcasing .sf-brand-intro__mark { transform: translateY(-0.9rem) scale(1.08); transition: transform 720ms cubic-bezier(.16,.84,.22,1); }
    .sf-brand-intro.is-entered .sf-brand-intro__status { opacity: 1; transform: translateY(0); }
    .sf-brand-intro[data-sf-intro-treatment="quiet"] .sf-brand-intro__mark { width: min(10rem, 38vw); filter: drop-shadow(0 8px 20px rgb(0 0 0 / 0.16)); }
    .sf-brand-intro.is-transitioning .sf-brand-intro__status { opacity: 0; transform: translateY(-0.45rem); transition-delay: 0ms; }
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

  function finishBrandIntro(overlay, logo, originalLogoOpacity) {
    logo.style.opacity = originalLogoOpacity;
    overlay.classList.add('is-leaving');
    window.setTimeout(() => {
      overlay.remove();
      document.dispatchEvent(new Event('siteforge:brand-intro-complete'));
    }, 240);
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
      return false;

    markBrandIntroSeen();
    const overlay = document.createElement('div');
    const mark = logo.cloneNode(true);
    const content = document.createElement('div');
    const status = document.createElement('p');
    const treatment = document.documentElement.dataset.siteforgeIntro || 'mark';
    overlay.className = 'sf-brand-intro';
    overlay.dataset.sfIntroTreatment = treatment;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    content.className = 'sf-brand-intro__content';
    mark.className = 'sf-brand-intro__mark';
    mark.removeAttribute('id');
    mark.setAttribute('alt', '');
    mark.setAttribute('aria-hidden', 'true');
    status.className = 'sf-brand-intro__status';
    status.textContent = 'Preparing your site';
    content.append(mark, status);
    const originalLogoOpacity = logo.style.opacity;
    logo.style.opacity = '0';
    overlay.append(content);
    document.body.append(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('is-entered');
      window.setTimeout(
        () => overlay.classList.add('is-showcasing'),
        treatment === 'quiet' ? 220 : 300,
      );
      window.setTimeout(
        () => {
          const target = logo.getBoundingClientRect();
          const markRect = mark.getBoundingClientRect();
          if (target.width < 1 || markRect.width < 1) {
            finishBrandIntro(overlay, logo, originalLogoOpacity);
            return;
          }
          const scale = Math.min(target.width / markRect.width, target.height / markRect.height);
          const translateX = target.left + target.width / 2 - (markRect.left + markRect.width / 2);
          const translateY = target.top + target.height / 2 - (markRect.top + markRect.height / 2);
          overlay.classList.add('is-transitioning');
          mark.style.transition =
            'transform 540ms cubic-bezier(.2,.82,.2,1), opacity 180ms ease-out';
          mark.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
          window.setTimeout(
            () => {
              finishBrandIntro(overlay, logo, originalLogoOpacity);
            },
            treatment === 'quiet' ? 400 : 640,
          );
        },
        treatment === 'quiet' ? 680 : 1_120,
      );
    });
    return true;
  }

  const brandIntroRunning = runBrandIntro();

  /*
   * Mobile navigation is deliberately generated per preview from the Markdown
   * feature contract. This runtime owns only the shared brand-introduction and
   * progressive content-motion capabilities.
   */
  /* function installResponsiveSidebar() {
    const header = document.querySelector('header');
    const sourceNavigation = header?.querySelector('nav');
    const sourceLinks = sourceNavigation ? [...sourceNavigation.querySelectorAll('a[href]')] : [];
    if (!header || !sourceNavigation || !sourceLinks.length) return;

    const markedLogo = header.querySelector('[data-siteforge-brand-logo]');
    const logoSlot = markedLogo?.closest('a, [class]') || markedLogo;
    let navigationBar = sourceNavigation.parentElement;
    while (
      logoSlot &&
      navigationBar &&
      navigationBar !== header &&
      !navigationBar.contains(logoSlot)
    ) {
      navigationBar = navigationBar.parentElement;
    }
    if (!navigationBar || (logoSlot && !navigationBar.contains(logoSlot))) navigationBar = header;

    const trigger = document.createElement('button');
    const sidebar = document.createElement('div');
    const backdrop = document.createElement('button');
    const panel = document.createElement('aside');
    const panelHeader = document.createElement('div');
    const close = document.createElement('button');
    const links = document.createElement('nav');
    let previousFocus;

    trigger.className = 'sf-sidebar-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-controls', 'siteforge-responsive-sidebar');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open navigation menu');
    const triggerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    triggerIcon.setAttribute('aria-hidden', 'true');
    triggerIcon.setAttribute('fill', 'none');
    triggerIcon.setAttribute('height', '20');
    triggerIcon.setAttribute('stroke', 'currentColor');
    triggerIcon.setAttribute('stroke-linecap', 'round');
    triggerIcon.setAttribute('stroke-width', '2');
    triggerIcon.setAttribute('viewBox', '0 0 24 24');
    triggerIcon.setAttribute('width', '20');
    [6, 12, 18].forEach((y) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', `M4 ${y}h16`);
      triggerIcon.append(line);
    });
    trigger.append(triggerIcon);
    sourceNavigation.dataset.siteforgeSidebarSource = 'true';
    navigationBar.insertBefore(
      trigger,
      logoSlot?.parentElement === navigationBar ? logoSlot : navigationBar.firstElementChild,
    );

    sidebar.className = 'sf-sidebar';
    sidebar.hidden = true;
    backdrop.className = 'sf-sidebar__backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close navigation menu');
    panel.className = 'sf-sidebar__panel';
    panel.id = 'siteforge-responsive-sidebar';
    panel.setAttribute('aria-label', 'Site navigation');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panelHeader.className = 'sf-sidebar__header';
    if (markedLogo) {
      const brand = document.createElement('div');
      const brandVisual = markedLogo.matches('img, svg')
        ? markedLogo
        : markedLogo.querySelector('img, svg') || logoSlot;
      if (brandVisual) {
        const logoClone = brandVisual.cloneNode(true);
        if (logoClone instanceof HTMLElement) {
          logoClone.removeAttribute('id');
          logoClone.removeAttribute('data-siteforge-brand-logo');
          logoClone.setAttribute('aria-hidden', 'true');
          logoClone.style.opacity = '';
          if (logoClone instanceof HTMLImageElement) logoClone.alt = '';
        }
        brand.className = 'sf-sidebar__brand';
        brand.append(logoClone);
        panelHeader.append(brand);
      }
    }
    close.className = 'sf-sidebar__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close navigation menu');
    close.textContent = '×';
    links.className = 'sf-sidebar__links';
    links.setAttribute('aria-label', 'Primary navigation');
    sourceLinks.forEach((sourceLink) => {
      const link = document.createElement('a');
      link.href = sourceLink.href;
      link.textContent = sourceLink.textContent?.trim() || sourceLink.href;
      if (sourceLink.getAttribute('aria-current')) {
        link.setAttribute('aria-current', sourceLink.getAttribute('aria-current'));
      }
      links.append(link);
    });
    panelHeader.append(close);
    panel.append(panelHeader, links);
    sidebar.append(backdrop, panel);
    document.body.append(sidebar);
    document.documentElement.classList.add('sf-sidebar-enabled');

    const usableColor = (value) =>
      Boolean(value) && value !== 'transparent' && !/^rgba\([^)]*,\s*0\)$/.test(value);
    const rootStyles = window.getComputedStyle(document.documentElement);
    const headerStyles = window.getComputedStyle(navigationBar);
    const bodyStyles = window.getComputedStyle(document.body);
    const linkStyles = window.getComputedStyle(sourceLinks[0]);
    const paletteValue = (names) =>
      names.map((name) => rootStyles.getPropertyValue(name).trim()).find(usableColor);
    const surface =
      [headerStyles.backgroundColor, bodyStyles.backgroundColor].find(usableColor) || 'Canvas';
    const ink =
      [linkStyles.color, headerStyles.color, bodyStyles.color].find(usableColor) || 'CanvasText';
    const accent =
      paletteValue([
        '--color-brand',
        '--color-primary',
        '--brand-primary',
        '--primary',
        '--accent',
      ]) ||
      linkStyles.color ||
      ink;
    const line =
      [headerStyles.borderBottomColor, headerStyles.borderColor].find(usableColor) || ink;
    [trigger, sidebar].forEach((element) => {
      element.style.setProperty('--sf-sidebar-surface', surface);
      element.style.setProperty('--sf-sidebar-ink', ink);
      element.style.setProperty('--sf-sidebar-accent', accent);
      element.style.setProperty('--sf-sidebar-line', line);
    });

    const focusableItems = () =>
      [...panel.querySelectorAll('button:not([disabled]), a[href]')].filter(
        (element) => element instanceof HTMLElement && !element.hidden,
      );
    const isOpen = () => !sidebar.hidden;
    const closeSidebar = ({ restoreFocus = true } = {}) => {
      if (!isOpen()) return;
      sidebar.classList.remove('is-open');
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      window.setTimeout(
        () => {
          sidebar.hidden = true;
          if (restoreFocus && previousFocus instanceof HTMLElement) previousFocus.focus();
          window.dispatchEvent(new Event('siteforge:sidebar-closed'));
        },
        reducedMotion ? 0 : 220,
      );
    };
    const openSidebar = () => {
      previousFocus = document.activeElement;
      const triggerBounds = trigger.getBoundingClientRect();
      sidebar.dataset.side =
        triggerBounds.left + triggerBounds.width / 2 <= window.innerWidth / 2 ? 'left' : 'right';
      sidebar.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-open');
      requestAnimationFrame(() => sidebar.classList.add('is-open'));
      window.setTimeout(() => close.focus(), reducedMotion ? 0 : 20);
    };

    trigger.addEventListener('click', openSidebar);
    close.addEventListener('click', () => closeSidebar());
    backdrop.addEventListener('click', () => closeSidebar());
    links.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) closeSidebar({ restoreFocus: false });
    });
    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) closeSidebar({ restoreFocus: false });
    });
  }

  installResponsiveSidebar();

  function installScrollResponsiveHeader() {
    const header = document.querySelector('header');
    if (!header || reducedMotion) return;

    header.classList.add('sf-scroll-header');
    let lastScrollY = Math.max(0, window.scrollY);
    let updateScheduled = false;
    const updateHeaderVisibility = () => {
      updateScheduled = false;
      const currentScrollY = Math.max(0, window.scrollY);
      const sidebarOpen = !document.querySelector('.sf-sidebar')?.hidden;
      const headerHeight = header.getBoundingClientRect().height;

      if (currentScrollY <= headerHeight || sidebarOpen || currentScrollY < lastScrollY) {
        header.classList.remove('is-hidden');
      } else if (currentScrollY > lastScrollY + 8) {
        header.classList.add('is-hidden');
      }
      lastScrollY = currentScrollY;
    };

    const scheduleHeaderVisibilityUpdate = () => {
      if (updateScheduled) return;
      updateScheduled = true;
      requestAnimationFrame(updateHeaderVisibility);
    };
    window.addEventListener('scroll', scheduleHeaderVisibilityUpdate, { passive: true });
    window.addEventListener('siteforge:sidebar-closed', scheduleHeaderVisibilityUpdate);
  }

  installScrollResponsiveHeader(); */

  function heroRevealCandidates() {
    const title = document.querySelector('main h1');
    if (!title) return [];
    const hero = title.closest('main > *') || title.parentElement;
    if (!hero) return [title];
    const copy = [title, ...[...hero.querySelectorAll('p')].slice(0, 2)];
    const media = [...hero.querySelectorAll('picture, img, video')]
      .filter((element) => element.tagName !== 'IMG' || !element.closest('picture'))
      .slice(0, 2);
    copy.forEach((element) => {
      element.dataset.sfHeroCopy = 'true';
    });
    media.forEach((element) => {
      element.dataset.sfHeroMedia = 'true';
    });
    return [...new Set([...copy, ...media])];
  }

  const heroCandidates = heroRevealCandidates();
  const heroContainer = document.querySelector('main h1')?.closest('main > *');
  const revealCandidates = [
    ...heroCandidates,
    ...document.querySelectorAll(
      'main > *, main section, main article, main .card, main [data-reveal]',
    ),
  ].filter(
    (element, index, all) =>
      all.indexOf(element) === index && !element.closest('dialog') && element !== heroContainer,
  );

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

  function startPageMotion() {
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
  }

  if (brandIntroRunning) {
    document.addEventListener('siteforge:brand-intro-complete', startPageMotion, { once: true });
  } else {
    startPageMotion();
  }
})();
