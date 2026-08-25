export type StudioSurface = 'production' | 'development';
export const workspaceRouteQueryName = '__made_solid_route';
const legacyDevelopmentHostname = 'workspace.madesolid.com.au';
const canonicalDevelopmentHostname = 'dev.studio.madesolid.com.au';

declare global {
  interface Window {
    __MADE_SOLID_STUDIO_SURFACE__?: StudioSurface;
  }
}

function configuredSurface() {
  const value = import.meta.env.VITE_SITEFORGE_SURFACE?.trim().toLowerCase();
  return value === 'development' || value === 'production' ? value : undefined;
}

export function studioSurface(hostname = window.location.hostname): StudioSurface {
  if (window.__MADE_SOLID_STUDIO_SURFACE__) return window.__MADE_SOLID_STUDIO_SURFACE__;
  const configured = configuredSurface();
  if (configured) return configured;
  const normalizedHostname = hostname.toLowerCase();
  return developmentStudioOrigins().some(
    (origin) => new URL(origin).hostname.toLowerCase() === normalizedHostname,
  )
    ? 'development'
    : 'production';
}

export function isDevelopmentStudio() {
  return studioSurface() === 'development';
}

function configuredWorkspaceOrigin() {
  const source =
    import.meta.env.VITE_SITEFORGE_DEVELOPMENT_ORIGIN?.trim() ||
    import.meta.env.VITE_SITEFORGE_WORKSPACE_ORIGIN?.trim() ||
    import.meta.env.VITE_SITEFORGE_WORKSPACE_PREVIEW_ORIGIN?.trim() ||
    'https://workspace.madesolid.com.au';
  try {
    const origin = new URL(source);
    if (origin.protocol !== 'https:' || origin.href !== `${origin.origin}/`) return undefined;
    return origin.origin;
  } catch {
    return undefined;
  }
}

export function developmentStudioOrigins() {
  const canonical = configuredWorkspaceOrigin() ?? `https://${legacyDevelopmentHostname}`;
  const compatibility = (import.meta.env.VITE_SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS || '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .flatMap((source: string) => {
      try {
        const parsed = new URL(source);
        return parsed.protocol === 'https:' && parsed.href === `${parsed.origin}/`
          ? [parsed.origin]
          : [];
      } catch {
        return [];
      }
    });
  return [
    ...new Set([
      canonical,
      ...compatibility,
      `https://${canonicalDevelopmentHostname}`,
      `https://${legacyDevelopmentHostname}`,
    ]),
  ];
}

export function developmentStudioUrl(hash: string) {
  const origin = developmentStudioOrigins()[0];
  const destination = new URL(origin);
  const route = hash.startsWith('#/') && !hash.startsWith('#//') ? hash : '#/prospects';
  destination.searchParams.set(workspaceRouteQueryName, route);
  destination.hash = route.slice(1);
  return destination.href;
}

function validWorkspaceRoute(value: string | null) {
  return value && value.startsWith('#/') && !value.startsWith('#//') && value.length <= 2_000
    ? value
    : undefined;
}

export function restoreWorkspaceRouteQuery(location = window.location) {
  if (studioSurface(location.hostname) !== 'development') return false;
  const url = new URL(location.href);
  const route = validWorkspaceRoute(url.searchParams.get(workspaceRouteQueryName));
  if (!route) return false;
  url.searchParams.delete(workspaceRouteQueryName);
  url.hash = route.slice(1);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}
