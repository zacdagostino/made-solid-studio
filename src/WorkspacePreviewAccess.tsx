import { workspaceRouteQueryName } from './lib/studio-surface';

const legacyWorkspacePreviewPrefix = '#/workspace-preview-access';

export function workspacePreviewStudioRoute(hash = window.location.hash) {
  if (!hash.startsWith(legacyWorkspacePreviewPrefix)) return '/prospects';
  const query = new URLSearchParams(hash.slice(`${legacyWorkspacePreviewPrefix}?`.length));
  const value = query.get('return') ?? '/prospects';
  if (!value.startsWith('/') || value.startsWith('//') || value.length > 2_000) {
    return '/prospects';
  }
  try {
    const requested = new URL(value, 'https://studio.madesolid.com.au');
    if (requested.origin !== 'https://studio.madesolid.com.au') return '/prospects';
    return `${requested.pathname}${requested.search}${requested.hash}`;
  } catch {
    return '/prospects';
  }
}

export function legacyWorkspaceDevelopmentPath(hash = window.location.hash) {
  const route = `#${workspacePreviewStudioRoute(hash)}`;
  const query = new URLSearchParams({ [workspaceRouteQueryName]: route });
  return `/?${query.toString()}`;
}

export function restoreLegacyWorkspacePreviewRoute(location = window.location) {
  if (!location.hash.startsWith(legacyWorkspacePreviewPrefix)) return false;
  const returnPath = legacyWorkspaceDevelopmentPath(location.hash);
  const accessHash = `#/workspace-development-access?path=${encodeURIComponent(returnPath)}`;
  window.history.replaceState(null, '', `${location.pathname}${location.search}${accessHash}`);
  return true;
}
