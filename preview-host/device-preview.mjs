const devicePresets = {
  phone: { label: 'Phone', width: 375, height: 812 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  desktop: { label: 'Desktop', width: 1440, height: 900 },
};

function exactOrigin(value) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.href !== `${parsed.origin}/` ||
      (parsed.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(parsed.hostname))
    ) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function privateCapabilityPath(pathname) {
  return /^\/(?:test|build|site|review)\/[0-9a-f-]{36}\/[a-f0-9]{64}(?:\/|$)/i.test(pathname);
}

function workspaceCapabilityPath(pathname) {
  return /^\/__made-solid\/workspace-frame\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\/|$)/.test(
    pathname,
  );
}

function brandedPreviewHostname(hostname, apex) {
  const escapedApex = apex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^preview\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.${escapedApex}$`).test(
    hostname,
  );
}

export function devicePreviewConfiguration(environment = process.env) {
  const inspectOrigin = exactOrigin(environment.INSPECT_PUBLIC_ORIGIN?.trim());
  const previewOrigin = exactOrigin(environment.PREVIEW_PUBLIC_ORIGIN?.trim());
  if (
    inspectOrigin &&
    previewOrigin &&
    inspectOrigin === previewOrigin &&
    !['127.0.0.1', 'localhost'].includes(new URL(inspectOrigin).hostname)
  ) {
    throw new Error('INSPECT_PUBLIC_ORIGIN must be separate from PREVIEW_PUBLIC_ORIGIN.');
  }
  const studioOrigins = [
    environment.SITEFORGE_PUBLIC_ORIGIN,
    environment.SITEFORGE_DEVELOPMENT_ORIGIN,
    ...(environment.SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS || '').split(','),
    environment.CLIENTSPACE_PUBLIC_ORIGIN,
    environment.CLIENTSPACE_HANDOFF_URL,
  ]
    .map((value) => {
      try {
        return value ? new URL(value).origin : undefined;
      } catch {
        return undefined;
      }
    })
    .filter(Boolean);
  return {
    brandedPreviewApex:
      environment.MADE_SOLID_BRANDED_PREVIEW_APEX?.trim().toLowerCase() || 'madesolid.com.au',
    inspectOrigin,
    previewOrigin,
    returnOrigins: [...new Set(studioOrigins)],
    reviewOrigins: [...new Set(studioOrigins.filter(Boolean))],
  };
}

export function isDevicePreviewRequest(requestUrl, requestHost, configuration) {
  if (requestUrl.pathname === '/inspect' || requestUrl.pathname === '/inspect/') return true;
  if (requestUrl.pathname !== '/' || !configuration.inspectOrigin) return false;
  try {
    return new URL(configuration.inspectOrigin).host === requestHost;
  } catch {
    return false;
  }
}

export function isDevicePreviewRelayRequest(requestUrl) {
  return requestUrl.pathname === '/inspect/live' || requestUrl.pathname === '/inspect/live/';
}

export function devicePreviewTarget(value, configuration) {
  if (typeof value !== 'string' || !value || value.length > 8_000) return undefined;
  try {
    const target = new URL(value);
    const localPreviewTarget =
      target.protocol === 'http:' &&
      configuration.previewOrigin === target.origin &&
      ['127.0.0.1', 'localhost'].includes(target.hostname);
    if (target.username || target.password || (target.protocol !== 'https:' && !localPreviewTarget))
      return undefined;
    const isPrivatePreview =
      configuration.previewOrigin &&
      target.origin === configuration.previewOrigin &&
      privateCapabilityPath(target.pathname);
    const isWorkspacePreview =
      configuration.previewOrigin &&
      target.origin === configuration.previewOrigin &&
      workspaceCapabilityPath(target.pathname);
    const isBrandedPreview =
      !target.port &&
      brandedPreviewHostname(target.hostname.toLowerCase(), configuration.brandedPreviewApex);
    if (!isPrivatePreview && !isWorkspacePreview && !isBrandedPreview) return undefined;
    if (isPrivatePreview) target.searchParams.set('__made_solid_inspect', '1');
    return {
      href: target.href,
      origin: target.origin,
      type: isWorkspacePreview ? 'working' : isBrandedPreview ? 'client' : 'saved',
    };
  } catch {
    return undefined;
  }
}

function safeReturnUrl(value, configuration) {
  if (typeof value !== 'string' || !value || value.length > 2_000) return undefined;
  try {
    const target = new URL(value);
    return configuration.returnOrigins.includes(target.origin) ? target.href : undefined;
  } catch {
    return undefined;
  }
}

function safeLabel(value, targetType) {
  const fallback =
    targetType === 'working'
      ? 'Live website source'
      : targetType === 'client'
        ? 'Client review website'
        : 'Generated website';
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : fallback;
}

function safeReviewConfigurationUrl(value, configuration) {
  if (typeof value !== 'string' || !value || value.length > 2_000) return undefined;
  try {
    const target = new URL(value);
    if (
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      !configuration.reviewOrigins.includes(target.origin) ||
      !/^\/api\/website-reviews\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{43}$/i.test(target.pathname)
    ) {
      return undefined;
    }
    return target;
  } catch {
    return undefined;
  }
}

function safeReviewImage(value) {
  if (typeof value !== 'string' || !value || value.length > 8_000) return undefined;
  try {
    const target = new URL(value);
    const local =
      target.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(target.hostname);
    if (target.username || target.password || (target.protocol !== 'https:' && !local)) {
      return undefined;
    }
    return target.href;
  } catch {
    return undefined;
  }
}

function safeReviewSite(value) {
  if (typeof value !== 'string' || !value || value.length > 8_000) return undefined;
  try {
    const target = new URL(value);
    const local =
      target.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(target.hostname);
    if (target.username || target.password || (target.protocol !== 'https:' && !local)) {
      return undefined;
    }
    return target.href;
  } catch {
    return undefined;
  }
}

function safeReviewContact(value) {
  if (!value || typeof value !== 'object') return undefined;
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  const subject = typeof value.subject === 'string' ? value.subject.trim() : '';
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !subject ||
    subject.length > 180 ||
    /[\r\n]/.test(subject)
  ) {
    return undefined;
  }
  return { email, subject };
}

export async function devicePreviewReview(requestUrl, configuration, fetchImplementation = fetch) {
  const reviewUrl = safeReviewConfigurationUrl(
    requestUrl.searchParams.get('review'),
    configuration,
  );
  if (!reviewUrl) return undefined;
  try {
    const response = await fetchImplementation(reviewUrl, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok || new URL(response.url || reviewUrl).origin !== reviewUrl.origin) {
      return undefined;
    }
    const payload = await response.json();
    if (
      !['made-solid-website-comparison-v2', 'made-solid-website-comparison-v3'].includes(
        payload?.contract,
      ) ||
      typeof payload.label !== 'string' ||
      payload.label.length > 100 ||
      payload.source !== requestUrl.searchParams.get('source')
    ) {
      return undefined;
    }
    const current = safeReviewSite(payload.current);
    if (!current) return undefined;
    const contact = safeReviewContact(payload.contact);
    if (payload.contract === 'made-solid-website-comparison-v3' && !contact) return undefined;
    const devices = {};
    for (const [device, preset] of Object.entries(devicePresets)) {
      const comparison = payload.comparisons?.[device];
      const currentEvidence = safeReviewImage(comparison?.current);
      const redesignEvidence = safeReviewImage(comparison?.redesign);
      if (
        !currentEvidence ||
        !redesignEvidence ||
        comparison.width !== preset.width ||
        comparison.height !== preset.height ||
        !Number.isInteger(comparison.currentHeight) ||
        comparison.currentHeight < preset.height ||
        comparison.currentHeight > 200_000 ||
        !Number.isInteger(comparison.redesignHeight) ||
        comparison.redesignHeight < preset.height ||
        comparison.redesignHeight > 200_000
      ) {
        return undefined;
      }
      devices[device] = {
        currentEvidence,
        currentHeight: comparison.currentHeight,
        redesignEvidence,
        redesignHeight: comparison.redesignHeight,
      };
    }
    return {
      contact,
      current,
      devices,
      frameOrigins: [...new Set([new URL(current).origin])],
      imageOrigins: [
        ...new Set(
          Object.values(devices).flatMap((comparison) => [
            new URL(comparison.currentEvidence).origin,
            new URL(comparison.redesignEvidence).origin,
          ]),
        ),
      ],
      label: payload.label,
    };
  } catch {
    return undefined;
  }
}

export function devicePreviewDocument(requestUrl, configuration, nonce, review) {
  const target = devicePreviewTarget(requestUrl.searchParams.get('source'), configuration);
  if (!target) return undefined;
  const requestedDevice = requestUrl.searchParams.get('device');
  const initialDevice = Object.hasOwn(devicePresets, requestedDevice) ? requestedDevice : 'desktop';
  const label = review?.label || safeLabel(requestUrl.searchParams.get('label'), target.type);
  const returnUrl = safeReturnUrl(requestUrl.searchParams.get('return'), configuration);
  const targetSource = JSON.stringify(target.href).replaceAll('<', '\\u003c');
  const initialDeviceSource = JSON.stringify(initialDevice);
  const presetsSource = JSON.stringify(devicePresets);
  const reviewSources = review
    ? Object.fromEntries(
        Object.keys(devicePresets).map((device) => {
          const current = new URL('/inspect/live', requestUrl.origin);
          current.searchParams.set('source', requestUrl.searchParams.get('source') || '');
          current.searchParams.set('review', requestUrl.searchParams.get('review') || '');
          current.searchParams.set('device', device);
          current.searchParams.set('side', 'current');
          const redesign = new URL(target.href);
          redesign.searchParams.set('__made_solid_compare', '1');
          redesign.searchParams.set('__made_solid_device', device);
          return [device, { current: current.href, redesign: redesign.href }];
        }),
      )
    : null;
  const reviewSourcesSource = JSON.stringify(reviewSources).replaceAll('<', '\\u003c');
  const requestedSite = requestUrl.searchParams.get('site');
  const initialSite = review && requestedSite === 'old' ? 'old' : 'new';
  const initialSiteSource = JSON.stringify(initialSite);
  const typeLabel = review
    ? 'Live website review · choose a version and device'
    : target.type === 'working'
      ? 'Live working source · changes may update'
      : target.type === 'client'
        ? 'Exact client preview · no feedback tools'
        : 'Saved private preview';
  const contactHref = review?.contact
    ? `mailto:${review.contact.email}?subject=${encodeURIComponent(review.contact.subject)}`
    : '';
  const responseBar = contactHref
    ? `<aside class="device-preview__response" aria-label="Contact Made Solid">
        <span><strong>Like the direction or have a question?</strong><small>Opens your email app. Reply to the original email to keep everything together.</small></span>
        <a class="device-preview__response-action" href="${escapeHtml(contactHref)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Email Zac</a>
      </aside>`
    : '';
  const backLink = returnUrl
    ? `<a class="device-preview__back" href="${escapeHtml(returnUrl)}">← Back</a>`
    : '<span class="device-preview__brand">Made Solid Inspect</span>';
  // This runtime-owned document cannot import the Studio React button primitives. Native controls
  // mirror their 44px target, focus, hover, active, pressed, disabled, and loading contracts.
  return `<!doctype html>
<html lang="en" data-device="${initialDevice}" data-site="${initialSite}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(label)} · Device preview</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --accent: #dfff00; --canvas: #090a09; --panel: #151714; --surface: #20221e; --line: #353831; --ink: #f8f9f3; --muted: #aeb2a6; }
      * { box-sizing: border-box; }
      html, body { width: 100%; min-width: 0; height: 100%; margin: 0; overflow: hidden; background: var(--canvas); color: var(--ink); }
      body { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
      body.has-response { grid-template-rows: auto minmax(0, 1fr) auto auto; }
      a, button { min-height: 44px; border-radius: 10px; font: inherit; font-weight: 760; }
      a { display: inline-flex; align-items: center; color: inherit; text-decoration: none; }
      button { border: 1px solid var(--line); padding: 0 13px; background: var(--surface); color: var(--ink); cursor: pointer; transition: border-color 140ms ease, background 140ms ease, color 140ms ease, transform 140ms ease; }
      button:hover, a:hover { background: #2b2e28; }
      button:active, a:active { transform: translateY(1px); }
      button:focus-visible, a:focus-visible, iframe:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent); color: #111; box-shadow: 0 5px 16px rgba(223,255,0,.12); }
      button:disabled { cursor: wait; opacity: .62; }
      .device-preview__toolbar { position: relative; z-index: 3; display: grid; grid-template-areas: "brand identity versions devices tools"; grid-template-columns: auto minmax(0, 1fr) auto auto auto; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
      .device-preview__identity { min-width: 0; display: grid; gap: 2px; }
      .device-preview__identity strong, .device-preview__identity span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .device-preview__identity strong { font-size: 15px; line-height: 1.25; }
      .device-preview__identity span, .device-preview__status { color: var(--muted); font-size: 12px; line-height: 1.35; }
      .device-preview__brand, .device-preview__back { grid-area: brand; padding-inline: 4px; white-space: nowrap; }
      .device-preview__brand { color: var(--muted); font-size: 11px; font-weight: 850; letter-spacing: .09em; text-transform: uppercase; }
      .device-preview__back { padding-inline: 10px; border: 1px solid transparent; }
      .device-preview__identity { grid-area: identity; }
      .device-preview__tools { grid-area: tools; }
      .device-preview__versions { grid-area: versions; }
      .device-preview__devices { grid-area: devices; }
      .device-preview__devices, .device-preview__versions { display: flex; align-items: center; gap: 3px; padding: 3px; border: 1px solid var(--line); border-radius: 13px; background: #0d0f0d; }
      .device-preview__versions[hidden] { display: none; }
      .device-preview__tools { display: flex; align-items: center; gap: 6px; }
      .device-preview__devices button { min-width: 78px; }
      .device-preview__versions button { min-width: 92px; }
      .device-preview__devices button, .device-preview__versions button { border-color: transparent; background: transparent; }
      .device-preview__devices button:hover, .device-preview__versions button:hover { background: #2b2e28; }
      .device-preview__devices button[aria-pressed="true"], .device-preview__versions button[aria-pressed="true"] { background: var(--accent); }
      .device-preview__tool-icon { display: none; width: 20px; height: 20px; }
      .device-preview__device-icon { width: 20px; height: 20px; display: none; }
      .device-preview__canvas { position: relative; min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 16px; background: var(--canvas); }
      .device-preview__stage { position: relative; margin: auto; transition: width 160ms ease, height 160ms ease; }
      .device-preview__viewport { position: absolute; top: 0; left: 0; overflow: hidden; border: 1px solid #62665d; border-radius: 12px; background: #fff; box-shadow: 0 22px 70px rgba(0,0,0,.56); transform-origin: top left; transition: width 160ms ease, height 160ms ease, transform 160ms ease; }
      .device-preview__viewport iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
      .device-preview__viewport iframe[hidden] { display: none; }
      .device-preview__review { position: absolute; z-index: 1; inset: 0; overflow: hidden; background: #fff; }
      .device-preview__review[hidden], .device-preview__review iframe[hidden] { display: none; }
      .device-preview__review iframe { position: absolute; inset: 0; }
      .device-preview__loading { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; background: #fff; color: #333; font-size: 14px; }
      .device-preview__loading[hidden] { display: none; }
      .device-preview__response { display: flex; align-items: center; justify-content: center; gap: 24px; min-width: 0; padding: 8px 16px; border-top: 1px solid var(--line); background: #0d0f0d; }
      .device-preview__response > span { display: grid; min-width: 0; gap: 2px; }
      .device-preview__response strong { font-size: 13px; line-height: 1.35; }
      .device-preview__response small { color: var(--muted); font-size: 11px; line-height: 1.35; }
      .device-preview__response-action { flex: 0 0 auto; gap: 8px; padding: 0 16px; border: 1px solid var(--accent); background: var(--accent); color: #111; box-shadow: 0 5px 16px rgba(223,255,0,.12); }
      .device-preview__response-action:hover { background: #edff66; }
      .device-preview__response-action svg { width: 17px; height: 17px; }
      .device-preview__footer { min-height: 56px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 14px; padding: 6px 16px max(6px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--panel); }
      .device-preview__footer p { margin: 0; color: var(--muted); font-size: 12px; }
      .device-preview__footer > .device-preview__tools { grid-area: auto; }
      .device-preview__footer strong { color: var(--ink); }
      .device-preview__zoom-label { min-width: 54px; text-align: center; color: var(--muted); font-size: 12px; font-weight: 800; }
      .device-preview__focus-exit { position: fixed; z-index: 20; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); display: none; min-width: 52px; border-color: #74776f; background: rgba(17,18,16,.92); box-shadow: 0 8px 28px rgba(0,0,0,.4); }
      body.is-focused { grid-template-rows: minmax(0, 1fr); }
      body.is-focused .device-preview__toolbar, body.is-focused .device-preview__response, body.is-focused .device-preview__footer { display: none; }
      body.is-focused .device-preview__canvas { padding: 0; background-image: none; }
      body.is-focused .device-preview__viewport { border: 0; border-radius: 0; box-shadow: none; }
      body.is-focused .device-preview__focus-exit { display: inline-flex; align-items: center; justify-content: center; }
      @media (max-width: 1100px) {
        .device-preview__toolbar { grid-template-areas: "identity tools" "versions devices"; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 8px; padding: 4px 8px 8px; }
        .device-preview__brand { display: none; }
        .device-preview__toolbar:has(.device-preview__back) { grid-template-areas: "brand identity tools" "versions versions devices"; grid-template-columns: auto minmax(0, 1fr) auto; }
        .device-preview__back { justify-self: start; padding-inline: 4px; font-size: 12px; }
        .device-preview__identity { min-height: 44px; align-content: center; }
        .device-preview__identity strong { font-size: 13px; }
        .device-preview__identity span { font-size: 10px; }
        .device-preview__devices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; }
        .device-preview__versions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; }
        .device-preview__devices button, .device-preview__versions button { width: 100%; min-width: 0; padding-inline: 6px; }
        .device-preview__devices button { width: 44px; display: grid; place-items: center; }
        .device-preview__device-icon { display: block; }
        .device-preview__device-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        .device-preview__versions button { font-size: 12px; }
        .device-preview__toolbar:has(.device-preview__versions[hidden]) .device-preview__devices { grid-column: 1 / -1; }
        .device-preview__toolbar:has(.device-preview__versions[hidden]) .device-preview__devices button { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .device-preview__toolbar:has(.device-preview__versions[hidden]) .device-preview__device-label { position: static; width: auto; height: auto; clip-path: none; font-size: 12px; }
        .device-preview__tools { justify-content: end; }
        .device-preview__toolbar > .device-preview__tools button { width: 44px; padding: 0; display: grid; place-items: center; }
        .device-preview__toolbar > .device-preview__tools .device-preview__tool-icon { display: block; }
        .device-preview__toolbar > .device-preview__tools .device-preview__tool-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        .device-preview__canvas { padding: 8px; }
        .device-preview__footer { grid-template-columns: minmax(0, 1fr) auto; gap: 4px 8px; padding-inline: 10px; }
        .device-preview__footer > .device-preview__status { grid-column: 1 / -1; min-height: 16px; }
      }
      @media (max-width: 600px) {
        .device-preview__response { justify-content: space-between; gap: 8px; padding: 4px 8px; }
        .device-preview__response strong { font-size: 12px; }
        .device-preview__response small { display: none; }
        .device-preview__response-action { padding-inline: 12px; }
        .device-preview__footer { grid-template-columns: minmax(0, 1fr); align-items: stretch; gap: 0; min-height: 52px; padding: 4px 8px max(4px, env(safe-area-inset-bottom)); }
        .device-preview__footer > p { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        .device-preview__footer > .device-preview__tools { grid-area: auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(44px, auto); width: 100%; }
        .device-preview__footer > .device-preview__tools button { width: 100%; padding-inline: 6px; }
        .device-preview__footer > .device-preview__status { grid-column: 1; }
        .device-preview__zoom-label { min-width: 44px; }
      }
      @media (max-width: 370px) {
        .device-preview__toolbar { gap: 6px 8px; padding-inline: 8px; }
        .device-preview__tools { gap: 4px; }
        .device-preview__identity span { font-size: 10px; }
        .device-preview__simulation-label { display: none; }
      }
      @media (prefers-reduced-motion: reduce) { button, .device-preview__stage, .device-preview__viewport { transition: none; } }
    </style>
  </head>
  <body${responseBar ? ' class="has-response"' : ''}>
    <header class="device-preview__toolbar" aria-label="Device preview controls">
      ${backLink}
      <div class="device-preview__identity">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(typeLabel)}</span>
      </div>
      <div class="device-preview__tools" aria-label="Preview tools">
        <button data-action="rotate" type="button" aria-label="Rotate selected viewport" title="Rotate viewport"><svg class="device-preview__tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="device-preview__tool-label">Rotate</span></button>
        <button data-action="reload" type="button" aria-label="Reload selected website" title="Reload website"><svg class="device-preview__tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.2-2.1L20 11M4 13l2.7 4.1A7 7 0 0 0 17.9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="device-preview__tool-label">Reload</span></button>
        <button data-action="focus" type="button" aria-label="Full screen preview" title="Full screen"><svg class="device-preview__tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="device-preview__tool-label">Full screen</span></button>
      </div>
      <div class="device-preview__versions" aria-label="Website version"${review ? '' : ' hidden'}>
        <button aria-pressed="${initialSite === 'old'}" data-site="old" type="button">Old site</button>
        <button aria-pressed="${initialSite === 'new'}" data-site="new" type="button">New site</button>
      </div>
      <div class="device-preview__devices" aria-label="Preview device">
        ${Object.entries(devicePresets)
          .map(
            ([id, preset]) =>
              `<button aria-pressed="${id === initialDevice}" data-device="${id}" type="button" title="${preset.label}"><svg class="device-preview__device-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${id === 'desktop' ? '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>' : id === 'tablet' ? '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>' : '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'}</svg><span class="device-preview__device-label">${preset.label}</span></button>`,
          )
          .join('')}
      </div>
    </header>
    <main class="device-preview__canvas" data-canvas aria-label="Device preview canvas" tabindex="0">
      <div class="device-preview__stage" data-stage>
        <div class="device-preview__viewport" data-viewport>
          <div class="device-preview__loading" data-loading role="status">Loading website preview…</div>
          <iframe aria-hidden="${review ? 'true' : 'false'}" data-preview-frame referrerpolicy="no-referrer" sandbox="allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation" src=${targetSource} tabindex="${review ? '-1' : '0'}" title="${escapeHtml(label)} preview"></iframe>
          <div class="device-preview__review" data-review hidden>
            <iframe aria-hidden="true" data-old-frame referrerpolicy="no-referrer" sandbox="allow-scripts" tabindex="-1" title="Old ${escapeHtml(label)} website"></iframe>
            <iframe aria-hidden="false" data-new-frame referrerpolicy="no-referrer" sandbox="allow-same-origin allow-scripts" title="New ${escapeHtml(label)} website"></iframe>
          </div>
        </div>
      </div>
    </main>
    ${responseBar}
    <button class="device-preview__focus-exit" data-action="exit-focus" type="button" aria-label="Exit full screen">Exit</button>
    <footer class="device-preview__footer">
      <p><strong data-dimensions></strong><span class="device-preview__simulation-label"> · responsive viewport simulation</span></p>
      <div class="device-preview__tools" aria-label="Preview zoom">
        <button data-zoom="fit" aria-pressed="true" type="button">Fit</button>
        <button data-zoom="0.5" aria-pressed="false" type="button">50%</button>
        <button data-zoom="1" aria-pressed="false" type="button">100%</button>
        <span class="device-preview__zoom-label" data-zoom-label aria-live="polite"></span>
      </div>
      <p class="device-preview__status" data-status aria-live="polite"></p>
    </footer>
    <script nonce="${nonce}">
      (() => {
        const presets = ${presetsSource};
        const reviewSources = ${reviewSourcesSource};
        const hasReview = ${review ? 'true' : 'false'};
        const canvas = document.querySelector('[data-canvas]');
        const stage = document.querySelector('[data-stage]');
        const viewport = document.querySelector('[data-viewport]');
        const frame = document.querySelector('[data-preview-frame]');
        const review = document.querySelector('[data-review]');
        const oldFrame = document.querySelector('[data-old-frame]');
        const newFrame = document.querySelector('[data-new-frame]');
        const loading = document.querySelector('[data-loading]');
        const dimensions = document.querySelector('[data-dimensions]');
        const status = document.querySelector('[data-status]');
        const zoomLabel = document.querySelector('[data-zoom-label]');
        const rotateButton = document.querySelector('[data-action="rotate"]');
        const reloadButton = document.querySelector('[data-action="reload"]');
        let device = ${initialDeviceSource};
        let site = ${initialSiteSource};
        let zoom = 'fit';
        let rotated = false;
        let frameLoaded = false;
        let reviewKey = '';
        let loadedSites = new Set();
        const size = () => {
          const preset = presets[device];
          return rotated
            ? { width: preset.height, height: preset.width, label: preset.label }
            : preset;
        };
        const scale = () => {
          if (zoom !== 'fit') return Number(zoom);
          const selected = size();
          return Math.min(
            1,
            Math.max(.1, (canvas.clientWidth - 24) / selected.width),
            Math.max(.1, (canvas.clientHeight - 24) / selected.height),
          );
        };
        const syncUrl = () => {
          const next = new URL(window.location.href);
          next.searchParams.set('device', device);
          next.searchParams.delete('mode');
          if (hasReview) next.searchParams.set('site', site);
          else next.searchParams.delete('site');
          window.history.replaceState(null, '', next);
        };
        const prepareReview = () => {
          if (!hasReview) return;
          const oldSource = reviewSources?.[device]?.current;
          const newSource = reviewSources?.[device]?.redesign;
          if (!oldSource || !newSource) return;
          const nextKey = device + ':' + oldSource + ':' + newSource;
          if (reviewKey === nextKey) return;
          reviewKey = nextKey;
          loadedSites = new Set();
          loading.textContent = 'Loading ' + (site === 'old' ? 'old' : 'new') + ' website…';
          loading.hidden = false;
          oldFrame.src = oldSource;
          newFrame.src = newSource;
        };
        const render = (announce = false) => {
          prepareReview();
          const selected = size();
          const selectedScale = scale();
          viewport.style.width = selected.width + 'px';
          viewport.style.height = selected.height + 'px';
          viewport.style.transform = 'scale(' + selectedScale + ')';
          stage.style.width = selected.width * selectedScale + 'px';
          stage.style.height = selected.height * selectedScale + 'px';
          dimensions.textContent = selected.label + ' · ' + selected.width + ' × ' + selected.height;
          zoomLabel.textContent = Math.round(selectedScale * 100) + '%';
          document.documentElement.dataset.device = device;
          document.documentElement.dataset.site = site;
          frame.hidden = hasReview;
          frame.setAttribute('aria-hidden', String(hasReview));
          frame.tabIndex = hasReview ? -1 : 0;
          review.hidden = !hasReview;
          oldFrame.hidden = !hasReview || site !== 'old';
          newFrame.hidden = !hasReview || site !== 'new';
          oldFrame.setAttribute('aria-hidden', String(!hasReview || site !== 'old'));
          newFrame.setAttribute('aria-hidden', String(!hasReview || site !== 'new'));
          oldFrame.tabIndex = hasReview && site === 'old' ? 0 : -1;
          newFrame.tabIndex = hasReview && site === 'new' ? 0 : -1;
          loading.hidden = hasReview ? loadedSites.has(site) : frameLoaded;
          loading.textContent = hasReview
            ? 'Loading ' + (site === 'old' ? 'old' : 'new') + ' website…'
            : 'Loading website preview…';
          rotateButton.disabled = false;
          reloadButton.disabled = false;
          document.querySelectorAll('button[data-device]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.device === device));
          });
          document.querySelectorAll('button[data-site]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.site === site));
          });
          document.querySelectorAll('[data-zoom]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.zoom === zoom));
          });
          if (announce) {
            const version = hasReview ? (site === 'old' ? 'Old site' : 'New site') + ' · ' : '';
            status.textContent = version + selected.label + ' selected at ' + Math.round(selectedScale * 100) + ' percent.';
          }
          syncUrl();
        };
        document.querySelectorAll('button[data-device]').forEach((button) => {
          button.addEventListener('click', () => {
            device = button.dataset.device;
            rotated = false;
            reviewKey = '';
            render(true);
          });
        });
        document.querySelectorAll('button[data-site]').forEach((button) => {
          button.addEventListener('click', () => {
            site = button.dataset.site;
            render(true);
          });
        });
        document.querySelectorAll('[data-zoom]').forEach((button) => {
          button.addEventListener('click', () => {
            zoom = button.dataset.zoom;
            render(true);
          });
        });
        rotateButton.addEventListener('click', () => {
          rotated = !rotated;
          render(true);
        });
        reloadButton.addEventListener('click', () => {
          if (hasReview) {
            const selectedFrame = site === 'old' ? oldFrame : newFrame;
            loadedSites.delete(site);
            loading.hidden = false;
            selectedFrame.src = selectedFrame.src;
            status.textContent = 'Reloading ' + (site === 'old' ? 'old' : 'new') + ' website.';
            return;
          }
          frameLoaded = false;
          loading.hidden = false;
          frame.src = frame.src;
          status.textContent = 'Reloading website preview.';
        });
        frame.addEventListener('load', () => {
          frameLoaded = true;
          if (!hasReview) {
            loading.hidden = true;
            status.textContent = 'Website preview loaded.';
          }
        });
        for (const [loadedSite, liveFrame] of [['old', oldFrame], ['new', newFrame]]) {
          liveFrame.addEventListener('load', () => {
            if (!hasReview || !liveFrame.src) return;
            loadedSites.add(loadedSite);
            if (loadedSite !== site) return;
            loading.hidden = true;
            status.textContent = (site === 'old' ? 'Old' : 'New') + ' website loaded and ready to use.';
          });
        }
        const exitFocus = async () => {
          document.body.classList.remove('is-focused');
          if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
          render();
          document.querySelector('[data-action="focus"]').focus();
        };
        document.querySelector('[data-action="focus"]').addEventListener('click', async () => {
          document.body.classList.add('is-focused');
          await document.documentElement.requestFullscreen?.().catch(() => undefined);
          render();
          document.querySelector('[data-action="exit-focus"]').focus();
        });
        document.querySelector('[data-action="exit-focus"]').addEventListener('click', () => {
          void exitFocus();
        });
        document.addEventListener('fullscreenchange', () => {
          if (!document.fullscreenElement && document.body.classList.contains('is-focused')) {
            document.body.classList.remove('is-focused');
            render();
          }
        });
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && document.body.classList.contains('is-focused')) {
            event.preventDefault();
            void exitFocus();
          }
        });
        new ResizeObserver(() => render()).observe(canvas);
        render();
      })();
    </script>
  </body>
</html>`;
}
