export type StudioSurface = 'production' | 'development';
export const workspaceRouteQueryName = '__made_solid_route';

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
  return hostname.toLowerCase() === 'workspace.madesolid.com.au' ? 'development' : 'production';
}

export function isDevelopmentStudio() {
  return studioSurface() === 'development';
}

function configuredWorkspaceOrigin() {
  const source =
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

export function developmentStudioUrl(hash: string) {
  const origin = configuredWorkspaceOrigin() ?? 'https://workspace.madesolid.com.au';
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
